import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

export interface CommentUpdatedEventData {
  content: string;
}

export class CommentUpdatedEvent extends BaseDomainEvent<CommentUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: CommentUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Comment', 'CommentUpdated', data, metadata);
  }
}
