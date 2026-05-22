import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetNotificationPreferencesQuery } from '../get-notification-preferences.query';
import { NotificationPreferenceDto } from '../../dtos/notification-preference.dto';
import { NOTIFICATION_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { INotificationReadDao } from '../ports';
import { NotificationType } from '../../../domain/value-objects/notification-type.value-object';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.value-object';

const EMAIL_ENABLED_BY_DEFAULT = new Set([
  'daily_work_log_reminder',
  'weekly_summary',
  'monthly_report_ready',
  'comment_received',
]);

@QueryHandler(GetNotificationPreferencesQuery)
export class GetNotificationPreferencesHandler implements IQueryHandler<
  GetNotificationPreferencesQuery,
  NotificationPreferenceDto[]
> {
  constructor(
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly readDao: INotificationReadDao,
  ) {}

  async execute(query: GetNotificationPreferencesQuery): Promise<NotificationPreferenceDto[]> {
    const savedPreferences = await this.readDao.findPreferencesByUserId(query.userId);

    const savedMap = new Map<string, NotificationPreferenceDto>();
    for (const pref of savedPreferences) {
      savedMap.set(`${pref.type}:${pref.channel}`, pref);
    }

    const result: NotificationPreferenceDto[] = [];

    for (const type of NotificationType.VALID_TYPES) {
      for (const channel of NotificationChannel.VALID_CHANNELS) {
        const key = `${type}:${channel}`;
        const saved = savedMap.get(key);
        if (saved) {
          result.push(saved);
        } else {
          const defaultEnabled = channel === 'in_app'
            || EMAIL_ENABLED_BY_DEFAULT.has(type);
          result.push(new NotificationPreferenceDto({
            id: '',
            type,
            channel,
            enabled: defaultEnabled,
          }));
        }
      }
    }

    return result;
  }
}
