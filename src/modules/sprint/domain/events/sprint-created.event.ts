import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface SprintCreatedEventData {
  projectId: string;
  name: string;
  description: string | null;
  status: string;
}

export class SprintCreatedEvent extends BaseDomainEvent<SprintCreatedEventData> {
  constructor(
    aggregateId: string,
    data: SprintCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Sprint', 'SprintCreated', data, metadata);
  }
}
