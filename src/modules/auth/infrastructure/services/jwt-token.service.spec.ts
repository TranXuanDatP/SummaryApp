import { JwtTokenService } from './jwt-token.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt-token'),
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'employee',
        iat: 1234567890,
        exp: 1234567890 + 900,
      }),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };
    service = new JwtTokenService(mockJwtService, mockConfigService);
  });

  it('should generate access token with 15m expiry', async () => {
    const token = await service.generateAccessToken({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'employee',
    });

    expect(token).toBe('signed-jwt-token');
    expect(mockJwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'user-123', email: 'test@example.com', role: 'employee' },
      { secret: 'test-secret', expiresIn: '15m' },
    );
  });

  it('should generate a random refresh token', async () => {
    const token1 = await service.generateRefreshToken();
    const token2 = await service.generateRefreshToken();

    expect(typeof token1).toBe('string');
    expect(token1.length).toBe(128); // 64 bytes = 128 hex chars
    expect(token1).not.toBe(token2);
  });

  it('should verify access token', async () => {
    const payload = await service.verifyAccessToken('valid-token');

    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
    expect(payload.role).toBe('employee');
    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });
  });

  it('should use JWT_SECRET from config', () => {
    expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
  });
});
