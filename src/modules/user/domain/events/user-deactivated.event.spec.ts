import { UserDeactivatedEvent } from './user-deactivated.event';

describe('UserDeactivatedEvent', () => {
  it('should create event with correct properties', () => {
    const data = { deactivatedBy: 'admin-1' };

    const event = new UserDeactivatedEvent('user-123', data);

    expect(event.aggregateId).toBe('user-123');
    expect(event.aggregateType).toBe('User');
    expect(event.eventType).toBe('UserDeactivated');
    expect(event.data).toEqual(data);
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.eventId).toBeDefined();
  });

  it('should work without deactivatedBy', () => {
    const event = new UserDeactivatedEvent('user-123', {});

    expect(event.data.deactivatedBy).toBeUndefined();
  });

  it('should accept optional metadata', () => {
    const metadata = { correlationId: 'corr-456' };
    const event = new UserDeactivatedEvent(
      'user-123',
      { deactivatedBy: 'admin-1' },
      metadata,
    );

    expect(event.metadata).toEqual(metadata);
  });

  it('should be immutable (frozen)', () => {
    const event = new UserDeactivatedEvent('user-123', {
      deactivatedBy: 'admin-1',
    });

    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.data)).toBe(true);
  });
});
