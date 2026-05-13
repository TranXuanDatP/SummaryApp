import {
  pgTable,
  varchar,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const refreshTokensTable = pgTable('refresh_tokens', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type RefreshTokenRecord = typeof refreshTokensTable.$inferSelect;
export type RefreshTokenRecordInsert = typeof refreshTokensTable.$inferInsert;
