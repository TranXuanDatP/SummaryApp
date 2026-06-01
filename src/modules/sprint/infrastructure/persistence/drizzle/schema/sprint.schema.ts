import {
  pgTable,
  varchar,
  integer,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema/project.schema';

export const sprintsTable = pgTable('sprints', {
  id: varchar('id', { length: 50 }).primaryKey(),
  projectId: varchar('project_id', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('planning'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sprintsRelations = relations(sprintsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [sprintsTable.projectId],
    references: [projectsTable.id],
  }),
}));

export type SprintRecord = typeof sprintsTable.$inferSelect;
export type SprintRecordInsert = typeof sprintsTable.$inferInsert;
