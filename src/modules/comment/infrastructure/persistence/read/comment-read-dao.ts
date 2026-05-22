import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc, count, inArray } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { CommentDto } from '../../../application/dtos';
import { ICommentReadDao } from '../../../application/queries/ports';
import {
  commentsTable,
  type CommentRecord,
} from '../drizzle/schema';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

@Injectable()
export class CommentReadDao extends BaseReadDao implements ICommentReadDao {
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

  async findById(id: string): Promise<CommentDto | null> {
    const result = await this.db
      .select({
        comment: commentsTable,
        authorName: usersTable.fullName,
      })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(and(eq(commentsTable.id, id), eq(commentsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToDto(result[0].comment, result[0].authorName || '');
  }

  async findByWorkLogId(workLogId: string): Promise<CommentDto[]> {
    const result = await this.db
      .select({
        comment: commentsTable,
        authorName: usersTable.fullName,
      })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
      .where(
        and(
          eq(commentsTable.workLogId, workLogId),
          eq(commentsTable.isDeleted, false),
        ),
      )
      .orderBy(asc(commentsTable.createdAt));

    return result.map((row) =>
      this.mapToDto(row.comment, row.authorName || ''),
    );
  }

  async countByWorkLogIds(workLogIds: string[]): Promise<number> {
    if (workLogIds.length === 0) return 0;

    const result = await this.db
      .select({ count: count() })
      .from(commentsTable)
      .where(
        and(
          inArray(commentsTable.workLogId, workLogIds),
          eq(commentsTable.isDeleted, false),
        ),
      );

    return Number(result[0]?.count ?? 0);
  }

  private mapToDto(row: CommentRecord, authorName: string): CommentDto {
    return new CommentDto({
      id: row.id,
      workLogId: row.workLogId,
      authorId: row.authorId,
      authorName,
      content: row.content,
      version: row.version,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
