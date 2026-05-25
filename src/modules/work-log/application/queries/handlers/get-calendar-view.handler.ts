import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetCalendarViewQuery } from '../get-calendar-view.query';
import { CalendarDayDto, WorkLogDto } from '../../dtos';
import {
  WORK_LOG_READ_DAO_TOKEN,
  BUSINESS_DAY_CALCULATOR_TOKEN,
} from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';
import type { IBusinessDayCalculator } from '../../../domain/services';

@QueryHandler(GetCalendarViewQuery)
export class GetCalendarViewHandler implements IQueryHandler<
  GetCalendarViewQuery,
  CalendarDayDto[]
> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  async execute(query: GetCalendarViewQuery): Promise<CalendarDayDto[]> {
    const { employeeId, month, year } = query;

    const workLogs = await this.workLogReadDao.findByEmployeeAndMonth(
      employeeId,
      month,
      year,
    );

    const workLogMap = new Map<string, WorkLogDto>();
    for (const wl of workLogs) {
      const dateKey = wl.executionDate.split('T')[0];
      workLogMap.set(dateKey, wl);
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const result: CalendarDayDto[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isBusinessDay = this.calculator.isBusinessDay(date);
      const workLog = workLogMap.get(dateStr);
      const hasWorkLog = !!workLog;

      let isEditable = false;
      let editWindowClosesAt: string | null = null;

      if (hasWorkLog && workLog) {
        isEditable =
          workLog.isUnlocked ||
          this.calculator.countBusinessDaysBetween(date, today) <= 3;
        editWindowClosesAt = this.calculator
          .getEditWindowClosesAt(date)
          .toISOString();
      } else if (isBusinessDay) {
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        if (target <= today) {
          const bizDays = this.calculator.countBusinessDaysBetween(
            target,
            today,
          );
          isEditable = bizDays <= 3;
        }
      }

      result.push(
        new CalendarDayDto({
          date: dateStr,
          isBusinessDay,
          hasWorkLog,
          workLogId: workLog?.id ?? null,
          isEditable,
          editWindowClosesAt,
        }),
      );
    }

    return result;
  }
}
