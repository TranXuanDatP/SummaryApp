import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { USER_READ_DAO_TOKEN } from '@modules/user/constants/tokens';
import { WORK_LOG_READ_DAO_TOKEN } from '@modules/work-log/constants/tokens';
import { BUSINESS_DAY_CALCULATOR_TOKEN } from '@modules/work-log/constants/tokens';
import { COMMENT_READ_DAO_TOKEN } from '@modules/comment/constants/tokens';
import {
  NOTIFICATION_REPOSITORY_TOKEN,
  NOTIFICATION_READ_DAO_TOKEN,
  EMAIL_SERVICE_TOKEN,
} from '../../constants/tokens';
import type { IUserReadDao } from '@modules/user/application/queries/ports';
import type { IWorkLogReadDao } from '@modules/work-log/application/queries/ports';
import type { IBusinessDayCalculator } from '@modules/work-log/domain/services';
import type { ICommentReadDao } from '@modules/comment/application/queries/ports';
import type { INotificationRepository } from '../../domain/repositories';
import type { INotificationReadDao } from '../../application/queries/ports';
import type { IEmailService } from '../../domain/services';
import { Notification } from '../../domain/entities';
import { NotificationType } from '../../domain/value-objects';

@Injectable()
export class WeeklySummaryScheduler {
  private readonly logger = new Logger(WeeklySummaryScheduler.name);

  constructor(
    @Inject(USER_READ_DAO_TOKEN)
    private readonly userReadDao: IUserReadDao,
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(COMMENT_READ_DAO_TOKEN)
    private readonly commentReadDao: ICommentReadDao,
    @Inject(NOTIFICATION_REPOSITORY_TOKEN)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly notificationReadDao: INotificationReadDao,
    @Inject(EMAIL_SERVICE_TOKEN)
    private readonly emailService: IEmailService,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  @Cron('0 17 * * 5')
  async handleWeeklySummary(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!this.calculator.isBusinessDay(today)) {
        this.logger.debug('Today is not a business day (holiday on Friday), skipping weekly summary');
        return;
      }

      const monday = this.getMonday(today);
      const employees = await this.userReadDao.findAllActiveByRole('employee');
      this.logger.log(`Processing weekly summary for ${employees.length} employees`);

      for (const employee of employees) {
        try {
          await this.processEmployee(employee, monday, today);
        } catch (error) {
          this.logger.error(
            `Error processing weekly summary for employee ${employee.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in weekly summary scheduler: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async processEmployee(
    employee: { id: string; email?: string; fullName?: string },
    monday: Date,
    today: Date,
  ): Promise<void> {
    const alreadyNotified = await this.notificationReadDao.existsByUserIdAndTypeAndDate(
      employee.id,
      'weekly_summary',
      today,
    );
    if (alreadyNotified) return;

    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    let workLogs = await this.workLogReadDao.findByEmployeeAndMonth(employee.id, month, year);

    // Cross-month boundary: fetch previous month when Monday is in a different month
    const mondayMonth = monday.getMonth() + 1;
    const mondayYear = monday.getFullYear();
    if (mondayMonth !== month || mondayYear !== year) {
      const prevMonthWorkLogs = await this.workLogReadDao.findByEmployeeAndMonth(employee.id, mondayMonth, mondayYear);
      workLogs = [...prevMonthWorkLogs, ...workLogs];
    }

    const weekWorkLogs = workLogs.filter((wl) => {
      const d = new Date(wl.executionDate);
      d.setHours(0, 0, 0, 0);
      return d >= monday && d <= today;
    });

    const loggedDates = new Set<string>();
    for (const wl of weekWorkLogs) {
      const d = new Date(wl.executionDate);
      d.setHours(0, 0, 0, 0);
      loggedDates.add(d.toISOString().split('T')[0]);
    }

    const totalBusinessDays = this.calculator.countBusinessDaysBetween(monday, today) + 1; // inclusive of today
    const loggedDays = loggedDates.size;

    const gapDates: string[] = [];
    let current = new Date(monday);
    let maxIterations = 0;
    while (current <= today && maxIterations < 7) {
      if (this.calculator.isBusinessDay(current)) {
        const dateStr = current.toISOString().split('T')[0];
        if (!loggedDates.has(dateStr)) {
          gapDates.push(dateStr);
        }
      }
      current.setDate(current.getDate() + 1);
      maxIterations++;
    }

    const workLogIds = weekWorkLogs.map((wl) => wl.id);
    const commentCount = await this.commentReadDao.countByWorkLogIds(workLogIds);

    const title = `Tổng kết tuần: Bạn đã ghi nhận ${loggedDays}/${totalBusinessDays} ngày làm việc`;
    const content = `Đã ghi nhận: ${loggedDays}/${totalBusinessDays} ngày làm việc. Nhận xét mới: ${commentCount}. Chưa ghi nhận: ${gapDates.length > 0 ? gapDates.join(', ') : 'Không có'}`;

    const notification = Notification.create(randomUUID(), {
      userId: employee.id,
      type: new NotificationType('weekly_summary'),
      title,
      content,
      actionLink: '/work-logs',
      isRead: false,
    });
    await this.notificationRepository.save(notification);
    this.logger.log(`Weekly summary notification created for employee ${employee.id}`);

    const emailPref = await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
      employee.id,
      'weekly_summary',
      'email',
    );
    const shouldSendEmail = emailPref ? emailPref.enabled : true;

    if (shouldSendEmail) {
      if (!employee.email || !employee.email.trim()) {
        this.logger.warn(`Employee ${employee.id} has no email, skipping weekly summary email`);
      } else {
        const subject = `Tổng kết tuần: Bạn đã ghi nhận ${loggedDays}/${totalBusinessDays} ngày làm việc`;
        const body = [
          `Xin chào ${employee.fullName || 'bạn'},`,
          '',
          'Tổng kết tuần của bạn:',
          '',
          `📊 Ngày đã ghi nhận: ${loggedDays}/${totalBusinessDays} ngày làm việc`,
          `💬 Nhận xét mới: ${commentCount}`,
          `⚠️ Ngày chưa ghi nhận: ${gapDates.length > 0 ? gapDates.join(', ') : 'Không có'}`,
          '',
          'Hãy ghi nhận công việc ngay!',
        ].join('\n');
        await this.emailService.send(employee.email, subject, body);
        this.logger.log(`Weekly summary email sent to ${employee.email}`);
      }
    }
  }
}
