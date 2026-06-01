import { IQuery } from 'src/libs/core/application';
import type { SprintDto } from '../dtos';

export class GetSprintsByProjectQuery extends IQuery<SprintDto[]> {
  constructor(public readonly projectId: string) {
    super();
  }
}
