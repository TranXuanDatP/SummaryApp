import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetProjectListQuery } from '../get-project-list.query';
import { ProjectDto } from '../../dtos';
import { PROJECT_READ_DAO_TOKEN } from '../../../constants/tokens';
import { type IProjectReadDao } from '../ports';

@QueryHandler(GetProjectListQuery)
export class GetProjectListHandler implements IQueryHandler<
  GetProjectListQuery,
  { data: ProjectDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
  ) {}

  async execute(query: GetProjectListQuery): Promise<{
    data: ProjectDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.projectReadDao.findAll({
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
