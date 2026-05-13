import { UserCreatedEvent } from './user-created.event';

describe('UserCreatedEvent', () => {
  it('should create event with correct properties', () => {
    const data = {
      email: 'user@example.com',
      fullName: 'John Doe',
      role: 'employee',
      isActive: true,
    };

    const event = new UserCreatedEvent('user-123', data);

    expect(event.aggregateId).toBe('user-123');
    expect(event.aggregateType).toBe('User');
    expect(event.eventType).toBe('UserCreated');
    expect(event.data).toEqual(data);
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.eventId).toBeDefined();
  });

  it('should accept optional metadata', () => {
    const metadata = { userId: 'admin-1', correlationId: 'corr-123' };
    const event = new UserCreatedEvent(
      'user-123',
      { email: 'user@example.com', fullName: 'John', role: 'manager', isActive: true },
      metadata,
    );

    expect(event.metadata).toEqual(metadata);
  });

  it('should be immutable (frozen)', () => {
    const event = new UserCreatedEvent('user-123', {
      email: 'user@example.com',
      fullName: 'John',
      role: 'employee',
      isActive: true,
    });

    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.data)).toBe(true);
  });
});
