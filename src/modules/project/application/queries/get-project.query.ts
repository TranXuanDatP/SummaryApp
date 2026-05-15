import { IQuery } from 'src/libs/core/application';
import { ProjectDto } from '../dtos';

export class GetProjectQuery extends IQuery<ProjectDto> {
  constructor(public readonly id: string) {
    super();
  }
}
