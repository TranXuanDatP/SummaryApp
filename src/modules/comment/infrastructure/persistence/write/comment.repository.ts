import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type {
  IEventBus,
  IOutboxRepository,
} from 'src/libs/core/infrastructure';
import { ConcurrencyException } from 'src/libs/core/common';
import { OUTBOX_REPOSITORY_TOKEN } from 'src/libs/core/constants';
import {
  BaseAggregateRepository,
  SaveOptions,
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
  type DrizzleTransaction,
} from 'src/libs/shared';
import { Comment } from '../../../domain/entities';
import { ICommentRepository } from '../../../domain/repositories';
import { commentsTable, type CommentRecord } from '../drizzle/schema';

@Injectable()
export class CommentRepository
  extends BaseAggregateRepository<Comment>
  implements ICommentRepository
{
  private readonly logger = new Logger(CommentRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) protected readonly eventBus: IEventBus,
    @Optional()
    @Inject(OUTBOX_REPOSITORY_TOKEN)
    outboxRepository?: IOutboxRepository,
  ) {
    super(eventBus, outboxRepository, { useOutbox: false });
  }

  protected async persist(
    aggregate: Comment,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      await db.insert(commentsTable).values(persistenceModel);
    } else {
      const result = await db
        .update(commentsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(commentsTable.id, aggregate.id),
            eq(commentsTable.version, expectedVersion),
          ),
        )
        .returning({ id: commentsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  async getById(id: string): Promise<Comment | null> {
    const result = await this.db
      .select()
      .from(commentsTable)
      .where(and(eq(commentsTable.id, id), eq(commentsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  private toPersistence(aggregate: Comment): CommentRecord {
    return {
      id: aggregate.id,
      workLogId: aggregate.workLogId,
      authorId: aggregate.authorId,
      content: aggregate.content,
      version: aggregate.version,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt ?? null,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private toDomain(row: CommentRecord): Comment {
    return Comment.reconstitute(
      row.id,
      {
        workLogId: row.workLogId,
        authorId: row.authorId,
        content: row.content,
      },
      row.version,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    );
  }
}
