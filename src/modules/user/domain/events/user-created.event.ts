import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

/**
 * User Created Event Data (Type-safe payload)
 */
export interface UserCreatedEventData {
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

/**
 * User Created Domain Event
 *
 * Published when a new user is created.
 */
export class UserCreatedEvent extends BaseDomainEvent<UserCreatedEventData> {
  constructor(
    aggregateId: string,
    data: UserCreatedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'User', 'UserCreated', data, metadata);
  }
}
