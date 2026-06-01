import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface SprintStatusChangedEventData {
  previousStatus: string;
  newStatus: string;
}

export class SprintStatusChangedEvent extends BaseDomainEvent<SprintStatusChangedEventData> {
  constructor(
    aggregateId: string,
    data: SprintStatusChangedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Sprint', 'SprintStatusChanged', data, metadata);
  }
}
