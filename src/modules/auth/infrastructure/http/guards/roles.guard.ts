import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from 'src/libs/core/common';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (
        requiredRoles &&
        requiredRoles.length > 0 &&
        process.env.NODE_ENV !== 'production'
      ) {
        throw new Error(
          `Conflicting decorators: @Public() and @Roles(${requiredRoles.join(', ')}) on the same endpoint. ` +
            `Remove @Roles() from public endpoints.`,
        );
      }
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện hành động này.',
        'AUTH_FORBIDDEN_ROLE',
        { suggestion: 'Liên hệ quản trị viên để được cấp quyền' },
      );
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện hành động này. Yêu cầu vai trò: ${requiredRoles.join(' hoặc ')}`,
        'AUTH_FORBIDDEN_ROLE',
        { suggestion: 'Liên hệ quản trị viên để được cấp quyền' },
      );
    }
    return true;
  }
}
