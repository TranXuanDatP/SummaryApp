import { LoginHandler } from './login.handler';
import { LoginCommand } from '../login.command';
import {
  UnauthorizedException,
  ForbiddenException,
} from 'src/libs/core/common';
import { User } from '@modules/user/domain/entities';
import { UserEmail, UserRole } from '@modules/user/domain/value-objects';
import { createHash } from 'crypto';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let mockUserRepository: any;
  let mockHashService: any;
  let mockJwtTokenService: any;
  let mockRefreshTokenRepo: any;

  const createMockUser = (
    overrides: Partial<{
      isActive: boolean;
      email: string;
      password: string;
    }> = {},
  ) => {
    return User.reconstitute(
      'user-123',
      {
        email: new UserEmail(overrides.email ?? 'test@example.com'),
        password: overrides.password ?? '$2b$10$hashedpassword',
        fullName: 'Test User',
        role: new UserRole('employee'),
        isActive: overrides.isActive ?? true,
      },
      1,
      new Date(),
      new Date(),
    );
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    mockHashService = {
      compare: jest.fn().mockResolvedValue(true),
    };
    mockJwtTokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('access-token-123'),
      generateRefreshToken: jest.fn().mockResolvedValue('refresh-token-456'),
    };
    mockRefreshTokenRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    handler = new LoginHandler(
      mockUserRepository,
      mockHashService,
      mockJwtTokenService,
      mockRefreshTokenRepo,
    );
  });

  it('should login successfully with valid credentials', async () => {
    const user = createMockUser();
    mockUserRepository.findByEmail.mockResolvedValue(user);

    const command = new LoginCommand('test@example.com', 'password123');
    const result = await handler.execute(command);

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-456');
    expect(mockHashService.compare).toHaveBeenCalledWith(
      'password123',
      '$2b$10$hashedpassword',
    );
    expect(mockJwtTokenService.generateAccessToken).toHaveBeenCalledWith({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'employee',
    });
    // Token is hashed with sha256 before storage
    const expectedHash = createHash('sha256')
      .update('refresh-token-456')
      .digest('hex');
    expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        tokenHash: expectedHash,
        isRevoked: false,
      }),
    );
  });

  it('should throw AUTH_INVALID_CREDENTIALS when user not found', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const command = new LoginCommand('nonexistent@example.com', 'password123');

    await expect(handler.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('should throw AUTH_INVALID_CREDENTIALS when password is wrong', async () => {
    const user = createMockUser();
    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockHashService.compare.mockResolvedValue(false);

    const command = new LoginCommand('test@example.com', 'wrong-password');

    await expect(handler.execute(command)).rejects.toThrow(
      UnauthorizedException,
    );
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('should throw AUTH_ACCOUNT_DISABLED when user is deactivated', async () => {
    const user = createMockUser({ isActive: false });
    mockUserRepository.findByEmail.mockResolvedValue(user);

    const command = new LoginCommand('test@example.com', 'password123');

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_ACCOUNT_DISABLED');
    }
  });

  it('should hash refresh token with sha256 before storage', async () => {
    const user = createMockUser();
    mockUserRepository.findByEmail.mockResolvedValue(user);

    const command = new LoginCommand('test@example.com', 'password123');
    await handler.execute(command);

    const expectedHash = createHash('sha256')
      .update('refresh-token-456')
      .digest('hex');
    expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: expectedHash }),
    );
  });

  it('should not reveal if user exists vs wrong password', async () => {
    const user = createMockUser();
    mockUserRepository.findByEmail.mockResolvedValue(user);
    mockHashService.compare.mockResolvedValue(false);

    const command = new LoginCommand('test@example.com', 'wrong');

    // User-not-found case
    mockUserRepository.findByEmail.mockResolvedValue(null);
    let error1: any;
    try {
      await handler.execute(command);
    } catch (e) {
      error1 = e;
    }

    // Wrong-password case
    mockUserRepository.findByEmail.mockResolvedValue(user);
    let error2: any;
    try {
      await handler.execute(command);
    } catch (e) {
      error2 = e;
    }

    expect(error1.code).toBe(error2.code);
    expect(error1.code).toBe('AUTH_INVALID_CREDENTIALS');
  });
});
