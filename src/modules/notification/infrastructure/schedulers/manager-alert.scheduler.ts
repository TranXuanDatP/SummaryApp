import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import { BUSINESS_DAY_CALCULATOR_TOKEN } from '@modules/work-log/constants/tokens';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
} from '../../constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';
import type { IWorkLogReadDao } from '@modules/work-log/application/queries/ports';
import type { IBusinessDayCalculator } from '@modules/work-log/domain/services';
import type { INotificationRepository } from '../../domain/repositories';
import type { INotificationReadDao } from '../../application/queries/ports';
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
    result += ` và ${names.length - i} người khác`;
  }
  return result;
}

@Injectable()
export class ManagerAlertScheduler {
  private readonly logger = new Logger(ManagerAlertScheduler.name);

  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly notificationReadDao: INotificationReadDao,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  @Cron('0 10 * * 1-5')
  async handleManagerAlert(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!this.calculator.isBusinessDay(today)) {
        this.logger.debug(
          'Today is not a business day, skipping manager alert',
        );
        return;
      }

      const lastBizDay = this.getPreviousBusinessDay(today);
      const dayBeforeLast = this.getPreviousBusinessDay(lastBizDay);

      const employees = await this.userReadDao.findAllActiveByRole('employee');
      const inactiveEmployees: { id: string; fullName: string }[] = [];

      for (const emp of employees) {
        try {
          const result1 = await this.workLogReadDao.findAll({
            employeeId: emp.id,
            executionDate: lastBizDay,
            page: 1,
            limit: 1,
          });
          if (result1.total > 0) continue;

          const result2 = await this.workLogReadDao.findAll({
            employeeId: emp.id,
            executionDate: dayBeforeLast,
            page: 1,
            limit: 1,
          });
          if (result2.total > 0) continue;

          inactiveEmployees.push({
            id: emp.id,
            fullName: emp.fullName || 'Không tên',
          });
        } catch (error) {
          this.logger.error(
            `Error checking employee ${emp.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (inactiveEmployees.length === 0) {
        this.logger.log('No inactive employees found, skipping manager alerts');
        return;
      }

      const managers = await this.userReadDao.findAllActiveByRole('manager');
      this.logger.log(
        `Found ${inactiveEmployees.length} inactive employees, notifying ${managers.length} managers`,
      );

      const names = inactiveEmployees.map((e) => e.fullName);
      for (const manager of managers) {
        if (manager.role !== 'manager') continue;
        try {
          await this.notifyManager(manager.id, names, today);
        } catch (error) {
          this.logger.error(
            `Error notifying manager ${manager.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in manager alert scheduler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getPreviousBusinessDay(date: Date): Date {
    const d = new Date(date);
    let iterations = 0;
    do {
      d.setDate(d.getDate() - 1);
      iterations++;
    } while (!this.calculator.isBusinessDay(d) && iterations < 10);
    return d;
  }

  private async notifyManager(
    managerId: string,
    employeeNames: string[],
    today: Date,
  ): Promise<void> {
    const alreadyNotified =
      await this.notificationReadDao.existsByUserIdAndTypeAndDate(
        managerId,
        'manager_no_activity_alert',
        today,
      );
    if (alreadyNotified) return;

    const displayNames = truncateNameList(employeeNames, 200);
    const title =
      employeeNames.length === 1
        ? `${displayNames} chưa ghi nhận công việc 2 ngày qua. Có thể cần hỗ trợ?`
        : `${employeeNames.length} nhân viên chưa ghi nhận công việc 2 ngày qua: ${displayNames}. Có thể cần hỗ trợ?`;

    const notification = Notification.create(randomUUID(), {
      userId: managerId,
      type: new NotificationType('manager_no_activity_alert'),
      title,
      content: title,
      actionLink: '/work-logs',
      isRead: false,
    });
    await this.notificationRepository.save(notification);
    this.logger.log(
      `Manager alert notification created for manager ${managerId}`,
    );
  }
}
