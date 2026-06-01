import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface WorkLogUpdatedEventData {
  content?: string;
  status?: string;
  sprintId?: string | null;
  workType?: string | null;
}

export class WorkLogUpdatedEvent extends BaseDomainEvent<WorkLogUpdatedEventData> {
  constructor(
    aggregateId: string,
    data: WorkLogUpdatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'WorkLog', 'WorkLogUpdated', data, metadata);
  }
}
