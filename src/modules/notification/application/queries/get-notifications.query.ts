import { IQuery } from 'src/libs/core/application';
import { NotificationDto } from '../dtos/notification.dto';

export class GetNotificationsQuery extends IQuery<{
  data: NotificationDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {
    super();
  }
}
