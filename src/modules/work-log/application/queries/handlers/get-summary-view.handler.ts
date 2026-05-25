import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetSummaryViewQuery } from '../get-summary-view.query';
import { SummaryViewDto, ProjectBreakdownItem } from '../../dtos';
import {
  WORK_LOG_READ_DAO_TOKEN,
  BUSINESS_DAY_CALCULATOR_TOKEN,
} from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';
import type { IBusinessDayCalculator } from '../../../domain/services';

@QueryHandler(GetSummaryViewQuery)
export class GetSummaryViewHandler implements IQueryHandler<
  GetSummaryViewQuery,
  SummaryViewDto
> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}

  async execute(query: GetSummaryViewQuery): Promise<SummaryViewDto> {
    const { employeeId, month, year } = query;

    const workLogs = await this.workLogReadDao.findByEmployeeAndMonth(
      employeeId,
      month,
      year,
    );

    const workLogDates = new Set(
      workLogs.map((wl) => wl.executionDate.split('T')[0]),
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalBusinessDays = 0;
    let loggedDays = 0;
    const editableGaps: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      if (!this.calculator.isBusinessDay(date)) continue;

      totalBusinessDays++;

      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasWorkLog = workLogDates.has(dateStr);

      if (hasWorkLog) {
        loggedDays++;
      } else {
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        if (target <= today) {
          const bizDays = this.calculator.countBusinessDaysBetween(
            target,
            today,
          );
          if (bizDays <= 3) {
            editableGaps.push(dateStr);
          }
        }
      }
    }

    const completionRate =
      totalBusinessDays > 0 ? loggedDays / totalBusinessDays : 0;

    const projectMap = new Map<
      string,
      { projectName: string; count: number }
    >();
    for (const wl of workLogs) {
      const existing = projectMap.get(wl.projectId);
      if (existing) {
        existing.count++;
      } else {
        projectMap.set(wl.projectId, {
          projectName: wl.projectName || 'Unknown',
          count: 1,
        });
      }
    }

    const projectBreakdown = Array.from(projectMap.entries())
      .map(
        ([projectId, data]) =>
          new ProjectBreakdownItem({
            projectId,
            projectName: data.projectName,
            workLogCount: data.count,
          }),
      )
      .sort((a, b) => b.workLogCount - a.workLogCount);

    return new SummaryViewDto({
      period: { month, year },
      totalBusinessDays,
      loggedDays,
      completionRate,
      editableGaps,
      projectBreakdown,
    });
  }
}
