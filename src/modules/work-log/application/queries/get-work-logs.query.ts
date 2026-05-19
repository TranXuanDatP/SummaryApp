import { IQuery } from 'src/libs/core/application';
import { WorkLogDto } from '../dtos';

export class GetWorkLogsQuery extends IQuery<{
  data: WorkLogDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly employeeId: string | undefined,
    public readonly projectId: string | undefined,
    public readonly executionDate: Date | undefined,
    public readonly page: number,
    public readonly limit: number,
    public readonly userRole: string,
  ) {
    super();
  }
}
