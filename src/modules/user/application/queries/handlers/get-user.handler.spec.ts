import { GetUserHandler } from './get-user.handler';
import { GetUserQuery } from '../get-user.query';
import { NotFoundException } from 'src/libs/core/common';
import { UserDto } from '../../dtos';

describe('GetUserHandler', () => {
  let handler: GetUserHandler;
  let mockUserReadDao: any;

  beforeEach(() => {
    mockUserReadDao = {
      findById: jest.fn(),
    };
    handler = new GetUserHandler(mockUserReadDao);
  });

  it('should return UserDto when user found', async () => {
    const userDto = new UserDto({
      id: 'test-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'employee',
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockUserReadDao.findById.mockResolvedValue(userDto);

    const result = await handler.execute(new GetUserQuery('test-id'));
    expect(result).toBe(userDto);
    expect((result as any).password).toBeUndefined();
  });

  it('should throw NotFoundException when user not found', async () => {
    mockUserReadDao.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new GetUserQuery('nonexistent')),
    ).rejects.toThrow(NotFoundException);
  });
});
