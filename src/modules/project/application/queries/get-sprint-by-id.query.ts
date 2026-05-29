import { IQuery } from 'src/libs/core/application';
import type { SprintDto } from '../dtos';

export class GetSprintByIdQuery extends IQuery<SprintDto> {
  constructor(public readonly sprintId: string) {
    super();
  }
}
