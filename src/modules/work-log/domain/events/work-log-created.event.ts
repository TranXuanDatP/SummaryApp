import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface WorkLogCreatedEventData {
  projectId: string;
  employeeId: string;
  executionDate: string;
  content: string;
}

export class WorkLogCreatedEvent extends BaseDomainEvent<WorkLogCreatedEventData> {
  constructor(
    aggregateId: string,
    data: WorkLogCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'WorkLog', 'WorkLogCreated', data, metadata);
  }
}
