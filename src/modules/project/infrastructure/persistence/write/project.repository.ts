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
import { Project } from '../../../domain/entities';
import { IProjectRepository } from '../../../domain/repositories';
import { ProjectId, ProjectStatus } from '../../../domain/value-objects';
import { projectsTable, type ProjectRecord } from '../drizzle/schema';

@Injectable()
export class ProjectRepository
  extends BaseAggregateRepository<Project>
  implements IProjectRepository
{
  private readonly logger = new Logger(ProjectRepository.name);

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
    aggregate: Project,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      await db.insert(projectsTable).values(persistenceModel);
    } else {
      const result = await db
        .update(projectsTable)
        .set(persistenceModel)
        .where(
          and(
            eq(projectsTable.id, aggregate.id),
            eq(projectsTable.version, expectedVersion),
          ),
        )
        .returning({ id: projectsTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  async getById(id: string): Promise<Project | null> {
    const result = await this.db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.id, id), eq(projectsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  async findByName(name: string): Promise<Project | null> {
    const result = await this.db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.name, name), eq(projectsTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  private toPersistence(aggregate: Project): ProjectRecord {
    return {
      id: aggregate.id,
      name: aggregate.name,
      description: aggregate.description,
      status: aggregate.status.value,
      version: aggregate.version,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt ?? null,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private toDomain(row: ProjectRecord): Project {
    return Project.reconstitute(
      row.id,
      {
        name: row.name,
        description: row.description,
        status: new ProjectStatus(row.status),
      },
      row.version,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    );
  }
}
