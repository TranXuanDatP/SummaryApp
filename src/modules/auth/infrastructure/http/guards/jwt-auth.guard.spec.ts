import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UnauthorizedException } from 'src/libs/core/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  describe('canActivate — @Public() bypass', () => {
    it('should return true for public endpoints', () => {
      const mockContext: any = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should check IS_PUBLIC_KEY metadata on both handler and class', () => {
      const mockContext: any = {
        getHandler: jest.fn().mockReturnValue('handler'),
        getClass: jest.fn().mockReturnValue('class'),
      };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      guard.canActivate(mockContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        'handler',
        'class',
      ]);
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException with AUTH_TOKEN_EXPIRED when no user', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
      try {
        guard.handleRequest(null, null);
      } catch (e: any) {
        expect(e.code).toBe('AUTH_TOKEN_EXPIRED');
        expect(e.message).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        expect(e.details).toEqual({ suggestion: 'Vui lòng đăng nhập lại' });
      }
    });

    it('should wrap passport errors in UnauthorizedException', () => {
      const error = new Error('passport error');
      expect(() => guard.handleRequest(error, null)).toThrow(UnauthorizedException);
      try {
        guard.handleRequest(error, null);
      } catch (e: any) {
        expect(e.code).toBe('AUTH_TOKEN_EXPIRED');
      }
    });

    it('should return user when valid', () => {
      const user = { userId: '123', email: 'test@test.com', role: 'employee' };
      expect(guard.handleRequest(null, user)).toBe(user);
    });
  });
});
