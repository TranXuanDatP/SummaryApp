import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import { PROJECT_READ_DAO_TOKEN } from '@modules/project/constants/tokens';
import { BUSINESS_DAY_CALCULATOR_TOKEN } from '@modules/work-log/constants/tokens';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
  EMAIL_SERVICE_TOKEN,
} from '../../constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';
import type { IProjectReadDao } from '@modules/project/application/queries/ports';
import type { IBusinessDayCalculator } from '@modules/work-log/domain/services';
import type { INotificationRepository } from '../../domain/repositories';
import type { INotificationReadDao } from '../../application/queries/ports';
import type { IEmailService } from '../../domain/services';
import { Notification } from '../../domain/entities';
import { NotificationType } from '../../domain/value-objects';

function truncateNameList(names: string[], maxChars: number): string {
  let result = '';
  let i = 0;
  for (; i < names.length; i++) {
    const addition = (i === 0 ? '' : ', ') + names[i];
    if (result.length + addition.length > maxChars) break;
    result += addition;
  }
  if (i < names.length) {
    result += ` và ${names.length - i} khác`;
  }
  return result;
}

@Injectable()
export class MonthlyReportReminderScheduler {
  private readonly logger = new Logger(MonthlyReportReminderScheduler.name);

  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly notificationReadDao: INotificationReadDao,
    @Inject(EMAIL_SERVICE_TOKEN)
    private readonly emailService: IEmailService,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  @Cron('0 9 * * 1-5')
  async handleMonthlyReportReminder(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!this.calculator.isBusinessDay(today)) return;
      if (!this.isFirstBusinessDayOfMonth(today)) return;

      const month = String(today.getMonth() + 1).padStart(2, '0');
      const managers = await this.userReadDao.findAllActiveByRole('manager');
      this.logger.log(
        `Monthly report reminder: first biz day of month, notifying ${managers.length} managers`,
      );

      for (const manager of managers) {
        try {
          await this.notifyManagerMonthlyReport(manager, month, today);
        } catch (error) {
          this.logger.error(
            `Error notifying manager ${manager.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in monthly report reminder: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  @Cron('0 11 * * 1-5')
  async handleProjectNoTasks(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!this.calculator.isBusinessDay(today)) return;

      const projects =
        await this.projectReadDao.findProjectsWithNoWorkLogsOlderThan(2);
      if (projects.length === 0) {
        this.logger.debug('No projects without tasks found');
        return;
      }

      const managers = await this.userReadDao.findAllActiveByRole('manager');
      this.logger.log(
        `Found ${projects.length} projects with no tasks, notifying ${managers.length} managers`,
      );

      for (const manager of managers) {
        try {
          await this.notifyManagerAllProjectsWithNoTasks(
            manager,
            projects,
            today,
          );
        } catch (error) {
          this.logger.error(
            `Error notifying manager ${manager.id} about projects with no tasks: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in project no tasks scheduler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private isFirstBusinessDayOfMonth(today: Date): boolean {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0);
    const current = new Date(firstDay);
    let iterations = 0;
    while (!this.calculator.isBusinessDay(current) && iterations < 10) {
      current.setDate(current.getDate() + 1);
      iterations++;
    }
    return current.getTime() === today.getTime();
  }

  private async notifyManagerMonthlyReport(
    manager: { id: string; email?: string; role: string },
    month: string,
    today: Date,
  ): Promise<void> {
    if (manager.role !== 'manager') return;

    const alreadyNotified =
      await this.notificationReadDao.existsByUserIdAndTypeAndDate(
        manager.id,
        'monthly_report_ready',
        today,
      );
    if (alreadyNotified) return;

    const title = `Báo cáo tháng ${month} đã sẵn sàng. Xem và nhận xét ngay.`;
    const content = title;

    const notification = Notification.create(randomUUID(), {
      userId: manager.id,
      type: new NotificationType('monthly_report_ready'),
      title,
      content,
      actionLink: '/reports/monthly',
      isRead: false,
    });
    await this.notificationRepository.save(notification);
    this.logger.log(
      `Monthly report notification created for manager ${manager.id}`,
    );

    const emailPref =
      await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
        manager.id,
        'monthly_report_ready',
        'email',
      );
    const shouldSendEmail = emailPref ? emailPref.enabled : true;

    if (shouldSendEmail) {
      if (!manager.email || !manager.email.trim()) {
        this.logger.warn(
          `Manager ${manager.id} has no email, skipping monthly report email`,
        );
      } else {
        await this.emailService.send(manager.email, title, content);
        this.logger.log(`Monthly report email sent to ${manager.email}`);
      }
    }
  }

  private async notifyManagerAllProjectsWithNoTasks(
    manager: { id: string; email?: string; role: string },
    projects: { id: string; name: string }[],
    today: Date,
  ): Promise<void> {
    if (manager.role !== 'manager') return;

    const alreadyNotified =
      await this.notificationReadDao.existsByUserIdAndTypeAndDate(
        manager.id,
        'project_no_tasks',
        today,
      );
    if (alreadyNotified) return;

    const projectNames = projects.map((p) => p.name);
    const displayNames = truncateNameList(projectNames, 200);
    const title =
      projects.length === 1
        ? `Dự án ${projects[0].name} chưa có task nào. Thêm task và gán nhân viên.`
        : `${projects.length} dự án chưa có task nào: ${displayNames}. Thêm task và gán nhân viên.`;
    const actionLink =
      projects.length === 1 ? `/projects/${projects[0].id}` : '/projects';

    const notification = Notification.create(randomUUID(), {
      userId: manager.id,
      type: new NotificationType('project_no_tasks'),
      title,
      content: title,
      actionLink,
      isRead: false,
    });
    await this.notificationRepository.save(notification);
    this.logger.log(
      `Project no tasks notification created for manager ${manager.id} — ${projects.length} project(s)`,
    );
  }
}
