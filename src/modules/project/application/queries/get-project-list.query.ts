import { IQuery } from 'src/libs/core/application';
import { ProjectDto } from '../dtos';

export class GetProjectListQuery extends IQuery<{
  data: ProjectDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
  }
}
