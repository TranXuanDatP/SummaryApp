import { IQuery } from 'src/libs/core/application';
import { SummaryViewDto } from '../dtos';

export class GetSummaryViewQuery extends IQuery<SummaryViewDto> {
  constructor(
    public readonly employeeId: string,
    public readonly month: number,
    public readonly year: number,
  ) {
    super();
  }
}
