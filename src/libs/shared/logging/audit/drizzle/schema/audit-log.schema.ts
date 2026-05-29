import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const auditLogsTable = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 50 }),
    userEmail: varchar('user_email', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: varchar('resource_id', { length: 50 }),
    correlationId: varchar('correlation_id', { length: 36 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    payload: jsonb('payload'),
    result: jsonb('result'),
    statusCode: integer('status_code'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_audit_logs_user').on(table.userId),
    index('idx_audit_logs_resource').on(table.resourceType, table.resourceId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_created').on(table.createdAt),
  ],
);

export type AuditLogRecord = typeof auditLogsTable.$inferSelect;
export type AuditLogRecordInsert = typeof auditLogsTable.$inferInsert;
