import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

export const notificationsTable = pgTable('notifications', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  actionLink: varchar('action_link', { length: 500 }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [notificationsTable.userId],
      references: [usersTable.id],
    }),
  }),
);

export type NotificationRecord = typeof notificationsTable.$inferSelect;
export type NotificationRecordInsert = typeof notificationsTable.$inferInsert;
