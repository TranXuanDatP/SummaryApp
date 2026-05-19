import { GetWorkLogsHandler } from './get-work-logs.handler';
import { GetWorkLogDefaultsHandler } from './get-work-log-defaults.handler';
import { GetCalendarViewHandler } from './get-calendar-view.handler';
import { GetSummaryViewHandler } from './get-summary-view.handler';
import { GetMonthlyReportHandler } from './get-monthly-report.handler';

export const QueryHandlers = [GetWorkLogsHandler, GetWorkLogDefaultsHandler, GetCalendarViewHandler, GetSummaryViewHandler, GetMonthlyReportHandler];
