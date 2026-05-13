import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * Users Table Schema (Drizzle ORM)
 *
 * This schema represents the write model for User aggregate.
 */
export const usersTable = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type UserRecord = typeof usersTable.$inferSelect;
export type UserRecordInsert = typeof usersTable.$inferInsert;
