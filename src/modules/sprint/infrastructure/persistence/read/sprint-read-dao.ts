import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { SprintDto } from '../../../application/dtos';
import { ISprintReadDao } from '../../../application/queries/ports';
import { sprintsTable, type SprintRecord } from '../drizzle/schema';

@Injectable()
export class SprintReadDao extends BaseReadDao implements ISprintReadDao {
  private readonly logger = new Logger(SprintReadDao.name);

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

  async findById(id: string): Promise<SprintDto | null> {
    const result = await this.db
      .select()
      .from(sprintsTable)
      .where(and(eq(sprintsTable.id, id), eq(sprintsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0]);
  }

  async findByProjectId(projectId: string): Promise<SprintDto[]> {
    const result = await this.db
      .select()
      .from(sprintsTable)
      .where(
        and(
          eq(sprintsTable.projectId, projectId),
          eq(sprintsTable.isDeleted, false),
        ),
      )
      .orderBy(asc(sprintsTable.sortOrder), asc(sprintsTable.createdAt));

    return result.map((row) => this.mapToDto(row));
  }

  private mapToDto(row: SprintRecord): SprintDto {
    return new SprintDto({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      status: row.status,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      sortOrder: row.sortOrder,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
