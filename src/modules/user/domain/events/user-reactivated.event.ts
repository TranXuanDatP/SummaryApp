import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * User Reactivated Event Data (Type-safe payload)
 */
export interface UserReactivatedEventData {}

/**
 * User Reactivated Domain Event
 *
 * Published when a user is reactivated (isActive = true).
 */
export class UserReactivatedEvent extends BaseDomainEvent<UserReactivatedEventData> {
  constructor(
    aggregateId: string,
    data: UserReactivatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'User', 'UserReactivated', data, metadata);
  }
}
