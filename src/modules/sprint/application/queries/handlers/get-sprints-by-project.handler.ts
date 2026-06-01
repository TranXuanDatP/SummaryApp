import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetSprintsByProjectQuery } from '../get-sprints-by-project.query';
import { SprintDto } from '../../dtos';
import type { ISprintReadDao } from '../ports';
import { SPRINT_READ_DAO_TOKEN } from '../../../constants/tokens';

@QueryHandler(GetSprintsByProjectQuery)
export class GetSprintsByProjectHandler implements IQueryHandler<
  GetSprintsByProjectQuery,
  SprintDto[]
> {
  constructor(
    @Inject(SPRINT_READ_DAO_TOKEN)
    private readonly sprintReadDao: ISprintReadDao,
  ) {}

  async execute(query: GetSprintsByProjectQuery): Promise<SprintDto[]> {
    return this.sprintReadDao.findByProjectId(query.projectId);
  }
}
