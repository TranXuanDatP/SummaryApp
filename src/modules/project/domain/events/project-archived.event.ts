import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface ProjectArchivedEventData {
  previousStatus: string;
}

export class ProjectArchivedEvent extends BaseDomainEvent<ProjectArchivedEventData> {
  constructor(
    aggregateId: string,
    data: ProjectArchivedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Project', 'ProjectArchived', data, metadata);
  }
}
