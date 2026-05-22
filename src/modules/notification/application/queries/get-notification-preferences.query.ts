import { IQuery } from 'src/libs/core/application';
import { NotificationPreferenceDto } from '../dtos/notification-preference.dto';

export class GetNotificationPreferencesQuery extends IQuery<NotificationPreferenceDto[]> {
  constructor(
    public readonly userId: string,
  ) {
    super();
  }
}
