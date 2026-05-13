import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * User Deactivated Event Data (Type-safe payload)
 */
export interface UserDeactivatedEventData {
  deactivatedBy?: string;
}

/**
 * User Deactivated Domain Event
 *
 * Published when a user is deactivated (isActive = false).
 */
export class UserDeactivatedEvent extends BaseDomainEvent<UserDeactivatedEventData> {
  constructor(
    aggregateId: string,
    data: UserDeactivatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'User', 'UserDeactivated', data, metadata);
  }
}
