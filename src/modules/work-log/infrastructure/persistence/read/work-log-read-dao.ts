import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, count, gte, lt, asc, inArray, sql } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { WorkLogDto } from '../../../application/dtos';
import { IWorkLogReadDao } from '../../../application/queries/ports';
import type { IBusinessDayCalculator } from '../../../domain/services';
import { workLogsTable, type WorkLogRecord } from '../drizzle/schema';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import { sprintsTable } from '@modules/sprint/infrastructure/persistence/drizzle/schema';
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
        sprintName: sprintsTable.name,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
      .where(and(eq(workLogsTable.id, id), eq(workLogsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(
      result[0].workLog,
      result[0].projectName ?? '',
      result[0].employeeName ?? '',
      result[0].sprintName ?? null,
    );
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
        sprintName: sprintsTable.name,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
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
    return this.mapToDto(
      result[0].workLog,
      result[0].projectName ?? '',
      result[0].employeeName ?? '',
      result[0].sprintName ?? null,
    );
  }

  async findMostRecentByEmployee(
    employeeId: string,
  ): Promise<WorkLogDto | null> {
    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
        sprintName: sprintsTable.name,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
      .where(
        and(
          eq(workLogsTable.employeeId, employeeId),
          eq(workLogsTable.isDeleted, false),
        ),
      )
      .orderBy(desc(workLogsTable.executionDate))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(
      result[0].workLog,
      result[0].projectName ?? '',
      result[0].employeeName ?? '',
      result[0].sprintName ?? null,
    );
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
      sprintName: sprintsTable.name,
    };

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select(selectShape)
        .from(workLogsTable)
        .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
        .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
        .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
        .where(whereClause)
        .orderBy(desc(workLogsTable.executionDate))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(workLogsTable).where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      data: dataResult.map((row) =>
        this.mapToDto(
          row.workLog,
          row.projectName ?? '',
          row.employeeName ?? '',
          row.sprintName ?? null,
        ),
      ),
      total: Number(total),
    };
  }

  async findByEmployeeAndMonth(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<WorkLogDto[]> {
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 1);
    endDate.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
        sprintName: sprintsTable.name,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
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
      this.mapToDto(row.workLog, row.projectName ?? '', row.employeeName ?? '', row.sprintName ?? null),
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
      sprintName: sprintsTable.name,
    };

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select(selectShape)
        .from(workLogsTable)
        .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
        .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
        .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
        .where(whereClause)
        .orderBy(asc(workLogsTable.executionDate))
        .limit(limit)
        .offset(offset),
      this.db.select({ count: count() }).from(workLogsTable).where(whereClause),
    ]);

    return {
      data: dataResult.map((row) =>
        this.mapToDto(
          row.workLog,
          row.projectName || '',
          row.employeeName || '',
          row.sprintName ?? null,
        ),
      ),
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async findByExecutionDate(executionDate: Date): Promise<WorkLogDto[]> {
    const dateOnly = new Date(executionDate);
    dateOnly.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        workLog: workLogsTable,
        projectName: projectsTable.name,
        employeeName: usersTable.fullName,
        sprintName: sprintsTable.name,
      })
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .leftJoin(sprintsTable, eq(workLogsTable.sprintId, sprintsTable.id))
      .where(
        and(
          eq(workLogsTable.executionDate, dateOnly),
          eq(workLogsTable.isDeleted, false),
        ),
      );

    return result.map((row) =>
      this.mapToDto(row.workLog, row.projectName ?? '', row.employeeName ?? '', row.sprintName ?? null),
    );
  }

  async countByEmployeeIdsAndMonth(
    employeeIds: string[],
    month: number,
    year: number,
  ): Promise<Map<string, number>> {
    if (employeeIds.length === 0) return new Map();

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 1);
    endDate.setHours(0, 0, 0, 0);

    const result = await this.db
      .select({
        employeeId: workLogsTable.employeeId,
        count: count(),
      })
      .from(workLogsTable)
      .where(
        and(
          inArray(workLogsTable.employeeId, employeeIds),
          gte(workLogsTable.executionDate, startDate),
          lt(workLogsTable.executionDate, endDate),
          eq(workLogsTable.isDeleted, false),
        ),
      )
      .groupBy(workLogsTable.employeeId);

    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row.employeeId, Number(row.count));
    }
    for (const id of employeeIds) {
      if (!map.has(id)) map.set(id, 0);
    }
    return map;
  }

  private mapToDto(
    row: WorkLogRecord,
    projectName: string,
    employeeName: string,
    sprintName: string | null = null,
  ): WorkLogDto {
    const isEditable = row.isUnlocked || this.isWithinWindow(row.executionDate);

    return new WorkLogDto({
      id: row.id,
      projectId: row.projectId,
      employeeId: row.employeeId,
      sprintId: row.sprintId ?? null,
      executionDate: row.executionDate.toISOString(),
      content: row.content,
      workType: row.workType ?? null,
      status: row.status,
      isUnlocked: row.isUnlocked,
      unlockedBy: row.unlockedBy,
      unlockedAt: row.unlockedAt?.toISOString() ?? null,
      unlockReason: row.unlockReason,
      version: row.version,
      isEditable,
      editWindowClosesAt: this.calculator
        .getEditWindowClosesAt(row.executionDate)
        .toISOString(),
      projectName,
      employeeName,
      sprintName,
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
