import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ForbiddenException } from 'src/libs/core/common';
import { Reflector } from '@nestjs/core';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockRequest = (user?: any) => ({ user });
  const mockContext = (
    user?: any,
    rolesOverride?: any,
    publicOverride?: any,
  ) => {
    const ctx: any = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest(user)),
      }),
    };

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) => {
        if (key === ROLES_KEY) return rolesOverride;
        if (key === IS_PUBLIC_KEY) return publicOverride;
        return undefined;
      });

    return ctx;
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access for public endpoints', () => {
    const ctx = mockContext(undefined, undefined, true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when no roles required', () => {
    const ctx = mockContext(
      { userId: '1', role: 'employee' },
      undefined,
      false,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when empty roles array', () => {
    const ctx = mockContext({ userId: '1', role: 'employee' }, [], false);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const ctx = mockContext(
      { userId: '1', email: 'm@test.com', role: 'manager' },
      ['manager'],
      false,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException with AUTH_FORBIDDEN_ROLE on role mismatch', () => {
    const ctx = mockContext(
      { userId: '1', email: 'e@test.com', role: 'employee' },
      ['manager'],
      false,
    );

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_FORBIDDEN_ROLE');
      expect(e.details).toEqual({
        suggestion: 'Liên hệ quản trị viên để được cấp quyền',
      });
    }
  });

  it('should throw ForbiddenException when no user on role-protected endpoint', () => {
    const ctx = mockContext(undefined, ['manager'], false);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (e: any) {
      expect(e.code).toBe('AUTH_FORBIDDEN_ROLE');
    }
  });

  it('should allow access when user has one of multiple required roles', () => {
    const ctx = mockContext(
      { userId: '1', email: 'e@test.com', role: 'employee' },
      ['manager', 'employee'],
      false,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
