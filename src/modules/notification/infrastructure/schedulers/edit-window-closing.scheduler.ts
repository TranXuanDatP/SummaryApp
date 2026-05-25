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
export class EditWindowClosingScheduler {
  private readonly logger = new Logger(EditWindowClosingScheduler.name);

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

  @Cron('0 9 * * 1-5')
  async handleEditWindowClosing(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!this.calculator.isBusinessDay(today)) {
        this.logger.debug(
          'Today is not a business day (holiday), skipping edit window closing check',
        );
        return;
      }

      const targetDate = this.getTargetDate(today);
      this.logger.log(
        `Checking WorkLogs from ${targetDate.toISOString()} for edit window closing`,
      );

      const workLogs =
        await this.workLogReadDao.findByExecutionDate(targetDate);
      const nonLockedWorkLogs = workLogs.filter((wl) => !wl.isUnlocked);

      const seenEmployees = new Set<string>();

      for (const workLog of nonLockedWorkLogs) {
        if (seenEmployees.has(workLog.employeeId)) continue;
        seenEmployees.add(workLog.employeeId);

        try {
          await this.processEmployeeWorkLog(workLog, today);
        } catch (error) {
          this.logger.error(
            `Error processing edit window closing for employee ${workLog.employeeId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in edit window closing scheduler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getTargetDate(today: Date): Date {
    const date = new Date(today);
    let businessDaysCount = 0;
    let iterations = 0;
    const maxIterations = 10;
    while (businessDaysCount < 2 && iterations < maxIterations) {
      date.setDate(date.getDate() - 1);
      if (this.calculator.isBusinessDay(date)) {
        businessDaysCount++;
      }
      iterations++;
    }
    return date;
  }

  private async processEmployeeWorkLog(
    workLog: { id: string; employeeId: string; executionDate: string },
    today: Date,
  ): Promise<void> {
    const employee = await this.userReadDao.findById(workLog.employeeId);
    if (!employee || !employee.isActive || employee.role !== 'employee') {
      return;
    }

    const alreadyNotified =
      await this.notificationReadDao.existsByUserIdAndTypeAndDate(
        employee.id,
        'edit_window_closing',
        today,
      );
    if (alreadyNotified) {
      return;
    }

    const executionDate = workLog.executionDate.split('T')[0];
    const closesAt = this.calculator
      .getEditWindowClosesAt(new Date(workLog.executionDate))
      .toISOString()
      .split('T')[0];

    const title = `WorkLog ngày ${executionDate} sắp bị khóa`;
    const content = `WorkLog ngày ${executionDate} sắp bị khóa vào ngày ${closesAt}. Kiểm tra và chỉnh sửa ngay.`;

    const inAppPref =
      await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
        employee.id,
        'edit_window_closing',
        'in_app',
      );
    const shouldSendInApp = inAppPref ? inAppPref.enabled : true;

    if (shouldSendInApp) {
      const notification = Notification.create(randomUUID(), {
        userId: employee.id,
        type: new NotificationType('edit_window_closing'),
        title,
        content,
        actionLink: `/work-logs/${workLog.id}`,
        isRead: false,
      });
      await this.notificationRepository.save(notification);
      this.logger.log(
        `Edit window closing notification created for employee ${employee.id}`,
      );
    }

    const emailPref =
      await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
        employee.id,
        'edit_window_closing',
        'email',
      );
    const shouldSendEmail = emailPref ? emailPref.enabled : false;

    if (shouldSendEmail) {
      if (!employee.email || !employee.email.trim()) {
        this.logger.warn(
          `Employee ${employee.id} has no email, skipping email notification`,
        );
      } else {
        await this.emailService.send(employee.email, title, content);
        this.logger.log(`Edit window closing email sent to ${employee.email}`);
      }
    }
  }
}
