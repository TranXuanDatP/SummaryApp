import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import { sprintsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

// Unique constraint: (project_id, employee_id, execution_date, is_deleted)
// Enforced at DB level in a future migration to prevent duplicate WorkLog entries (C-3)

export const workLogsTable = pgTable('work_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  projectId: varchar('project_id', { length: 50 }).notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  sprintId: varchar('sprint_id', { length: 50 }),
  executionDate: timestamp('execution_date').notNull(),
  content: text('content').notNull(),
  workType: varchar('work_type', { length: 30 }),
  status: varchar('status', { length: 20 }).notNull().default('in_progress'),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  unlockedBy: varchar('unlocked_by', { length: 50 }),
  unlockedAt: timestamp('unlocked_at'),
  unlockReason: text('unlock_reason'),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workLogsRelations = relations(workLogsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [workLogsTable.projectId],
    references: [projectsTable.id],
  }),
  sprint: one(sprintsTable, {
    fields: [workLogsTable.sprintId],
    references: [sprintsTable.id],
  }),
  employee: one(usersTable, {
    fields: [workLogsTable.employeeId],
    references: [usersTable.id],
  }),
}));

export type WorkLogRecord = typeof workLogsTable.$inferSelect;
export type WorkLogRecordInsert = typeof workLogsTable.$inferInsert;
