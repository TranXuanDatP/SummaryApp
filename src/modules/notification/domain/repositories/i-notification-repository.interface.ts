import type { Notification } from '../entities';
import type { NotificationPreference } from '../entities/notification-preference.entity';

export interface INotificationRepository {
  save(notification: Notification): Promise<void>;
  getById(id: string): Promise<Notification | null>;
  updateReadStatus(id: string, userId: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  savePreference(preference: NotificationPreference): Promise<void>;
}
