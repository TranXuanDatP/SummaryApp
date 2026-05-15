import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface ProjectUpdatedEventData {
  name?: string;
  description?: string | null;
}

export class ProjectUpdatedEvent extends BaseDomainEvent<ProjectUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: ProjectUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Project', 'ProjectUpdated', data, metadata);
  }
}
