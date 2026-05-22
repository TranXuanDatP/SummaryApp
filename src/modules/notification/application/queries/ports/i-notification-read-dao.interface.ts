import { NotificationDto } from '../../dtos/notification.dto';
import { NotificationPreferenceDto } from '../../dtos/notification-preference.dto';

export interface INotificationReadDao {
  findByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<{ data: NotificationDto[]; total: number }>;

  findById(id: string, userId: string): Promise<NotificationDto | null>;

  findPreferencesByUserId(userId: string): Promise<NotificationPreferenceDto[]>;

  findPreferenceByUserAndTypeAndChannel(
    userId: string,
    type: string,
    channel: string,
  ): Promise<NotificationPreferenceDto | null>;

  countUnreadByUserId(userId: string): Promise<number>;

  existsByUserIdAndTypeAndDate(
    userId: string,
    type: string,
    date: Date,
  ): Promise<boolean>;
}
