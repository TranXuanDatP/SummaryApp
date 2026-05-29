import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DATABASE_WRITE_TOKEN } from '@core';
import type { DrizzleDB } from 'src/libs/shared';
import { auditLogsTable } from './drizzle/schema/audit-log.schema';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  result?: Record<string, unknown>;
  statusCode?: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(DATABASE_WRITE_TOKEN)
    private readonly db: DrizzleDB,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(auditLogsTable).values({
        id: randomUUID(),
        userId: entry.userId || null,
        userEmail: entry.userEmail || null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId || null,
        correlationId: entry.correlationId || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        payload: entry.payload || null,
        result: entry.result || null,
        statusCode: entry.statusCode || null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
