import type { WorkLogDto } from '../../dtos';

export interface IWorkLogReadDao {
  findById(id: string): Promise<WorkLogDto | null>;

  findByProjectAndEmployeeAndDate(
    projectId: string,
    employeeId: string,
    executionDate: Date,
  ): Promise<WorkLogDto | null>;

  findMostRecentByEmployee(employeeId: string): Promise<WorkLogDto | null>;

  findAll(params: {
    employeeId?: string;
    projectId?: string;
    executionDate?: Date;
    page: number;
    limit: number;
  }): Promise<{ data: WorkLogDto[]; total: number }>;

  findByEmployeeAndMonth(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<WorkLogDto[]>;

  findMonthlyReport(params: {
    month: number;
    year: number;
    employeeId?: string;
    projectId?: string;
    page: number;
    limit: number;
  }): Promise<{ data: WorkLogDto[]; total: number }>;

  findByExecutionDate(executionDate: Date): Promise<WorkLogDto[]>;
}
