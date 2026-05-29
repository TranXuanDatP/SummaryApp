import { BaseException } from './base.exception';

export class ConflictException extends BaseException {
  constructor(
    message: string = 'Xung đột tài nguyên',
    code: string = 'CONFLICT',
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }

  static duplicate(
    resourceType: string,
    field?: string,
    value?: string,
    options?: { code?: string; suggestion?: string },
  ): ConflictException {
    const message = field
      ? `${resourceType} với ${field} '${value}' đã tồn tại`
      : `${resourceType} đã tồn tại`;
    return new ConflictException(
      message,
      options?.code ?? 'DUPLICATE_RESOURCE',
      {
        resourceType,
        field,
        value,
        ...(options?.suggestion && { suggestion: options.suggestion }),
      },
    );
  }

  static invalidState(
    resourceType: string,
    currentState: string,
    requiredState?: string,
  ): ConflictException {
    const message = requiredState
      ? `${resourceType} đang ở trạng thái '${currentState}', yêu cầu '${requiredState}'`
      : `${resourceType} đang ở trạng thái không hợp lệ: ${currentState}`;
    return new ConflictException(message, 'INVALID_STATE', {
      resourceType,
      currentState,
      requiredState,
    });
  }

  static versionConflict(
    resourceType: string,
    resourceId: string,
    expectedVersion: number,
    actualVersion: number,
  ): ConflictException {
    return new ConflictException(
      `${resourceType} '${resourceId}' xung đột phiên bản: kỳ vọng ${expectedVersion}, thực tế ${actualVersion}`,
      'VERSION_CONFLICT',
      {
        resourceType,
        resourceId,
        expectedVersion,
        actualVersion,
      },
    );
  }
}
