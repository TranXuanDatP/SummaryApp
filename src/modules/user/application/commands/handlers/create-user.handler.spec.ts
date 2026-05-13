import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from '../create-user.command';
import { ConflictException } from 'src/libs/core/common';
import { User } from '../../../domain/entities';
import { UserDto } from '../../dtos';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let mockUserRepository: any;
  let mockHashService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockHashService = {
      hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
      compare: jest.fn(),
    };
    handler = new CreateUserHandler(mockUserRepository, mockHashService);
  });

  it('should create a user and return UserDto', async () => {
    const command = new CreateUserCommand(
      'test@example.com',
      'password123',
      'Test User',
      'employee',
    );

    const result = await handler.execute(command);

    expect(result).toBeInstanceOf(UserDto);
    expect(result.email).toBe('test@example.com');
    expect(result.fullName).toBe('Test User');
    expect(result.role).toBe('employee');
    expect(result.isActive).toBe(true);
    expect(result).not.toHaveProperty('password');
    expect(mockHashService.hash).toHaveBeenCalledWith('password123');
    expect(mockUserRepository.save).toHaveBeenCalled();

    const savedUser = mockUserRepository.save.mock.calls[0][0];
    expect(savedUser).toBeInstanceOf(User);
    expect(savedUser.email.value).toBe('test@example.com');
    expect(savedUser.password).toBe('$2b$10$hashedpassword');
  });

  it('should throw ConflictException on duplicate email', async () => {
    const existingUser = {} as User;
    mockUserRepository.findByEmail.mockResolvedValue(existingUser);

    const command = new CreateUserCommand(
      'duplicate@example.com',
      'password123',
      'Dup',
      'employee',
    );

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('should create a manager user', async () => {
    const command = new CreateUserCommand(
      'manager@example.com',
      'password123',
      'Manager User',
      'manager',
    );

    const result = await handler.execute(command);
    expect(result.role).toBe('manager');
  });
});
