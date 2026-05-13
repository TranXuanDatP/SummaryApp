import { UserReactivatedEvent } from './user-reactivated.event';

describe('UserReactivatedEvent', () => {
  it('should create event with correct properties', () => {
    const event = new UserReactivatedEvent('user-123', {});

    expect(event.aggregateId).toBe('user-123');
    expect(event.aggregateType).toBe('User');
    expect(event.eventType).toBe('UserReactivated');
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.eventId).toBeDefined();
  });

  it('should accept optional metadata', () => {
    const metadata = { userId: 'admin-1', correlationId: 'corr-456' };
    const event = new UserReactivatedEvent('user-123', {}, metadata);

    expect(event.metadata).toEqual(metadata);
  });

  it('should be immutable (frozen)', () => {
    const event = new UserReactivatedEvent('user-123', {});

    expect(Object.isFrozen(event)).toBe(true);
  });
});
