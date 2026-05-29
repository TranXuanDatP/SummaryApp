import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetSprintByIdQuery } from '../get-sprint-by-id.query';
import { SprintDto } from '../../dtos';
import type { ISprintReadDao } from '../ports';
import { SPRINT_READ_DAO_TOKEN } from '../../../constants/tokens';
import { NotFoundException } from 'src/libs/core/common';

@QueryHandler(GetSprintByIdQuery)
export class GetSprintByIdHandler implements IQueryHandler<
  GetSprintByIdQuery,
  SprintDto
> {
  constructor(
    @Inject(SPRINT_READ_DAO_TOKEN)
    private readonly sprintReadDao: ISprintReadDao,
  ) {}

  async execute(query: GetSprintByIdQuery): Promise<SprintDto> {
    const sprint = await this.sprintReadDao.findById(query.sprintId);
    if (!sprint) {
      throw NotFoundException.withId('Sprint', query.sprintId);
    }
    return sprint;
  }
}
