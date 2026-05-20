import {
  pgTable,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

export const notificationPreferencesTable = pgTable('notification_preferences', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const notificationPreferencesRelations = relations(notificationPreferencesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationPreferencesTable.userId],
    references: [usersTable.id],
  }),
}));

export type NotificationPreferenceRecord = typeof notificationPreferencesTable.$inferSelect;
export type NotificationPreferenceRecordInsert = typeof notificationPreferencesTable.$inferInsert;
