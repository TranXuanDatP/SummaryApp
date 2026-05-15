import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface ProjectCompletedEventData {
  previousStatus: string;
}

export class ProjectCompletedEvent extends BaseDomainEvent<ProjectCompletedEventData> {
  constructor(
    aggregateId: string,
    data: ProjectCompletedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Project', 'ProjectCompleted', data, metadata);
  }
}
