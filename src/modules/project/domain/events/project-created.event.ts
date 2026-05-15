import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface ProjectCreatedEventData {
  name: string;
  description: string | null;
  status: string;
}

export class ProjectCreatedEvent extends BaseDomainEvent<ProjectCreatedEventData> {
  constructor(
    aggregateId: string,
    data: ProjectCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Project', 'ProjectCreated', data, metadata);
  }
}
