import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetWorkLogsQuery } from '../get-work-logs.query';
import { WorkLogDto } from '../../dtos';
import { WORK_LOG_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';

@QueryHandler(GetWorkLogsQuery)
export class GetWorkLogsHandler implements IQueryHandler<
  GetWorkLogsQuery,
  { data: WorkLogDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
  ) {}

  async execute(query: GetWorkLogsQuery): Promise<{
    data: WorkLogDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.workLogReadDao.findAll({
      employeeId: query.employeeId,
      projectId: query.projectId,
      executionDate: query.executionDate,
      page: query.page,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
