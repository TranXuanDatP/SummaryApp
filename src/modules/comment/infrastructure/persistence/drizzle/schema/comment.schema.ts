import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workLogsTable } from '@modules/work-log/infrastructure/persistence/drizzle/schema';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

export const commentsTable = pgTable('comments', {
  id: varchar('id', { length: 50 }).primaryKey(),
  workLogId: varchar('work_log_id', { length: 50 }).notNull(),
  authorId: varchar('author_id', { length: 50 }).notNull(),
  content: text('content').notNull(),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  workLog: one(workLogsTable, {
    fields: [commentsTable.workLogId],
    references: [workLogsTable.id],
  }),
  author: one(usersTable, {
    fields: [commentsTable.authorId],
    references: [usersTable.id],
  }),
}));

export type CommentRecord = typeof commentsTable.$inferSelect;
export type CommentRecordInsert = typeof commentsTable.$inferInsert;
