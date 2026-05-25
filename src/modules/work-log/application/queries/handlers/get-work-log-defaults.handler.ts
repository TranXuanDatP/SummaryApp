import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetWorkLogDefaultsQuery } from '../get-work-log-defaults.query';
import { WorkLogDefaultsDto } from '../../dtos';
import { WORK_LOG_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { IWorkLogReadDao } from '../ports';

@QueryHandler(GetWorkLogDefaultsQuery)
export class GetWorkLogDefaultsHandler implements IQueryHandler<
  GetWorkLogDefaultsQuery,
  WorkLogDefaultsDto
> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
  ) {}

  async execute(query: GetWorkLogDefaultsQuery): Promise<WorkLogDefaultsDto> {
    const recent = await this.workLogReadDao.findMostRecentByEmployee(
      query.employeeId,
    );

    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return new WorkLogDefaultsDto({
      suggestedProjectId: recent?.projectId ?? null,
      suggestedProjectName: recent?.projectName || null,
      todayDate,
    });
  }
}
