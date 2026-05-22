import { DailyReminderScheduler } from './daily-reminder.scheduler';
import { EditWindowClosingScheduler } from './edit-window-closing.scheduler';
import { WeeklySummaryScheduler } from './weekly-summary.scheduler';
import { ManagerAlertScheduler } from './manager-alert.scheduler';
import { MonthlyReportReminderScheduler } from './monthly-report-reminder.scheduler';

export const Schedulers = [
  DailyReminderScheduler,
  EditWindowClosingScheduler,
  WeeklySummaryScheduler,
  ManagerAlertScheduler,
  MonthlyReportReminderScheduler,
];
