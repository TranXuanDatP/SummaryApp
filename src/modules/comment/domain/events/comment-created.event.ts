import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

export interface CommentCreatedEventData {
  workLogId: string;
  authorId: string;
  content: string;
}

export class CommentCreatedEvent extends BaseDomainEvent<CommentCreatedEventData> {
  constructor(
    aggregateId: string,
    data: CommentCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Comment', 'CommentCreated', data, metadata);
  }
}
