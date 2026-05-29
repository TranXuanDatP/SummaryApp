import { BaseException } from './base.exception';

export class UnauthorizedException extends BaseException {
  constructor(
    message: string = 'Chưa xác thực',
    code: string = 'UNAUTHORIZED',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  static missingToken(): UnauthorizedException {
    return new UnauthorizedException(
      'Yêu cầu token xác thực',
      'MISSING_TOKEN',
    );
  }

  static invalidToken(reason?: string): UnauthorizedException {
    return new UnauthorizedException(
      reason || 'Token xác thực không hợp lệ',
      'INVALID_TOKEN',
      { reason },
    );
  }

  static expiredToken(): UnauthorizedException {
    return new UnauthorizedException(
      'Token xác thực đã hết hạn',
      'TOKEN_EXPIRED',
    );
  }
}
