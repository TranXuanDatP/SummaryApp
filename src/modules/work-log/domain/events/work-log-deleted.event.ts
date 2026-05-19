import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface WorkLogDeletedEventData {
  deletedAt: string;
}

export class WorkLogDeletedEvent extends BaseDomainEvent<WorkLogDeletedEventData> {
  constructor(
    aggregateId: string,
    data: WorkLogDeletedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'WorkLog', 'WorkLogDeleted', data, metadata);
  }
}
