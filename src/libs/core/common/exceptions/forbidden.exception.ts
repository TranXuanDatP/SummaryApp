import { BaseException } from './base.exception';

export class ForbiddenException extends BaseException {
  constructor(
    message: string = 'Không có quyền truy cập',
    code: string = 'FORBIDDEN',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  static insufficientPermissions(
    requiredPermission?: string,
    userId?: string,
  ): ForbiddenException {
    return new ForbiddenException(
      requiredPermission
        ? `Không đủ quyền. Yêu cầu: ${requiredPermission}`
        : 'Không đủ quyền truy cập',
      'INSUFFICIENT_PERMISSIONS',
      {
        requiredPermission,
        userId,
      },
    );
  }

  static insufficientRole(
    requiredRole: string,
    userRole?: string,
  ): ForbiddenException {
    return new ForbiddenException(
      `Không đủ vai trò. Yêu cầu: ${requiredRole}`,
      'INSUFFICIENT_ROLE',
      {
        requiredRole,
        userRole,
      },
    );
  }

  static resourceAccessDenied(
    resourceType: string,
    resourceId?: string,
    userId?: string,
  ): ForbiddenException {
    return new ForbiddenException(
      `Không có quyền truy cập ${resourceType}${resourceId ? ` '${resourceId}'` : ''}`,
      'RESOURCE_ACCESS_DENIED',
      {
        resourceType,
        resourceId,
        userId,
      },
    );
  }
}
