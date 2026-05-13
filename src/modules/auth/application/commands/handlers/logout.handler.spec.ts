import { LogoutHandler } from './logout.handler';
import { LogoutCommand } from '../logout.command';
import { UnauthorizedException } from 'src/libs/core/common';
import { createHash } from 'crypto';

describe('LogoutHandler', () => {
  let handler: LogoutHandler;
  let mockRefreshTokenRepo: any;

  const validTokenRecord = {
    id: 'token-123',
    userId: 'user-123',
    tokenHash: createHash('sha256').update('valid-refresh-token').digest('hex'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockRefreshTokenRepo = {
      findByTokenHash: jest.fn().mockResolvedValue(validTokenRecord),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    handler = new LogoutHandler(mockRefreshTokenRepo);
  });

  it('should revoke a valid refresh token', async () => {
    const command = new LogoutCommand('valid-refresh-token');
    await handler.execute(command);

    const expectedHash = createHash('sha256').update('valid-refresh-token').digest('hex');
    expect(mockRefreshTokenRepo.findByTokenHash).toHaveBeenCalledWith(expectedHash);
    expect(mockRefreshTokenRepo.revoke).toHaveBeenCalledWith('token-123');
  });

  it('should throw AUTH_REFRESH_EXPIRED when token not found', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue(null);

    const command = new LogoutCommand('unknown-token');

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_REFRESH_EXPIRED');
    }
    expect(mockRefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });

  it('should throw AUTH_REFRESH_EXPIRED when token already revoked', async () => {
    mockRefreshTokenRepo.findByTokenHash.mockResolvedValue({
      ...validTokenRecord,
      isRevoked: true,
    });

    const command = new LogoutCommand('revoked-token');

    await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    try {
      await handler.execute(command);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_REFRESH_EXPIRED');
    }
    expect(mockRefreshTokenRepo.revoke).not.toHaveBeenCalled();
  });

  it('should hash the incoming token with sha256 for lookup', async () => {
    const command = new LogoutCommand('my-refresh-token');
    await handler.execute(command);

    const expectedHash = createHash('sha256').update('my-refresh-token').digest('hex');
    expect(mockRefreshTokenRepo.findByTokenHash).toHaveBeenCalledWith(expectedHash);
  });
});
