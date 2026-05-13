import { DeactivateUserHandler } from './deactivate-user.handler';
import { DeactivateUserCommand } from '../deactivate-user.command';
import { NotFoundException } from 'src/libs/core/common';
import { User } from '../../../domain/entities';
import { UserId, UserEmail, UserRole } from '../../../domain/value-objects';

describe('DeactivateUserHandler', () => {
  let handler: DeactivateUserHandler;
  let mockUserRepository: any;

  function createTestUser(): User {
    return User.create(
      new UserId('test-id'),
      {
        email: new UserEmail('test@example.com'),
        password: 'hashedpassword',
        fullName: 'Test User',
        role: new UserRole('employee'),
      },
    );
  }

  beforeEach(() => {
    mockUserRepository = {
      getById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    handler = new DeactivateUserHandler(mockUserRepository);
  });

  it('should deactivate a user and return updated DTO', async () => {
    const user = createTestUser();
    mockUserRepository.getById.mockResolvedValue(user);

    const result = await handler.execute(
      new DeactivateUserCommand('test-id'),
    );

    expect(result.isActive).toBe(false);
    expect(result.id).toBe('test-id');
    expect((result as any).password).toBeUndefined();
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException when user not found', async () => {
    mockUserRepository.getById.mockResolvedValue(null);

    await expect(
      handler.execute(new DeactivateUserCommand('nonexistent')),
    ).rejects.toThrow(NotFoundException);

    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('should emit UserDeactivatedEvent', async () => {
    const user = createTestUser();
    mockUserRepository.getById.mockResolvedValue(user);

    await handler.execute(new DeactivateUserCommand('test-id'));

    const savedUser = mockUserRepository.save.mock.calls[0][0];
    const events = savedUser.getDomainEvents();
    expect(events.some((e: any) => e.eventType === 'UserDeactivated')).toBe(true);
  });
});
