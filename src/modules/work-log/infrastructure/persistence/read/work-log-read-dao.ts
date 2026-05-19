import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, count, gte, lt, asc } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { WorkLogDto } from '../../../application/dtos';
import { IWorkLogReadDao } from '../../../application/queries/ports';
import type { IBusinessDayCalculator } from '../../../domain/services';
import {
  workLogsTable,
  type WorkLogRecord,
} from '../drizzle/schema';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';
import { BUSINESS_DAY_CALCULATOR_TOKEN } from '../../../constants/tokens';

@Injectable()
export class WorkLogReadDao extends BaseReadDao implements IWorkLogReadDao {
  private readonly logger = new Logger(WorkLogReadDao.name);

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {
    super();
  }

  protected async executeQuery<T = unknown>(sql: string): Promise<T[]> {
    type ExecuteParam = Parameters<typeof this.db.execute>[0];
    const result = await this.db.execute(sql as ExecuteParam);
    return result.rows as T[];
  }

  async findById(id: string): Promise<WorkLogDto | null> {
    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .where(and(eq(workLogsTable.id, id), eq(workLogsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0].workLog, result[0].projectName ?? '', result[0].employeeName ?? '');
  }

  async findByProjectAndEmployeeAndDate(
    projectId: string,
    employeeId: string,
    executionDate: Date,
  ): Promise<WorkLogDto | null> {
    const dateOnly = new Date(executionDate);
    dateOnly.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .where(
        and(
          eq(workLogsTable.projectId, projectId),
          eq(workLogsTable.employeeId, employeeId),
          eq(workLogsTable.executionDate, dateOnly),
          eq(workLogsTable.isDeleted, false),
        ),
      )
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0].workLog, result[0].projectName ?? '', result[0].employeeName ?? '');
  }

  async findMostRecentByEmployee(employeeId: string): Promise<WorkLogDto | null> {
    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .where(
        and(
          eq(workLogsTable.employeeId, employeeId),
          eq(workLogsTable.isDeleted, false),
        ),
      )
      .orderBy(desc(workLogsTable.executionDate))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0].workLog, result[0].projectName ?? '', result[0].employeeName ?? '');
  }

  async findAll(params: {
    employeeId?: string;
    projectId?: string;
    executionDate?: Date;
    page: number;
    limit: number;
  }): Promise<{ data: WorkLogDto[]; total: number }> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const conditions = [eq(workLogsTable.isDeleted, false)];

    if (params.employeeId) {
      conditions.push(eq(workLogsTable.employeeId, params.employeeId));
    }
    if (params.projectId) {
      conditions.push(eq(workLogsTable.projectId, params.projectId));
    }
    if (params.executionDate) {
      const dateOnly = new Date(params.executionDate);
      dateOnly.setHours(0, 0, 0, 0);
      conditions.push(eq(workLogsTable.executionDate, dateOnly));
    }

    const whereClause = and(...conditions);

    const selectShape = {
      workLog: workLogsTable,
      projectName: projectsTable.name,
      employeeName: usersTable.fullName,
    };

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select(selectShape)
        .from(workLogsTable)
        .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
        .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
        .where(whereClause)
        .orderBy(desc(workLogsTable.executionDate))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(workLogsTable)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      data: dataResult.map((row) =>
        this.mapToDto(row.workLog, row.projectName ?? '', row.employeeName ?? ''),
      ),
      total: Number(total),
    };
  }

  async findByEmployeeAndMonth(employeeId: string, month: number, year: number): Promise<WorkLogDto[]> {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 1);
    endDate.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .where(
        and(
          eq(workLogsTable.employeeId, employeeId),
          gte(workLogsTable.executionDate, startDate),
          lt(workLogsTable.executionDate, endDate),
          eq(workLogsTable.isDeleted, false),
        ),
      )
      .orderBy(workLogsTable.executionDate);

    return result.map((row) =>
      this.mapToDto(row.workLog, row.projectName ?? '', row.employeeName ?? ''),
    );
  }

  async findMonthlyReport(params: {
    month: number;
    year: number;
    employeeId?: string;
    projectId?: string;
    page: number;
    limit: number;
  }): Promise<{ data: WorkLogDto[]; total: number }> {
    const { month, year, page, limit } = params;
    const offset = (page - 1) * limit;

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 1);
    endDate.setHours(0, 0, 0, 0);

    const conditions = [
      gte(workLogsTable.executionDate, startDate),
      lt(workLogsTable.executionDate, endDate),
      eq(workLogsTable.isDeleted, false),
    ];

    if (params.employeeId) {
      conditions.push(eq(workLogsTable.employeeId, params.employeeId));
    }
    if (params.projectId) {
      conditions.push(eq(workLogsTable.projectId, params.projectId));
    }

    const whereClause = and(...conditions);

    const selectShape = {
      workLog: workLogsTable,
      projectName: projectsTable.name,
      employeeName: usersTable.fullName,
    };

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select(selectShape)
        .from(workLogsTable)
        .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
        .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
        .where(whereClause)
        .orderBy(asc(workLogsTable.executionDate))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(workLogsTable)
        .where(whereClause),
    ]);

    return {
      data: dataResult.map((row) =>
        this.mapToDto(row.workLog, row.projectName || '', row.employeeName || ''),
      ),
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  private mapToDto(row: WorkLogRecord, projectName: string, employeeName: string): WorkLogDto {
    const isEditable = row.isUnlocked || this.isWithinWindow(row.executionDate);

    return new WorkLogDto({
      id: row.id,
      projectId: row.projectId,
      employeeId: row.employeeId,
      executionDate: row.executionDate.toISOString(),
      content: row.content,
      isUnlocked: row.isUnlocked,
      unlockedBy: row.unlockedBy,
      unlockedAt: row.unlockedAt?.toISOString() ?? null,
      unlockReason: row.unlockReason,
      version: row.version,
      isEditable,
      editWindowClosesAt: this.calculator.getEditWindowClosesAt(row.executionDate).toISOString(),
      projectName,
      employeeName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private isWithinWindow(executionDate: Date): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(executionDate);
    target.setHours(0, 0, 0, 0);
    const bizDays = this.calculator.countBusinessDaysBetween(target, now);
    return bizDays <= 3;
  }
}
