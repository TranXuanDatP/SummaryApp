import { IQuery } from 'src/libs/core/application';
import { MonthlyReportEntryDto } from '../dtos';

export class GetMonthlyReportQuery extends IQuery<{
  data: MonthlyReportEntryDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly month: number,
    public readonly year: number,
    public readonly employeeId?: string,
    public readonly projectId?: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly userRole?: string,
  ) {
    super();
  }
}
