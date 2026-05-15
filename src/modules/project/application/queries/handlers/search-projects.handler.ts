import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { SearchProjectsQuery } from '../search-projects.query';
import { ProjectDto } from '../../dtos';
import { PROJECT_READ_DAO_TOKEN } from '../../../constants/tokens';
import { type IProjectReadDao } from '../ports';

@QueryHandler(SearchProjectsQuery)
export class SearchProjectsHandler implements IQueryHandler<
  SearchProjectsQuery,
  { data: ProjectDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
  ) {}

  async execute(query: SearchProjectsQuery): Promise<{
    data: ProjectDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.projectReadDao.search({
      query: query.query,
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
