import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, count, gte, lt } from 'drizzle-orm';
import {
  BaseReadDao,
  DATABASE_READ_TOKEN,
  type DrizzleDB,
  schema,
} from 'src/libs/shared';
import { NotificationDto } from '../../../application/dtos/notification.dto';
import { NotificationPreferenceDto } from '../../../application/dtos/notification-preference.dto';
import { INotificationReadDao } from '../../../application/queries/ports';
import {
  notificationsTable,
  type NotificationRecord,
} from '../drizzle/schema/notification.schema';
import {
  notificationPreferencesTable,
  type NotificationPreferenceRecord,
} from '../drizzle/schema/notification-preference.schema';

@Injectable()
export class NotificationReadDao
  extends BaseReadDao
  implements INotificationReadDao
{
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

  async findByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<{ data: NotificationDto[]; total: number }> {
    const { userId, page, limit } = params;
    const offset = (page - 1) * limit;

    const whereClause = eq(notificationsTable.userId, userId);

    const [dataResult, countResult] = await Promise.all([
      this.db
        .select()
        .from(notificationsTable)
        .where(whereClause)
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(notificationsTable)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return {
      data: dataResult.map((row) => this.mapToNotificationDto(row)),
      total,
    };
  }

  async findById(id: string, userId: string): Promise<NotificationDto | null> {
    const result = await this.db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.userId, userId),
        ),
      )
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToNotificationDto(result[0]);
  }

  async findPreferencesByUserId(
    userId: string,
  ): Promise<NotificationPreferenceDto[]> {
    const result = await this.db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId));

    return result.map((row) => this.mapToPreferenceDto(row));
  }

  async findPreferenceByUserAndTypeAndChannel(
    userId: string,
    type: string,
    channel: string,
  ): Promise<NotificationPreferenceDto | null> {
    const result = await this.db
      .select()
      .from(notificationPreferencesTable)
      .where(
        and(
          eq(notificationPreferencesTable.userId, userId),
          eq(notificationPreferencesTable.type, type),
          eq(notificationPreferencesTable.channel, channel),
        ),
      )
      .limit(1);

    if (result.length === 0) return null;
    return this.mapToPreferenceDto(result[0]);
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );

    return Number(result[0]?.count ?? 0);
  }

  async existsByUserIdAndTypeAndDate(
    userId: string,
    type: string,
    date: Date,
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setDate(startOfNextDay.getDate() + 1);

    const result = await this.db
      .select({ count: count() })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.type, type),
          gte(notificationsTable.createdAt, startOfDay),
          lt(notificationsTable.createdAt, startOfNextDay),
        ),
      );

    return Number(result[0]?.count ?? 0) > 0;
  }

  private mapToNotificationDto(row: NotificationRecord): NotificationDto {
    return new NotificationDto({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      actionLink: row.actionLink,
      isRead: row.isRead,
      createdAt: row.createdAt,
    });
  }

  private mapToPreferenceDto(
    row: NotificationPreferenceRecord,
  ): NotificationPreferenceDto {
    return new NotificationPreferenceDto({
      id: row.id,
      type: row.type,
      channel: row.channel,
      enabled: row.enabled,
    });
  }
}
