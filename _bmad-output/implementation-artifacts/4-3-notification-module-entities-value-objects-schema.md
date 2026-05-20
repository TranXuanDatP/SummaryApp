# Story 4.3: Notification Module — Entities, Value Objects & Schema

Status: done

## Story

As a developer,
I want to create NotificationModule with entities, value objects, and schemas,
so that notifications can be stored and preferences managed.

## Acceptance Criteria

1. **Given** all previous modules exist (User, Auth, Project, WorkLog, Comment), **When** NotificationModule is created, **Then** Notification entity has `create()`, `reconstitute()`, `markAsRead()` methods
2. **Notification entity fields:** id, userId, type (NotificationType), title, content, actionLink, isRead — append-only, NO soft delete, NO version tracking
3. **NotificationPreference entity fields:** id, userId, type (NotificationType), channel (NotificationChannel), enabled, createdAt, updatedAt — mutable config entity
4. **NotificationType value object** — enum with all 8 types from PRD FR-07: `daily_work_log_reminder`, `edit_window_closing`, `weekly_summary`, `manager_no_activity_alert`, `monthly_report_ready`, `project_no_tasks`, `comment_received`, `task_assigned`
5. **NotificationChannel value object** — enum: `in_app`, `email`
6. **Domain events:** `NotificationSentEvent` — emitted on notification creation
7. **`INotificationRepository` interface** — marker interface extending `IAggregateRepository<Notification>`
8. **`notificationsTable` Drizzle schema** matches Architecture spec with relation to `usersTable`
9. **`notificationPreferencesTable` Drizzle schema** matches Architecture spec with relation to `usersTable`
10. **Schemas registered** in shared schema registry at `src/libs/shared/database/drizzle/schema/index.ts`
11. **NotificationModule** imports `UserModule`, `WorkLogModule`, `ProjectModule`
12. **DI tokens:** `NOTIFICATION_REPOSITORY_TOKEN`, `NOTIFICATION_READ_DAO_TOKEN`, `EMAIL_SERVICE_TOKEN` in `constants/tokens.ts`
13. **DomainErrorCode entries** added for Notification validation errors

## Tasks / Subtasks

- [x] Task 1: Create Notification module folder structure and barrel exports (AC: #11)
  - [x] Create `src/modules/notification/` with subfolders: `domain/`, `application/`, `infrastructure/`, `constants/`
  - [x] Create `index.ts` barrel files in each subfolder
  - [x] Create `notification.module.ts` — imports `SharedCqrsModule`, `UserModule`, `WorkLogModule`, `ProjectModule`; empty providers/controllers for now
- [x] Task 2: Create NotificationType value object (AC: #4)
  - [x] Create `src/modules/notification/domain/value-objects/notification-type.value-object.ts` — extends `BaseValueObject`, validates against 8 allowed types, throws `DomainException` with `NOTIFICATION_TYPE_INVALID` for invalid values
  - [x] Update `src/modules/notification/domain/value-objects/index.ts` — barrel export
- [x] Task 3: Create NotificationChannel value object (AC: #5)
  - [x] Create `src/modules/notification/domain/value-objects/notification-channel.value-object.ts` — extends `BaseValueObject`, validates against `in_app` | `email`, throws `DomainException` with `NOTIFICATION_CHANNEL_INVALID` for invalid values
  - [x] Update barrel export
- [x] Task 4: Add DomainErrorCode entries for Notification (AC: #13)
  - [x] Update `src/libs/core/domain/exceptions/domain-error-code.ts` — add notification error codes (see Dev Notes for full list)
- [x] Task 5: Create Notification entity (AC: #1, #2)
  - [x] Create `src/modules/notification/domain/entities/notification.entity.ts` — extends `AggregateRoot`
  - [x] Implement `Props` interface: `userId: string`, `type: NotificationType`, `title: string`, `content: string`, `actionLink: string | null`, `isRead: boolean`
  - [x] Implement private constructor with `id: string`, `props`, `createdAt` (no version, no updatedAt, no deletedAt)
  - [x] Implement `static create()` — validates all fields, constructs entity, emits `NotificationSentEvent`, returns entity
  - [x] Implement `static reconstitute()` — takes all fields, no events
  - [x] Implement `markAsRead()` — sets `isRead = true`, calls `markAsModified()`
  - [x] Getters: `userId`, `type`, `title`, `content`, `actionLink`, `isRead`
  - [x] Create `src/modules/notification/domain/entities/index.ts` — barrel export
- [x] Task 6: Create NotificationPreference entity (AC: #3)
  - [x] Create `src/modules/notification/domain/entities/notification-preference.entity.ts` — extends `AggregateRoot`
  - [x] Implement `Props` interface: `userId: string`, `type: NotificationType`, `channel: NotificationChannel`, `enabled: boolean`
  - [x] Implement private constructor with `id`, `props`, `createdAt`, `updatedAt` (no version, no deletedAt)
  - [x] Implement `static create()` — validates fields, constructs entity, returns entity (no event)
  - [x] Implement `static reconstitute()` — takes all fields, no events
  - [x] Implement `updateEnabled(enabled: boolean)` — sets `enabled`, calls `markAsModified()`
  - [x] Getters: `userId`, `type`, `channel`, `enabled`
  - [x] Update entities `index.ts` barrel export
- [x] Task 7: Create domain events (AC: #6)
  - [x] Create `src/modules/notification/domain/events/notification-sent.event.ts` — extends `BaseDomainEvent`, aggregateType `'Notification'`, eventType `'NotificationSent'`, data: `{ userId, type, title }`
  - [x] Create `src/modules/notification/domain/events/index.ts` — barrel export
- [x] Task 8: Create repository interface (AC: #7)
  - [x] Create `src/modules/notification/domain/repositories/i-notification-repository.interface.ts` — `extends IAggregateRepository<Notification>`
  - [x] Create `src/modules/notification/domain/repositories/index.ts` — barrel export
  - [x] Create `src/modules/notification/domain/services/index.ts` — empty barrel (no domain services needed)
  - [x] Create `src/modules/notification/domain/index.ts` — barrel export aggregating all domain exports
- [x] Task 9: Create DI tokens (AC: #12)
  - [x] Create `src/modules/notification/constants/tokens.ts` — `NOTIFICATION_REPOSITORY_TOKEN`, `NOTIFICATION_READ_DAO_TOKEN`, `EMAIL_SERVICE_TOKEN`
  - [x] Create `src/modules/notification/constants/index.ts` — barrel export
- [x] Task 10: Create Drizzle schemas with relations (AC: #8, #9, #10)
  - [x] Create `src/modules/notification/infrastructure/persistence/drizzle/schema/notification.schema.ts` — `notificationsTable` with `usersTable` relation
  - [x] Create `src/modules/notification/infrastructure/persistence/drizzle/schema/notification-preference.schema.ts` — `notificationPreferencesTable` with `usersTable` relation
  - [x] Create `src/modules/notification/infrastructure/persistence/drizzle/schema/index.ts` — barrel export
  - [x] Update `src/libs/shared/database/drizzle/schema/index.ts` — import and register both tables
- [x] Task 11: Write tests (AC: all)
  - [x] Create `src/modules/notification/domain/entities/notification.entity.spec.ts` — test create, reconstitute, markAsRead, validation errors, event emission
  - [x] Create `src/modules/notification/domain/entities/notification-preference.entity.spec.ts` — test create, reconstitute, updateEnabled, validation
  - [x] Create `src/modules/notification/domain/value-objects/notification-type.value-object.spec.ts` — test all 8 valid types, invalid type throws
  - [x] Create `src/modules/notification/domain/value-objects/notification-channel.value-object.spec.ts` — test both valid channels, invalid throws
  - [x] Run `tsc --noEmit` and `jest` — all pass (471 total: 423 existing + 48 new)

## Dev Notes

### MUST-FOLLOW: Exact Code Patterns

Follow the Comment module patterns EXACTLY. Read these files before implementing:

**Entity pattern:** `src/modules/comment/domain/entities/comment.entity.ts`
- `extends AggregateRoot`, private constructor
- `create()` — static factory, validates, constructs, calls `addDomainEvent()`, returns entity
- `reconstitute()` — static, takes raw fields, no events
- All string fields MUST be trimmed before validation and storage

**Value object pattern:** `src/modules/comment/domain/value-objects/comment-id.value-object.ts`
- `extends BaseValueObject`, validates in constructor, `getEqualityComponents()` returns `[this.value]`

**Event pattern:** `src/modules/comment/domain/events/comment-created.event.ts`
- `extends BaseDomainEvent<TData>`, super gets `(aggregateId, 'Notification', 'NotificationSent', data, metadata)`

**Schema pattern:** `src/modules/comment/infrastructure/persistence/drizzle/schema/comment.schema.ts`
- `pgTable` + `relations` + inferred types, imports from other modules for FK relations

**Schema registry:** `src/libs/shared/database/drizzle/schema/index.ts`
- Import and add to `schema` object

**Module pattern:** `src/modules/comment/comment.module.ts`
- `@Module`, `SharedCqrsModule` import, other module imports
- **DO NOT** register in `AppModule` yet — Story 4.4 does that

### KEY DIFFERENCES from Comment/WorkLog Modules

Notification module has important differences from Comment/WorkLog:

1. **Notification entity is append-only** — no `version` column, no `isDeleted`, no `deletedAt`, no `updatedAt` in schema. Notifications are created and marked as read, never updated or deleted.
2. **NotificationPreference is a config entity** — has `updatedAt` but no `version`, `isDeleted`, or `deletedAt`. Updated when user changes preferences.
3. **Two entities in one module** — Notification and NotificationPreference share the module but have different schemas and behaviors.
4. **NotificationType is an enum-like value object** — validates against a fixed set of 8 string values, not a simple string.
5. **NotificationChannel is an enum-like value object** — validates against `in_app` | `email`.
6. **No soft delete** on either entity — notifications are never deleted, preferences are never deleted.
7. **Simpler repository** — persist logic will not use version-based optimistic concurrency (handled in Story 4.4 infrastructure).

### Notification Entity Design

```typescript
export interface NotificationProps {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  actionLink: string | null;
  isRead: boolean;
}
```

**`create()` validation:**
- `userId`: non-empty after trim, max 50 chars -> `NOTIFICATION_USER_ID_REQUIRED` / `NOTIFICATION_USER_ID_TOO_LONG`
- `type`: must be valid NotificationType -> `NOTIFICATION_TYPE_INVALID`
- `title`: non-empty after trim, max 300 chars -> `NOTIFICATION_TITLE_REQUIRED` / `NOTIFICATION_TITLE_TOO_LONG`
- `content`: non-empty after trim -> `NOTIFICATION_CONTENT_REQUIRED`
- `actionLink`: optional, max 500 chars if provided -> `NOTIFICATION_ACTION_LINK_TOO_LONG`

**`markAsRead()` behavior:**
- Sets `isRead = true`
- Calls `markAsModified()` (from AggregateRoot)
- No event emission (read status is not a domain event — it's a UI concern)

**Constructor signature (simplified vs Comment/WorkLog):**
```typescript
private constructor(
  id: string,
  props: NotificationProps,
  createdAt?: Date,
) {
  super(id, undefined, createdAt);  // version = undefined (no version tracking)
  this._props = props;
}
```

Note: `AggregateRoot` constructor is `constructor(id, version?, createdAt?, updatedAt?)`. Since Notification has no version, pass `undefined`. This means the repository persist logic in Story 4.4 will do simple inserts/updates without version checking.

### NotificationPreference Entity Design

```typescript
export interface NotificationPreferenceProps {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}
```

**`create()` validation:**
- `userId`: non-empty after trim, max 50 chars -> `NOTIFICATION_PREF_USER_ID_REQUIRED` / `NOTIFICATION_PREF_USER_ID_TOO_LONG`
- `type`: valid NotificationType -> `NOTIFICATION_TYPE_INVALID`
- `channel`: valid NotificationChannel -> `NOTIFICATION_CHANNEL_INVALID`

**`updateEnabled(enabled: boolean)` behavior:**
- Sets `enabled` flag
- Calls `markAsModified()`

### NotificationType Value Object

```typescript
export class NotificationType extends BaseValueObject {
  public readonly value: string;

  private static readonly VALID_TYPES = [
    'daily_work_log_reminder',     // N-1
    'edit_window_closing',          // N-2
    'weekly_summary',               // N-3
    'manager_no_activity_alert',    // N-4
    'monthly_report_ready',         // N-5
    'project_no_tasks',             // N-6
    'comment_received',             // N-7
    'task_assigned',                // N-8
  ] as const;

  constructor(value: string) {
    super();
    const trimmed = (value || '').trim();
    if (!trimmed) {
      throw new DomainException('Notification type is required', DomainErrorCode.NOTIFICATION_TYPE_REQUIRED);
    }
    if (!NotificationType.VALID_TYPES.includes(trimmed as any)) {
      throw new DomainException(
        `Invalid notification type: ${trimmed}`,
        DomainErrorCode.NOTIFICATION_TYPE_INVALID,
      );
    }
    this.value = trimmed;
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
```

### NotificationChannel Value Object

```typescript
export class NotificationChannel extends BaseValueObject {
  public readonly value: string;

  private static readonly VALID_CHANNELS = ['in_app', 'email'] as const;

  constructor(value: string) {
    super();
    const trimmed = (value || '').trim();
    if (!trimmed) {
      throw new DomainException('Notification channel is required', DomainErrorCode.NOTIFICATION_CHANNEL_REQUIRED);
    }
    if (!NotificationChannel.VALID_CHANNELS.includes(trimmed as any)) {
      throw new DomainException(
        `Invalid notification channel: ${trimmed}`,
        DomainErrorCode.NOTIFICATION_CHANNEL_INVALID,
      );
    }
    this.value = trimmed;
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }

  toString(): string {
    return this.value;
  }
}
```

### DomainErrorCode Entries to Add

```typescript
// Notification errors
NOTIFICATION_TYPE_REQUIRED = 'NOTIFICATION_TYPE_REQUIRED',
NOTIFICATION_TYPE_INVALID = 'NOTIFICATION_TYPE_INVALID',
NOTIFICATION_CHANNEL_REQUIRED = 'NOTIFICATION_CHANNEL_REQUIRED',
NOTIFICATION_CHANNEL_INVALID = 'NOTIFICATION_CHANNEL_INVALID',
NOTIFICATION_USER_ID_REQUIRED = 'NOTIFICATION_USER_ID_REQUIRED',
NOTIFICATION_USER_ID_TOO_LONG = 'NOTIFICATION_USER_ID_TOO_LONG',
NOTIFICATION_TITLE_REQUIRED = 'NOTIFICATION_TITLE_REQUIRED',
NOTIFICATION_TITLE_TOO_LONG = 'NOTIFICATION_TITLE_TOO_LONG',
NOTIFICATION_CONTENT_REQUIRED = 'NOTIFICATION_CONTENT_REQUIRED',
NOTIFICATION_ACTION_LINK_TOO_LONG = 'NOTIFICATION_ACTION_LINK_TOO_LONG',
NOTIFICATION_PREF_USER_ID_REQUIRED = 'NOTIFICATION_PREF_USER_ID_REQUIRED',
NOTIFICATION_PREF_USER_ID_TOO_LONG = 'NOTIFICATION_PREF_USER_ID_TOO_LONG',
```

### Drizzle Schemas

**notificationsTable** (from Architecture Section 3.6):
```typescript
import { pgTable, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
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

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.userId],
    references: [usersTable.id],
  }),
}));

export type NotificationRecord = typeof notificationsTable.$inferSelect;
export type NotificationRecordInsert = typeof notificationsTable.$inferInsert;
```

**notificationPreferencesTable** (from Architecture Section 3.6):
```typescript
import { pgTable, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';
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
```

**CRITICAL SCHEMA NOTE:** The Architecture spec shows `userId: varchar('user_id', { length: 50 }).notNull().unique()` on notificationPreferencesTable. However, this unique constraint on `userId` alone is **incorrect** — it would prevent multiple preference rows per user (one per type+channel combination). The correct constraint should be composite: `UNIQUE (user_id, type, channel)`. For this story, follow the architecture schema exactly (use `.unique()` on userId as documented) but note this for correction in Story 4.4 when the read DAO and preference logic are implemented. The fix will be to remove `.unique()` from `userId` and add a composite unique index.

### DI Tokens (from Architecture Section 3.6)

```typescript
export const NOTIFICATION_REPOSITORY_TOKEN = Symbol('INotificationRepository');
export const NOTIFICATION_READ_DAO_TOKEN = Symbol('INotificationReadDao');
export const EMAIL_SERVICE_TOKEN = Symbol('IEmailService');
```

### NotificationModule (Minimal for Story 4.3)

Story 4.3 only creates the domain layer and schema. The module file is minimal — no controllers, no providers yet. But it MUST import `UserModule`, `WorkLogModule`, `ProjectModule` per architecture spec.

```typescript
import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { UserModule } from '@modules/user/user.module';
import { WorkLogModule } from '@modules/work-log/work-log.module';
import { ProjectModule } from '@modules/project/project.module';

@Module({
  imports: [SharedCqrsModule, UserModule, WorkLogModule, ProjectModule],
  providers: [],
  exports: [],
})
export class NotificationModule {}
```

**IMPORTANT:** Do NOT register `NotificationModule` in `AppModule` yet — that happens in Story 4.4 when the controller and handlers are added.

### Cross-Module Dependencies

NotificationModule imports:
- `UserModule` — exports `USER_READ_DAO_TOKEN` for resolving user display names
- `WorkLogModule` — exports `WORK_LOG_READ_DAO_TOKEN` for querying WorkLog data (N-1, N-2, N-3, N-4 schedulers)
- `ProjectModule` — exports `PROJECT_READ_DAO_TOKEN` for querying Project data (N-6 scheduler)

These dependencies are for future stories (4.5-4.7). Story 4.3 only sets up the module skeleton.

### Anti-Patterns to AVOID

- **DO NOT** add any infrastructure implementations (repository, read DAO, controller, handlers, schedulers, event handlers) — those are Stories 4.4-4.7
- **DO NOT** add `NotificationModule` to `AppModule` imports — that comes with Story 4.4
- **DO NOT** create `application/commands/` or `application/queries/` yet — Story 4.4 scope
- **DO NOT** add `@Roles()` or auth decorators — no controller in this story
- **DO NOT** add `version`, `isDeleted`, `deletedAt` columns to Notification schema — it's append-only
- **DO NOT** add `version`, `isDeleted`, `deletedAt` columns to NotificationPreference schema — it's a simple config
- **DO NOT** forget `updatedAt` column on NotificationPreference — it IS mutable
- **DO NOT** use `text` for `id`, `userId`, `type` fields — use `varchar` with appropriate length
- **DO NOT** forget to import `usersTable` in schema files for relations
- **DO NOT** emit domain events in `reconstitute()` — only `create()` emits events
- **DO NOT** forget to add new error codes to `DomainErrorCode` enum
- **DO NOT** forget to trim all string fields before validation and storage
- **DO NOT** emit events from NotificationPreference entity — no domain events for preference changes per architecture (only `notification-sent.event.ts` exists)
- **DO NOT** create INotificationPreferenceRepository interface — the architecture shows only one repository file (`i-notification-repository.interface.ts`). Preference persistence will be handled through the infrastructure layer in Story 4.4.

### Files to CREATE

```
src/modules/notification/notification.module.ts
src/modules/notification/index.ts
src/modules/notification/constants/tokens.ts
src/modules/notification/constants/index.ts
src/modules/notification/domain/entities/notification.entity.ts
src/modules/notification/domain/entities/notification.entity.spec.ts
src/modules/notification/domain/entities/notification-preference.entity.ts
src/modules/notification/domain/entities/notification-preference.entity.spec.ts
src/modules/notification/domain/entities/index.ts
src/modules/notification/domain/value-objects/notification-type.value-object.ts
src/modules/notification/domain/value-objects/notification-type.value-object.spec.ts
src/modules/notification/domain/value-objects/notification-channel.value-object.ts
src/modules/notification/domain/value-objects/notification-channel.value-object.spec.ts
src/modules/notification/domain/value-objects/index.ts
src/modules/notification/domain/events/notification-sent.event.ts
src/modules/notification/domain/events/index.ts
src/modules/notification/domain/repositories/i-notification-repository.interface.ts
src/modules/notification/domain/repositories/index.ts
src/modules/notification/domain/services/index.ts
src/modules/notification/domain/index.ts
src/modules/notification/application/index.ts
src/modules/notification/infrastructure/index.ts
src/modules/notification/infrastructure/persistence/index.ts
src/modules/notification/infrastructure/persistence/drizzle/schema/notification.schema.ts
src/modules/notification/infrastructure/persistence/drizzle/schema/notification-preference.schema.ts
src/modules/notification/infrastructure/persistence/drizzle/schema/index.ts
src/modules/notification/infrastructure/http/index.ts
src/modules/notification/infrastructure/persistence/read/index.ts
src/modules/notification/infrastructure/persistence/write/index.ts
src/modules/notification/infrastructure/services/index.ts
src/modules/notification/infrastructure/projections/index.ts
src/modules/notification/infrastructure/schedulers/index.ts
src/modules/notification/infrastructure/event-handlers/index.ts
```

### Files to MODIFY

```
src/libs/core/domain/exceptions/domain-error-code.ts   — add Notification error codes
src/libs/shared/database/drizzle/schema/index.ts       — register both notification tables
```

### Previous Story Learnings (Stories 4.1, 4.2)

- Comment entity follows exact WorkLog entity patterns: create/reconstitute/updateContent/delete with domain events
- All string fields must be trimmed before validation and storage (caught in two rounds of review)
- Comment module has 9 DomainErrorCode entries — notification will have similar count
- `user.userId` is the correct field for user ID; `user.role` for role check
- Use `ValidationException` for DTO validation errors, `BusinessRuleException` for domain rule violations
- Package manager is `bun` — use `bun add` for dependencies (no new deps in this story)
- Fastify is used (not Express) — `FastifyReply` for response manipulation
- `||` not `??` for string fallbacks where empty strings should be falsy
- 423 tests pass at end of Story 4.2 — don't break them
- Mock DAO/repository must include ALL methods in test setup
- `ForbiddenException` is available from `src/libs/core/common`
- Value object tests: test valid values, invalid values, empty values, equality
- Entity tests: test create validation, reconstitute, lifecycle methods, event emission
- CommentModule was NOT registered in AppModule during Story 4.1 — only in Story 4.2
- Do NOT add module to AppModule in this story — that's Story 4.4

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source file
- **Notification entity tests must cover:**
  - `create()` — valid creation, emits `NotificationSentEvent`
  - `create()` — empty userId throws `NOTIFICATION_USER_ID_REQUIRED`
  - `create()` — userId > 50 chars throws `NOTIFICATION_USER_ID_TOO_LONG`
  - `create()` — invalid type throws `NOTIFICATION_TYPE_INVALID`
  - `create()` — empty title throws `NOTIFICATION_TITLE_REQUIRED`
  - `create()` — title > 300 chars throws `NOTIFICATION_TITLE_TOO_LONG`
  - `create()` — empty content throws `NOTIFICATION_CONTENT_REQUIRED`
  - `create()` — actionLink > 500 chars throws `NOTIFICATION_ACTION_LINK_TOO_LONG`
  - `create()` — null actionLink is valid
  - `reconstitute()` — preserves all fields
  - `reconstitute()` — does NOT emit events
  - `markAsRead()` — sets `isRead` to true
  - `markAsRead()` — idempotent (calling twice is safe)
- **NotificationPreference entity tests must cover:**
  - `create()` — valid creation with all fields
  - `create()` — empty userId throws
  - `create()` — invalid type throws `NOTIFICATION_TYPE_INVALID`
  - `create()` — invalid channel throws `NOTIFICATION_CHANNEL_INVALID`
  - `reconstitute()` — preserves all fields, no events
  - `updateEnabled(true/false)` — toggles enabled flag
- **NotificationType value object tests must cover:**
  - All 8 valid types: `daily_work_log_reminder`, `edit_window_closing`, `weekly_summary`, `manager_no_activity_alert`, `monthly_report_ready`, `project_no_tasks`, `comment_received`, `task_assigned`
  - Invalid type throws `NOTIFICATION_TYPE_INVALID`
  - Empty type throws `NOTIFICATION_TYPE_REQUIRED`
  - Equality comparison
- **NotificationChannel value object tests must cover:**
  - Both valid channels: `in_app`, `email`
  - Invalid channel throws `NOTIFICATION_CHANNEL_INVALID`
  - Empty channel throws `NOTIFICATION_CHANNEL_REQUIRED`
  - Equality comparison
- Run `tsc --noEmit` and `jest` — all pass (423 existing + new tests)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3] — Acceptance criteria, dependencies
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.6] — Notification module folder structure, schemas, entity design
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 2.2] — Entity relationships
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 6] — Schema registry update
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-07] — Notification requirements, 8 types, channels, anti-spam rules
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR8] — Notification preferences format
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR9] — Pagination pattern (for Story 4.4)
- [Source: src/modules/comment/domain/entities/comment.entity.ts] — Entity pattern to follow
- [Source: src/modules/comment/domain/value-objects/comment-id.value-object.ts] — Value object pattern
- [Source: src/modules/comment/domain/events/comment-created.event.ts] — Event pattern
- [Source: src/modules/comment/infrastructure/persistence/drizzle/schema/comment.schema.ts] — Schema pattern
- [Source: src/modules/comment/comment.module.ts] — Module wiring pattern

### Review Findings

- [x] [Review][Patch] `Notification.content` has no max-length validation [notification.entity.ts:74-77] — Added MAX_CONTENT_LENGTH=2000 and validation. Added NOTIFICATION_CONTENT_TOO_LONG error code.
- [x] [Review][Patch] `Notification.create()` does not validate `id` — Added id emptiness/length validation with NOTIFICATION_ID_REQUIRED/NOTIFICATION_ID_TOO_LONG error codes.
- [x] [Review][Patch] `NotificationPreference.create()` does not validate `id` — Added id emptiness/length validation with NOTIFICATION_PREF_ID_REQUIRED/NOTIFICATION_PREF_ID_TOO_LONG error codes.
- [x] [Review][Patch] No null/undefined guard on `props.type` in Notification.create() [notification.entity.ts] — Added null check with clean DomainException.
- [x] [Review][Patch] No null/undefined guard on `props.type`/`props.channel` in NotificationPreference.create() — Added null checks for both with clean DomainExceptions.
- [x] [Review][Patch] `markAsRead()` has no idempotency guard [notification.entity.ts] — Added `if (this._props.isRead) return;` early return guard.
- [x] [Review][Defer] Missing composite unique constraint on notificationPreferencesTable (userId, type, channel) [notification-preference.schema.ts] — deferred, pre-existing architectural decision; schema follows architecture spec literally
- [x] [Review][Defer] NotificationPreference.updateEnabled() never emits domain events [notification-preference.entity.ts] — deferred, architecture only defines one event file (notification-sent.event.ts)
- [x] [Review][Defer] No URL validation on actionLink [notification.entity.ts] — deferred, not in spec scope

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 11 tasks implemented: module structure, 2 value objects, error codes, 2 entities, domain event, repository interface, DI tokens, 2 Drizzle schemas, tests
- Notification entity: append-only (no version/isDeleted/deletedAt), create/reconstitute/markAsRead, emits NotificationSentEvent
- NotificationPreference entity: config entity (no version/isDeleted/deletedAt), create/reconstitute/updateEnabled
- NotificationType value object validates against 8 types from PRD FR-07
- NotificationChannel value object validates against in_app/email
- DomainErrorCode extended with 12 notification error codes
- Drizzle schemas: notificationsTable and notificationPreferencesTable with usersTable relations, registered in shared schema registry
- NotificationModule imports SharedCqrsModule, UserModule, WorkLogModule, ProjectModule (not registered in AppModule yet — Story 4.4)
- 48 new tests (14 NotificationType + 10 NotificationChannel + 14 Notification + 10 NotificationPreference), all 471 tests pass, tsc --noEmit clean
- Code review: fixed 6 patch findings (content max-length, id validation on both entities, null guards on type/channel, markAsRead idempotency guard), added 4 new error codes and 8 new tests — 479 total tests pass

### File List

**Created:**
- src/modules/notification/notification.module.ts
- src/modules/notification/index.ts
- src/modules/notification/constants/tokens.ts
- src/modules/notification/constants/index.ts
- src/modules/notification/domain/entities/notification.entity.ts
- src/modules/notification/domain/entities/notification.entity.spec.ts
- src/modules/notification/domain/entities/notification-preference.entity.ts
- src/modules/notification/domain/entities/notification-preference.entity.spec.ts
- src/modules/notification/domain/entities/index.ts
- src/modules/notification/domain/value-objects/notification-type.value-object.ts
- src/modules/notification/domain/value-objects/notification-type.value-object.spec.ts
- src/modules/notification/domain/value-objects/notification-channel.value-object.ts
- src/modules/notification/domain/value-objects/notification-channel.value-object.spec.ts
- src/modules/notification/domain/value-objects/index.ts
- src/modules/notification/domain/events/notification-sent.event.ts
- src/modules/notification/domain/events/index.ts
- src/modules/notification/domain/repositories/i-notification-repository.interface.ts
- src/modules/notification/domain/repositories/index.ts
- src/modules/notification/domain/services/index.ts
- src/modules/notification/domain/index.ts
- src/modules/notification/application/index.ts
- src/modules/notification/infrastructure/index.ts
- src/modules/notification/infrastructure/persistence/index.ts
- src/modules/notification/infrastructure/persistence/drizzle/schema/notification.schema.ts
- src/modules/notification/infrastructure/persistence/drizzle/schema/notification-preference.schema.ts
- src/modules/notification/infrastructure/persistence/drizzle/schema/index.ts
- src/modules/notification/infrastructure/http/index.ts
- src/modules/notification/infrastructure/persistence/read/index.ts
- src/modules/notification/infrastructure/persistence/write/index.ts
- src/modules/notification/infrastructure/services/index.ts
- src/modules/notification/infrastructure/projections/index.ts
- src/modules/notification/infrastructure/schedulers/index.ts
- src/modules/notification/infrastructure/event-handlers/index.ts

**Modified:**
- src/libs/core/domain/exceptions/domain-error-code.ts — added 12 Notification error codes
- src/libs/shared/database/drizzle/schema/index.ts — registered notificationsTable + notificationPreferencesTable
