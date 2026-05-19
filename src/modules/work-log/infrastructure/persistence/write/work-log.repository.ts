import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { IEventBus, IOutboxRepository } from 'src/libs/core/infrastructure';
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
import { WorkLog } from '../../../domain/entities';
import { IWorkLogRepository } from '../../../domain/repositories';
import { workLogsTable, type WorkLogRecord } from '../drizzle/schema';

@Injectable()
export class WorkLogRepository
  extends BaseAggregateRepository<WorkLog>
  implements IWorkLogRepository
{
  private readonly logger = new Logger(WorkLogRepository.name);

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
    aggregate: WorkLog,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      await db.insert(workLogsTable).values(persistenceModel);
    } else {
      const result = await db
        .update(workLogsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(workLogsTable.id, aggregate.id),
            eq(workLogsTable.version, expectedVersion),
          ),
        )
        .returning({ id: workLogsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  async getById(id: string): Promise<WorkLog | null> {
    const result = await this.db
      .select()
      .from(workLogsTable)
      .where(and(eq(workLogsTable.id, id), eq(workLogsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  private toPersistence(aggregate: WorkLog): WorkLogRecord {
    return {
      id: aggregate.id,
      projectId: aggregate.projectId,
      employeeId: aggregate.employeeId,
      executionDate: aggregate.executionDate,
      content: aggregate.content,
      isUnlocked: aggregate.isUnlocked,
      unlockedBy: aggregate.unlockedBy,
      unlockedAt: aggregate.unlockedAt,
      unlockReason: aggregate.unlockReason,
      version: aggregate.version,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt ?? null,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private toDomain(row: WorkLogRecord): WorkLog {
    return WorkLog.reconstitute(
      row.id,
      {
        projectId: row.projectId,
        employeeId: row.employeeId,
        executionDate: row.executionDate,
        content: row.content,
        isUnlocked: row.isUnlocked,
        unlockedBy: row.unlockedBy,
        unlockedAt: row.unlockedAt,
        unlockReason: row.unlockReason,
      },
      row.version,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    );
  }
}
