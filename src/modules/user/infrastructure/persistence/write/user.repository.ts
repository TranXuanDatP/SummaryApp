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
import { User } from '../../../domain/entities';
import { IUserRepository } from '../../../domain/repositories';
import { UserEmail, UserId, UserRole } from '../../../domain/value-objects';
import { usersTable, type UserRecord } from '../drizzle/schema';

@Injectable()
export class UserRepository
  extends BaseAggregateRepository<User>
  implements IUserRepository
{
  private readonly logger = new Logger(UserRepository.name);

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
    aggregate: User,
    expectedVersion: number,
    options?: SaveOptions,
  ): Promise<void> {
    const db = (options?.transaction as DrizzleTransaction) || this.db;
    const persistenceModel = this.toPersistence(aggregate);

    if (expectedVersion === 0) {
      await db.insert(usersTable).values(persistenceModel);
    } else {
      const result = await db
        .update(usersTable)
        .set(persistenceModel)
        .where(
          and(
            eq(usersTable.id, aggregate.id),
            eq(usersTable.version, expectedVersion),
          ),
        )
        .returning({ id: usersTable.id });

      if (result.length === 0) {
        throw ConcurrencyException.versionMismatch(
          aggregate.id,
          expectedVersion,
          aggregate.version,
        );
      }
    }
  }

  async getById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, id), eq(usersTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.isDeleted, false)))
      .limit(1);

    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(usersTable).where(eq(usersTable.id, id));
  }

  private toPersistence(aggregate: User): UserRecord {
    return {
      id: aggregate.id,
      email: aggregate.email.value,
      password: aggregate.password,
      fullName: aggregate.fullName,
      role: aggregate.role.value,
      isActive: aggregate.isActive,
      version: aggregate.version,
      isDeleted: aggregate.isDeleted,
      deletedAt: aggregate.deletedAt ?? null,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  private toDomain(row: UserRecord): User {
    return User.reconstitute(
      row.id,
      {
        email: new UserEmail(row.email),
        password: row.password,
        fullName: row.fullName,
        role: new UserRole(row.role),
        isActive: row.isActive,
      },
      row.version,
      row.createdAt,
      row.updatedAt,
      row.deletedAt,
    );
  }
}
