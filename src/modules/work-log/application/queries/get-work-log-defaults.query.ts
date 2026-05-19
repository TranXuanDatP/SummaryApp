import { IQuery } from 'src/libs/core/application';
import { WorkLogDefaultsDto } from '../dtos';

export class GetWorkLogDefaultsQuery extends IQuery<WorkLogDefaultsDto> {
  constructor(public readonly employeeId: string) {
    super();
  }
}
