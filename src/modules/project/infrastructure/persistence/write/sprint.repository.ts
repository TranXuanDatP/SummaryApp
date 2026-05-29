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
import { Sprint } from '../../../domain/entities';
import { ISprintRepository } from '../../../domain/repositories';
import { SprintId, SprintStatus } from '../../../domain/value-objects';
import { sprintsTable, type SprintRecord } from '../drizzle/schema';

@Injectable()
export class SprintRepository
  extends BaseAggregateRepository<Sprint>
  implements ISprintRepository
{
  private readonly logger = new Logger(SprintRepository.name);

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
    aggregate: Sprint,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      await db.insert(sprintsTable).values(persistenceModel);
    } else {
      const result = await db
        .update(sprintsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(sprintsTable.id, aggregate.id),
            eq(sprintsTable.version, expectedVersion),
          ),
        )
        .returning({ id: sprintsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  async getById(id: string): Promise<Sprint | null> {
    const result = await this.db
      .select()
      .from(sprintsTable)
      .where(and(eq(sprintsTable.id, id), eq(sprintsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  async findByProjectId(projectId: string): Promise<Sprint[]> {
    const results = await this.db
      .select()
      .from(sprintsTable)
      .where(
        and(
          eq(sprintsTable.projectId, projectId),
          eq(sprintsTable.isDeleted, false),
        ),
      )
      .orderBy(sprintsTable.sortOrder, sprintsTable.createdAt);

    return results.map((row) => this.toDomain(row));
  }

  private toPersistence(aggregate: Sprint): SprintRecord {
    return {
      id: aggregate.id,
      projectId: aggregate.projectId,
      name: aggregate.name,
      description: aggregate.description,
      status: aggregate.status.value,
      startDate: aggregate.startDate,
      endDate: aggregate.endDate,
      sortOrder: aggregate.sortOrder,
      version: aggregate.version,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt ?? null,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private toDomain(row: SprintRecord): Sprint {
    return Sprint.reconstitute(
      row.id,
      {
        projectId: row.projectId,
        name: row.name,
        description: row.description,
        status: new SprintStatus(row.status),
        startDate: row.startDate,
        endDate: row.endDate,
        sortOrder: row.sortOrder,
      },
      row.version,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    );
  }
}
