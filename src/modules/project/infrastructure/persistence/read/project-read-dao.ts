import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, count, ilike } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { ProjectDto } from '../../../application/dtos';
import { IProjectReadDao } from '../../../application/queries/ports';
import { projectsTable, type ProjectRecord } from '../drizzle/schema';

@Injectable()
export class ProjectReadDao extends BaseReadDao implements IProjectReadDao {
  private readonly logger = new Logger(ProjectReadDao.name);

  constructor(
    @Inject(DATABASE_READ_TOKEN)
    private readonly db: DrizzleDB<typeof schema>,
  ) {
    super();
  }

  protected async executeQuery<T = unknown>(sql: string): Promise<T[]> {
    type ExecuteParam = Parameters<typeof this.db.execute>[0];
    const result = await this.db.execute(sql as ExecuteParam);
    return result.rows as T[];
  }

  async findById(id: string): Promise<ProjectDto | null> {
    const result = await this.db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0]);
  }

  async findAll(params: {
    page: number;
    limit: number;
  }): Promise<{ data: ProjectDto[]; total: number }> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.isDeleted, false))
        .orderBy(desc(projectsTable.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(projectsTable)
        .where(eq(projectsTable.isDeleted, false)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      data: dataResult.map((row) => this.mapToDto(row)),
      total: Number(total),
    };
  }

  async findByName(name: string): Promise<ProjectDto | null> {
    const result = await this.db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.name, name), eq(projectsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0]);
  }

  async search(params: {
    query: string;
    page: number;
    limit: number;
  }): Promise<{ data: ProjectDto[]; total: number }> {
    const { query, page, limit } = params;
    const offset = (page - 1) * limit;

    const condition = and(
      ilike(projectsTable.name, `%${query}%`),
      eq(projectsTable.isDeleted, false),
    );

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(projectsTable)
        .where(condition)
        .orderBy(desc(projectsTable.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(projectsTable)
        .where(condition),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      data: dataResult.map((row) => this.mapToDto(row)),
      total: Number(total),
    };
  }

  private mapToDto(row: ProjectRecord): ProjectDto {
    return new ProjectDto({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
