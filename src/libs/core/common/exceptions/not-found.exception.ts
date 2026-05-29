import { BaseException } from './base.exception';

export class NotFoundException extends BaseException {
  constructor(
    message: string = 'Không tìm thấy tài nguyên',
    code: string = 'NOT_FOUND',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  static resource(
    resourceType: string,
    resourceId?: string,
    options?: { suggestion?: string },
  ): NotFoundException {
    const message = resourceId
      ? `Không tìm thấy ${resourceType} với id '${resourceId}'`
      : `Không tìm thấy ${resourceType}`;
    return new NotFoundException(
      message,
      `${resourceType.toUpperCase()}_NOT_FOUND`,
      {
        resourceType,
        resourceId,
        ...(options?.suggestion && { suggestion: options.suggestion }),
      },
    );
  }

  static entity(
    entityName: string,
    entityId: string,
    options?: { suggestion?: string },
  ): NotFoundException {
    return NotFoundException.resource(entityName, entityId, options);
  }
}
