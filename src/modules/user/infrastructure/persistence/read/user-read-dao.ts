import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc, count } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { UserDto } from '../../../application/dtos';
import { IUserReadDao } from '../../../application/queries/ports';
import { usersTable, type UserRecord } from '../drizzle/schema';

@Injectable()
export class UserReadDao extends BaseReadDao implements IUserReadDao {
  private readonly logger = new Logger(UserReadDao.name);

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

  async findById(id: string): Promise<UserDto | null> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, id), eq(usersTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0]);
  }

  async findAll(params: {
    page: number;
    limit: number;
  }): Promise<{ data: UserDto[]; total: number }> {
    const { page, limit } = params;
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.isDeleted, false))
        .orderBy(desc(usersTable.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(usersTable)
        .where(eq(usersTable.isDeleted, false)),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      data: dataResult.map((row) => this.mapToDto(row)),
      total: Number(total),
    };
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0]);
  }

  private mapToDto(row: UserRecord): UserDto {
    return new UserDto({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      isActive: row.isActive,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
