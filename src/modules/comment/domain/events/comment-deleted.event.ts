import { BaseDomainEvent, type IEventMetadata } from 'src/libs/core/domain';

export interface CommentDeletedEventData {
  deletedAt: string;
}

export class CommentDeletedEvent extends BaseDomainEvent<CommentDeletedEventData> {
  constructor(
    aggregateId: string,
    data: CommentDeletedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Comment', 'CommentDeleted', data, metadata);
  }
}
