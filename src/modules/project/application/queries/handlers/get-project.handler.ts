import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { NotFoundException } from 'src/libs/core/common';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetProjectQuery } from '../get-project.query';
import { ProjectDto } from '../../dtos';
import { PROJECT_READ_DAO_TOKEN } from '../../../constants/tokens';
import { type IProjectReadDao } from '../ports';

@QueryHandler(GetProjectQuery)
export class GetProjectHandler implements IQueryHandler<GetProjectQuery, ProjectDto> {
  constructor(
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
  ) {}

  async execute(query: GetProjectQuery): Promise<ProjectDto> {
    const project = await this.projectReadDao.findById(query.id);
    if (!project) {
      throw NotFoundException.entity('Project', query.id, {
        suggestion: 'Kiểm tra lại ID dự án',
      });
    }
    return project;
  }
}
