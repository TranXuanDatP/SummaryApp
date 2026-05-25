import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IEventHandler } from '@nestjs/cqrs';
import { EventsHandler } from 'src/libs/shared/cqrs';
import { CommentCreatedEvent } from '@modules/comment/domain/events';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
  EMAIL_SERVICE_TOKEN,
} from '../../constants/tokens';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import type { INotificationRepository } from '../../domain/repositories';
import type { INotificationReadDao } from '../../application/queries/ports';
import type { IWorkLogReadDao } from '@modules/work-log/application/queries/ports';
import type { IUserReadDao } from '@modules/user/application/queries/ports';
import type { IEmailService } from '../../domain/services';
import { Notification } from '../../domain/entities';
import { NotificationType } from '../../domain/value-objects';

const NOTIFICATION_TITLE_PREFIX = ' đã nhận xét về công việc của bạn';
const NOTIFICATION_CONTENT_PREFIX = ' đã nhận xét về công việc ngày ';
const MAX_TITLE_LENGTH = 300;
const MAX_CONTENT_LENGTH = 2000;

@EventsHandler(CommentCreatedEvent)
@Injectable()
export class OnCommentCreatedHandler implements IEventHandler<CommentCreatedEvent> {
  private readonly logger = new Logger(OnCommentCreatedHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly notificationReadDao: INotificationReadDao,
    @Inject(EMAIL_SERVICE_TOKEN)
    private readonly emailService: IEmailService,
  ) {}

  async handle(event: CommentCreatedEvent): Promise<void> {
    try {
      const { workLogId, authorId, content: commentContent } = event.data;

      const workLog = await this.workLogReadDao.findById(workLogId);
      if (!workLog) {
        this.logger.error(
          `WorkLog not found: ${workLogId}, skipping notification`,
        );
        return;
      }

      const manager = await this.userReadDao.findById(authorId);
      if (!manager || !manager.isActive) {
        this.logger.error(
          `Manager not found or inactive: ${authorId}, skipping notification`,
        );
        return;
      }

      const employee = await this.userReadDao.findById(workLog.employeeId);
      if (!employee || !employee.isActive) {
        this.logger.error(
          `Employee not found or inactive: ${workLog.employeeId}, skipping notification`,
        );
        return;
      }

      if (employee.id === authorId) {
        this.logger.debug(
          `Employee commented on own WorkLog, skipping notification`,
        );
        return;
      }

      const managerName = manager.fullName;
      const workLogDate = workLog.executionDate;

      const title =
        `${managerName}${NOTIFICATION_TITLE_PREFIX}`.length > MAX_TITLE_LENGTH
          ? `${managerName.substring(0, MAX_TITLE_LENGTH - NOTIFICATION_TITLE_PREFIX.length - 3)}...${NOTIFICATION_TITLE_PREFIX}`
          : `${managerName}${NOTIFICATION_TITLE_PREFIX}`;

      const contentPrefix = `${managerName}${NOTIFICATION_CONTENT_PREFIX}${workLogDate}: "`;
      const contentSuffix = '"';
      const maxSnippet =
        MAX_CONTENT_LENGTH - contentPrefix.length - contentSuffix.length;
      const snippet =
        commentContent.length > maxSnippet
          ? commentContent.substring(0, maxSnippet) + '...'
          : commentContent;
      const content = `${contentPrefix}${snippet}${contentSuffix}`;

      const inAppPref =
        await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
          employee.id,
          'comment_received',
          'in_app',
        );
      const shouldSendInApp = inAppPref ? inAppPref.enabled : true;

      if (shouldSendInApp) {
        const notification = Notification.create(randomUUID(), {
          userId: employee.id,
          type: new NotificationType('comment_received'),
          title,
          content,
          actionLink: `/work-logs/${workLogId}`,
          isRead: false,
        });

        await this.notificationRepository.save(notification);
        this.logger.log(
          `Notification created for employee ${employee.id} on WorkLog ${workLogId}`,
        );
      }

      const emailPref =
        await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
          employee.id,
          'comment_received',
          'email',
        );
      const shouldSendEmail = emailPref ? emailPref.enabled : true;

      if (shouldSendEmail) {
        if (!employee.email || !employee.email.trim()) {
          this.logger.warn(
            `Employee ${employee.id} has no email, skipping email notification`,
          );
        } else {
          const subject = title;
          const body = content;
          await this.emailService.send(employee.email, subject, body);
          this.logger.log(
            `Email sent to ${employee.email} for comment notification`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling CommentCreatedEvent: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
