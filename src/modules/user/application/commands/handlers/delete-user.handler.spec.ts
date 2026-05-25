import { DeleteUserHandler } from './delete-user.handler';
import { DeleteUserCommand } from '../delete-user.command';
import { NotFoundException } from 'src/libs/core/common';
import { User } from '../../../domain/entities';
import { UserId, UserEmail, UserRole } from '../../../domain/value-objects';

function createUser(overrides: { id?: string; isActive?: boolean } = {}): User {
  return User.reconstitute(
    overrides.id ?? 'user-1',
    {
      email: new UserEmail('test@example.com'),
      password: 'hashed',
      fullName: 'Test User',
      role: new UserRole('employee'),
      isActive: overrides.isActive ?? true,
    },
    1,
    new Date('2026-01-01'),
    new Date('2026-01-01'),
    null,
  );
}

describe('DeleteUserHandler', () => {
  let handler: DeleteUserHandler;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockImplementation((agg: any) => {
        agg.incrementVersion();
        return Promise.resolve(agg);
      }),
      getById: jest.fn(),
    };
    handler = new DeleteUserHandler(mockRepository);
  });

  it('should soft delete an existing user', async () => {
    const user = createUser();
    mockRepository.getById.mockResolvedValue(user);

    const result = await handler.execute(new DeleteUserCommand('user-1'));

    expect(result).toEqual({ deleted: true, id: 'user-1' });
    expect(mockRepository.save).toHaveBeenCalled();
    const savedUser = mockRepository.save.mock.calls[0][0];
    expect(savedUser.isDeleted).toBe(true);
  });

  it('should throw NotFoundException when user does not exist', async () => {
    mockRepository.getById.mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteUserCommand('nonexistent')),
    ).rejects.toThrow(NotFoundException);
  });

  it('should be idempotent when user is already deleted', async () => {
    const user = createUser();
    user.delete();
    mockRepository.getById.mockResolvedValue(user);

    const result = await handler.execute(new DeleteUserCommand('user-1'));

    expect(result).toEqual({ deleted: true, id: 'user-1' });
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
