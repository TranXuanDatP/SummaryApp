import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { IEventBus } from 'src/libs/core/infrastructure';
import {
  EVENT_BUS_TOKEN,
  DATABASE_WRITE_TOKEN,
  type DrizzleDB,
} from 'src/libs/shared';
import { Notification } from '../../../domain/entities';
import { NotificationPreference } from '../../../domain/entities/notification-preference.entity';
import { NotificationType } from '../../../domain/value-objects';
import { NotificationChannel } from '../../../domain/value-objects';
import { INotificationRepository } from '../../../domain/repositories';
import {
  notificationsTable,
  type NotificationRecord,
} from '../drizzle/schema/notification.schema';
import {
  notificationPreferencesTable,
  type NotificationPreferenceRecord,
} from '../drizzle/schema/notification-preference.schema';

@Injectable()
export class NotificationRepository implements INotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
    @Inject(EVENT_BUS_TOKEN) private readonly eventBus: IEventBus,
  ) {}

  async save(notification: Notification): Promise<void> {
    const persistenceModel = this.toNotificationPersistence(notification);

    await this.db.insert(notificationsTable).values(persistenceModel);

    const events = notification.getDomainEvents();
    if (events.length > 0) {
      await Promise.all(events.map((event) => this.eventBus.publish(event)));
      notification.clearDomainEvents();
    }
  }

  async updateReadStatus(id: string, userId: string): Promise<void> {
    await this.db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  }

  async getById(id: string): Promise<Notification | null> {
    const result = await this.db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .limit(1);

    if (result.length === 0) return null;
    return this.toNotificationDomain(result[0]);
  }

  async savePreference(preference: NotificationPreference): Promise<void> {
    const existing = await this.db
      .select()
      .from(notificationPreferencesTable)
      .where(
        and(
          eq(notificationPreferencesTable.userId, preference.userId),
          eq(notificationPreferencesTable.type, preference.type.value),
          eq(notificationPreferencesTable.channel, preference.channel.value),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(notificationPreferencesTable)
        .set({ enabled: preference.enabled, updatedAt: new Date() })
        .where(eq(notificationPreferencesTable.id, existing[0].id));
    } else {
      await this.db
        .insert(notificationPreferencesTable)
        .values(this.toPreferencePersistence(preference));
    }
  }

  private toNotificationPersistence(notification: Notification): NotificationRecord {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type.value,
      title: notification.title,
      content: notification.content,
      actionLink: notification.actionLink,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }

  private toNotificationDomain(row: NotificationRecord): Notification {
    return Notification.reconstitute(
      row.id,
      {
        userId: row.userId,
        type: new NotificationType(row.type),
        title: row.title,
        content: row.content,
        actionLink: row.actionLink,
        isRead: row.isRead,
      },
      row.createdAt,
    );
  }

  private toPreferencePersistence(preference: NotificationPreference): NotificationPreferenceRecord {
    return {
      id: preference.id,
      userId: preference.userId,
      type: preference.type.value,
      channel: preference.channel.value,
      enabled: preference.enabled,
      createdAt: preference.createdAt,
      updatedAt: preference.updatedAt,
    };
  }
}
