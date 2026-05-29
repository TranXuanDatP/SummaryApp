import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
  Inject,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from './audit-log.service';
import { REQUEST_CONTEXT_TOKEN } from 'src/libs/core';
import type { IRequestContextProvider } from 'src/libs/core';

export const AUDIT_LOG_KEY = 'audit_log';
export const AuditLog = (action: string, resourceType: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, resourceType });

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'refreshToken',
  'oldPassword',
  'newPassword',
  'confirmPassword',
  'authorization',
  'cookie',
];

function redactSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = redactSensitive(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly contextProvider: IRequestContextProvider,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<{
      action: string;
      resourceType: string;
    }>(AUDIT_LOG_KEY, context.getHandler());

    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const user = (request as any).user;
    const ctx = this.contextProvider.current();

    const payload = request.body ? redactSensitive(request.body) : undefined;
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      '';

    const entry = {
      userId: user?.userId,
      userEmail: user?.email,
      action: meta.action,
      resourceType: meta.resourceType,
      correlationId: ctx?.correlationId,
      ipAddress: ip,
      userAgent: request.headers['user-agent'] || '',
      payload,
    };

    return next.handle().pipe(
      tap((data) => {
        this.auditLogService.log({
          ...entry,
          resourceId: this.extractResourceId(data, request.params),
          result: this.sanitizeResult(data),
          statusCode: response.statusCode || 200,
        });
      }),
      catchError((error) => {
        const status = error?.status || error?.statusCode || 500;
        this.auditLogService.log({
          ...entry,
          resourceId: this.extractResourceId(null, request.params),
          result: { error: error?.message || 'Unknown error' },
          statusCode: status,
        });
        return throwError(() => error);
      }),
    );
  }

  private extractResourceId(data: any, params: any): string | undefined {
    if (params?.id) return params.id;
    if (data?.id) return data.id;
    if (data?.data?.id) return data.data.id;
    return undefined;
  }

  private sanitizeResult(data: any): Record<string, unknown> | undefined {
    if (!data) return undefined;
    if (typeof data !== 'object') return { value: String(data) };

    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof data[key] === 'string' ||
        typeof data[key] === 'number' ||
        typeof data[key] === 'boolean'
      ) {
        sanitized[key] = data[key];
      } else if (Array.isArray(data[key])) {
        sanitized[key] = { count: data[key].length };
      } else if (typeof data[key] === 'object' && data[key] !== null) {
        sanitized[key] = { type: typeof data[key] };
      }
    }
    return sanitized;
  }
}
