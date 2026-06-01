import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface SprintUpdatedEventData {
  name?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder?: number;
}

export class SprintUpdatedEvent extends BaseDomainEvent<SprintUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: SprintUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Sprint', 'SprintUpdated', data, metadata);
  }
}
