/**
 * Drizzle Schema Exports
 *
 * Export tất cả table schemas
 */

import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';
import { refreshTokensTable } from '@modules/auth/infrastructure/persistence/drizzle/schema';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import {
  workLogsTable,
  workLogsRelations,
} from '@modules/work-log/infrastructure/persistence/drizzle/schema';
import {
  commentsTable,
  commentsRelations,
} from '@modules/comment/infrastructure/persistence/drizzle/schema';
import {
  notificationsTable,
  notificationPreferencesTable,
} from '@modules/notification/infrastructure/persistence/drizzle/schema';
import {
  outboxStatusEnum,
  outboxTable,
} from '@shared/database/outbox/drizzle/schema/outbox.schema';

export const schema = {
  usersTable,
  refreshTokensTable,
  projectsTable,
  workLogsTable,
  workLogsRelations,
  commentsTable,
  commentsRelations,
  notificationsTable,
  notificationPreferencesTable,
  outboxTable,
  outboxStatusEnum,
};
