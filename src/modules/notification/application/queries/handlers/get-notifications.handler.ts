import { Inject } from '@nestjs/common';
import { IQueryHandler } from 'src/libs/core/application';
import { QueryHandler } from 'src/libs/shared/cqrs';
import { GetNotificationsQuery } from '../get-notifications.query';
import { NotificationDto } from '../../dtos/notification.dto';
import { NOTIFICATION_READ_DAO_TOKEN } from '../../../constants/tokens';
import type { INotificationReadDao } from '../ports';

@QueryHandler(GetNotificationsQuery)
export class GetNotificationsHandler implements IQueryHandler<
  GetNotificationsQuery,
  { data: NotificationDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(NOTIFICATION_READ_DAO_TOKEN)
    private readonly readDao: INotificationReadDao,
  ) {}

  async execute(query: GetNotificationsQuery): Promise<{
    data: NotificationDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.readDao.findByUserId({
      userId: query.userId,
      page: query.page,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
