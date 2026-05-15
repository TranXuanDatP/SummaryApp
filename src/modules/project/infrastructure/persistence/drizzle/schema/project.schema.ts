import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const projectsTable = pgTable('projects', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ProjectRecord = typeof projectsTable.$inferSelect;
export type ProjectRecordInsert = typeof projectsTable.$inferInsert;
