import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

export interface NotificationSentEventData {
  userId: string;
  type: string;
  title: string;
}

export class NotificationSentEvent extends BaseDomainEvent<NotificationSentEventData> {
  constructor(
    aggregateId: string,
    data: NotificationSentEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Notification', 'NotificationSent', data, metadata);
  }
}
