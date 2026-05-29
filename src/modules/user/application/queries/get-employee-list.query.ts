import { IQuery } from 'src/libs/core/application';
import type { EmployeeListItemDto } from '../dtos';

export class GetEmployeeListQuery extends IQuery<EmployeeListItemDto[]> {
  constructor(
    public readonly month: number,
    public readonly year: number,
  ) {
    super();
  }
}
