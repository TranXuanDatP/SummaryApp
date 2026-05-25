import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import { BUSINESS_DAY_CALCULATOR_TOKEN } from '@modules/work-log/constants/tokens';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
  EMAIL_SERVICE_TOKEN,
} from '../../constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';
import type { IWorkLogReadDao } from '@modules/work-log/application/queries/ports';
import type { IBusinessDayCalculator } from '@modules/work-log/domain/services';
import type { INotificationRepository } from '../../domain/repositories';
import type { INotificationReadDao } from '../../application/queries/ports';
import type { IEmailService } from '../../domain/services';
import { Notification } from '../../domain/entities';
import { NotificationType } from '../../domain/value-objects';

@Injectable()
export class DailyReminderScheduler {
  private readonly logger = new Logger(DailyReminderScheduler.name);

  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly notificationReadDao: INotificationReadDao,
    @Inject(EMAIL_SERVICE_TOKEN)
    private readonly emailService: IEmailService,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  @Cron('30 17 * * 1-5')
  async handleDailyReminder(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!this.calculator.isBusinessDay(today)) {
        this.logger.debug(
          'Today is not a business day (holiday), skipping daily reminder',
        );
        return;
      }

      const employees = await this.userReadDao.findAllActiveByRole('employee');
      this.logger.log(
        `Found ${employees.length} active employees for daily reminder check`,
      );

      for (const employee of employees) {
        try {
          await this.processEmployee(employee, today);
        } catch (error) {
          this.logger.error(
            `Error processing daily reminder for employee ${employee.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in daily reminder scheduler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async processEmployee(
    employee: { id: string; email?: string },
    today: Date,
  ): Promise<void> {
    const workLogResult = await this.workLogReadDao.findAll({
      employeeId: employee.id,
      executionDate: today,
      page: 1,
      limit: 1,
    });

    if (workLogResult.total > 0) {
      return;
    }

    const alreadyNotified =
      await this.notificationReadDao.existsByUserIdAndTypeAndDate(
        employee.id,
        'daily_work_log_reminder',
        today,
      );
    if (alreadyNotified) {
      return;
    }

    const title = 'Bạn chưa ghi nhận công việc hôm nay';
    const content = 'Chỉ mất 2 phút! Hãy ghi nhận công việc ngày hôm nay.';

    const inAppPref =
      await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
        employee.id,
        'daily_work_log_reminder',
        'in_app',
      );
    const shouldSendInApp = inAppPref ? inAppPref.enabled : true;

    if (shouldSendInApp) {
      const notification = Notification.create(randomUUID(), {
        userId: employee.id,
        type: new NotificationType('daily_work_log_reminder'),
        title,
        content,
        actionLink: '/work-logs',
        isRead: false,
      });
      await this.notificationRepository.save(notification);
      this.logger.log(
        `Daily reminder notification created for employee ${employee.id}`,
      );
    }

    const emailPref =
      await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
        employee.id,
        'daily_work_log_reminder',
        'email',
      );
    const shouldSendEmail = emailPref ? emailPref.enabled : true;

    if (shouldSendEmail) {
      if (!employee.email || !employee.email.trim()) {
        this.logger.warn(
          `Employee ${employee.id} has no email, skipping email notification`,
        );
      } else {
        await this.emailService.send(employee.email, title, content);
        this.logger.log(`Daily reminder email sent to ${employee.email}`);
      }
    }
  }
}
