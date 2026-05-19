import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetMonthlyReportQuery } from '../get-monthly-report.query';
import { MonthlyReportEntryDto } from '../../dtos';
import { WORK_LOG_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';

@QueryHandler(GetMonthlyReportQuery)
export class GetMonthlyReportHandler implements IQueryHandler<GetMonthlyReportQuery, {
  data: MonthlyReportEntryDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
  ) {}

  async execute(query: GetMonthlyReportQuery): Promise<{
    data: MonthlyReportEntryDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data: workLogs, total } = await this.workLogReadDao.findMonthlyReport({
      month: query.month,
      year: query.year,
      employeeId: query.employeeId,
      projectId: query.projectId,
      page: query.page,
      limit: query.limit,
    });

    const entries = workLogs.map((wl) =>
      new MonthlyReportEntryDto({
        id: wl.id,
        date: wl.executionDate.split('T')[0],
        projectId: wl.projectId,
        projectName: wl.projectName,
        employeeId: wl.employeeId,
        employeeName: wl.employeeName,
        content: wl.content,
        isEditable: wl.isEditable,
        editWindowClosesAt: wl.editWindowClosesAt,
        version: wl.version,
        comments: [],
      }),
    );

    const totalPages = Math.ceil(total / query.limit);

    return { data: entries, total, page: query.page, totalPages };
  }
}
