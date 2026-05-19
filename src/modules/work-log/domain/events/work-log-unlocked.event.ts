import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface WorkLogUnlockedEventData {
  unlockedBy: string;
  unlockedAt: string;
  unlockReason: string;
}

export class WorkLogUnlockedEvent extends BaseDomainEvent<WorkLogUnlockedEventData> {
  constructor(
    aggregateId: string,
    data: WorkLogUnlockedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'WorkLog', 'WorkLogUnlocked', data, metadata);
  }
}
