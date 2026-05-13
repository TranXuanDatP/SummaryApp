import { RefreshTokenHandler } from './refresh-token.handler';
import { RefreshTokenCommand } from '../refresh-token.command';
import { UnauthorizedException, ForbiddenException } from 'src/libs/core/common';
import { User } from '@modules/user/domain/entities';
import { UserEmail, UserRole } from '@modules/user/domain/value-objects';
import { createHash } from 'crypto';

describe('RefreshTokenHandler', () => {
  let handler: RefreshTokenHandler;
  let mockUserRepository: any;
  let mockJwtTokenService: any;
  let mockRefreshTokenRepo: any;

  const createMockUser = (overrides: Partial<{ isActive: boolean }> = {}) => {
    return User.reconstitute(
      'user-123',
      {
        email: new UserEmail('test@example.com'),
        password: '$2b$10$hashedpassword',
        fullName: 'Test User',
        role: new UserRole('employee'),
        isActive: overrides.isActive ?? true,
      },
      1,
      new Date(),
      new Date(),
    );
  };

  const validTokenRecord = {
    id: 'token-123',
    userId: 'user-123',
    tokenHash: createHash('sha256').update('valid-refresh-token').digest('hex'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      getById: jest.fn().mockResolvedValue(createMockUser()),
    };
    mockJwtTokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('new-access-token'),
      generateRefreshToken: jest.fn().mockResolvedValue('new-refresh-token'),
    };
    mockRefreshTokenRepo = {
      findAndRevokeByTokenHash: jest.fn().mockResolvedValue(validTokenRecord),
      findByTokenHash: jest.fn().mockResolvedValue(validTokenRecord),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
      revoke: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    handler = new RefreshTokenHandler(
      mockUserRepository,
      mockJwtTokenService,
      mockRefreshTokenRepo,
    );
  });

  it('should refresh token successfully with rotation', async () => {
    const command = new RefreshTokenCommand('valid-refresh-token');
    const result = await handler.execute(command);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(mockJwtTokenService.generateAccessToken).toHaveBeenCalledWith({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'employee',
    });
    // Atomic findAndRevoke should be called (not separate revoke)
    expect(mockRefreshTokenRepo.findAndRevokeByTokenHash).toHaveBeenCalled();
    expect(mockRefreshTokenRepo.revoke).not.toHaveBeenCalled();
    // New token should be saved
    const newTokenHash = createHash('sha256').update('new-refresh-token').digest('hex');
    expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        tokenHash: newTokenHash,
        isRevoked: false,
      }),
    );
  });

  it('should throw AUTH_REFRESH_EXPIRED when token not found', async () => {
    mockRefreshTokenRepo.findAndRevokeByTokenHash.mockResolvedValue(null);

    const command = new RefreshTokenCommand('unknown-token');

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_REFRESH_EXPIRED');
    }
  });

  it('should throw AUTH_REFRESH_EXPIRED when token already revoked (atomic returns null)', async () => {
    mockRefreshTokenRepo.findAndRevokeByTokenHash.mockResolvedValue(null);

    const command = new RefreshTokenCommand('revoked-token');

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_REFRESH_EXPIRED');
    }
  });

  it('should throw AUTH_REFRESH_EXPIRED when token is expired', async () => {
    mockRefreshTokenRepo.findAndRevokeByTokenHash.mockResolvedValue({
      ...validTokenRecord,
      expiresAt: new Date(Date.now() - 1000),
    });

    const command = new RefreshTokenCommand('expired-token');

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw AUTH_ACCOUNT_DISABLED when user is deactivated', async () => {
    mockUserRepository.getById.mockResolvedValue(createMockUser({ isActive: false }));

    const command = new RefreshTokenCommand('valid-refresh-token');

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_ACCOUNT_DISABLED');
    }
    expect(mockRefreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith('user-123');
  });

  it('should throw AUTH_ACCOUNT_DISABLED when user is null and revoke all tokens', async () => {
    mockUserRepository.getById.mockResolvedValue(null);

    const command = new RefreshTokenCommand('valid-refresh-token');

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(mockRefreshTokenRepo.revokeAllForUser).toHaveBeenCalledWith('user-123');
  });

  it('should hash the incoming refresh token with sha256 for lookup', async () => {
    const command = new RefreshTokenCommand('valid-refresh-token');
    await handler.execute(command);

    const expectedHash = createHash('sha256').update('valid-refresh-token').digest('hex');
    expect(mockRefreshTokenRepo.findAndRevokeByTokenHash).toHaveBeenCalledWith(expectedHash);
  });

  it('should use atomic findAndRevokeByTokenHash to prevent race conditions', async () => {
    const command = new RefreshTokenCommand('valid-refresh-token');
    await handler.execute(command);

    // Atomic operation handles both find and revoke in one DB call
    expect(mockRefreshTokenRepo.findAndRevokeByTokenHash).toHaveBeenCalledTimes(1);
    expect(mockRefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });
});
