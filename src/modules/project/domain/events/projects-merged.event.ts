import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface ProjectsMergedEventData {
  targetProjectId: string;
  sourceProjectIds: string[];
  performedBy: string;
}

export class ProjectsMergedEvent extends BaseDomainEvent<ProjectsMergedEventData> {
  constructor(
    aggregateId: string,
    data: ProjectsMergedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Project', 'ProjectsMerged', data, metadata);
  }
}
