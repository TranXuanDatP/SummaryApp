# Story 4.4: Notification CRUD & Preferences API

Status: done

## Story

As any authenticated user,
I want to view and manage my notifications and preferences,
so that I control what notifications I receive and how.

## Acceptance Criteria

1. **Given** NotificationModule with entities and repositories, **When** I send `GET /notifications`, **Then** returns paginated list of my notifications `{ data, total, page, totalPages }` sorted by `createdAt desc`
2. Each notification DTO includes `id`, `type`, `title`, `content`, `actionLink`, `isRead`, `createdAt`
3. `PUT /notifications/:id/read` marks single notification as read — auto-filtered by `currentUser.id`
4. `PUT /notifications/read-all` marks all my notifications as read
5. `GET /notifications/preferences` returns my preferences per type
6. `PUT /notifications/preferences` with `{ preferences: [{ type, channel, enabled }] }` updates preferences (UX-DR8)
7. All endpoints auto-filter by `currentUser.id` — no cross-user access possible
8. Default preferences: all types `in_app` enabled; N-1/N-3/N-5/N-7 `email` enabled
9. Pagination pattern: `{ data, total, page, totalPages }` with default limit=20, max=100 (UX-DR9)
10. NotificationModule registered in `AppModule`

## Tasks / Subtasks

- [x] Task 1: Create application DTOs (AC: #2, #6, #9)
  - [x] Create `src/modules/notification/application/dtos/notification.dto.ts` — NotificationDto with fields: id, type (string), title, content, actionLink (string|null), isRead, createdAt
  - [x] Create `src/modules/notification/application/dtos/notification-preference.dto.ts` — NotificationPreferenceDto with fields: id, type (string), channel (string), enabled
  - [x] Create `src/modules/notification/application/dtos/update-notification-preference.dto.ts` — class-validator DTO: `{ preferences: [{ type: string, channel: string, enabled: boolean }] }`
  - [x] Create `src/modules/notification/application/dtos/index.ts` — barrel export
- [x] Task 2: Create application commands (AC: #3, #4, #6)
  - [x] Create `src/modules/notification/application/commands/mark-notification-read.command.ts` — `{ notificationId, userId }`
  - [x] Create `src/modules/notification/application/commands/mark-all-read.command.ts` — `{ userId }`
  - [x] Create `src/modules/notification/application/commands/update-notification-preference.command.ts` — `{ userId, preferences: [{ type, channel, enabled }] }`
  - [x] Create command barrel exports
- [x] Task 3: Create application queries and ports (AC: #1, #5)
  - [x] Create `src/modules/notification/application/queries/get-notifications.query.ts` — `{ userId, page, limit }`
  - [x] Create `src/modules/notification/application/queries/get-notification-preferences.query.ts` — `{ userId }`
  - [x] Create `src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts` — define interface with: `findByUserId(params)`, `findById(id)`, `findPreferencesByUserId(userId)`, `findPreferenceByUserAndTypeAndChannel(userId, type, channel)`, `countUnreadByUserId(userId)`
  - [x] Create query and ports barrel exports
- [x] Task 4: Create read DAO (AC: #1, #5)
  - [x] Create `src/modules/notification/infrastructure/persistence/read/notification-read-dao.ts` — extends BaseReadDao, implements INotificationReadDao
  - [x] `findByUserId()` — paginated query on notificationsTable filtered by userId, sorted by createdAt desc, with count
  - [x] `findById()` — single notification by id AND userId (security: prevents cross-user access)
  - [x] `findPreferencesByUserId()` — returns all preference rows for a user
  - [x] `findPreferenceByUserAndTypeAndChannel()` — single preference lookup for upsert logic
  - [x] `mapToNotificationDto()` and `mapToPreferenceDto()` private helpers
  - [x] Create read barrel exports
- [x] Task 5: Create write repository (AC: #3, #4, #6)
  - [x] Create `src/modules/notification/infrastructure/persistence/write/notification.repository.ts` — NotificationRepository
  - [x] **IMPORTANT:** Notification has no version — persist logic is simpler than Comment/WorkLog:
    - `save()` for new notifications: always INSERT (append-only)
    - `updateReadStatus()` for markAsRead: UPDATE SET is_read=true WHERE id=? AND user_id=?
    - `markAllRead()`: UPDATE SET is_read=true WHERE user_id=? AND is_read=false
  - [x] Preference persistence: `savePreference()` for new, `updatePreference()` for existing — upsert pattern based on (userId, type, channel)
  - [x] Create write barrel exports
- [x] Task 6: Create command handlers (AC: #3, #4, #6)
  - [x] Create `src/modules/notification/application/commands/handlers/mark-notification-read.handler.ts` — loads notification by id + userId, calls `markAsRead()`, saves
  - [x] Create `src/modules/notification/application/commands/handlers/mark-all-read.handler.ts` — bulk update is_read=true for user
  - [x] Create `src/modules/notification/application/commands/handlers/update-notification-preference.handler.ts` — upserts preferences by (userId, type, channel)
  - [x] Create handlers barrel export with `CommandHandlers` array
- [x] Task 7: Create query handlers (AC: #1, #5)
  - [x] Create `src/modules/notification/application/queries/handlers/get-notifications.handler.ts` — paginated list with `{ data, total, page, totalPages }`
  - [x] Create `src/modules/notification/application/queries/handlers/get-notification-preferences.handler.ts` — returns all preferences for user, seeded with defaults if missing (AC: #8)
  - [x] Create handlers barrel export with `QueryHandlers` array
- [x] Task 8: Create controller (AC: #1-#7)
  - [x] Create `src/modules/notification/infrastructure/http/notification.controller.ts` — `@Controller('notifications')`, `@ApiTags('notifications')`, `@ApiBearerAuth('JWT-auth')`
  - [x] `GET /` — list notifications with pagination (`?page=1&limit=20`), auto-filter by `currentUser.userId`
  - [x] `PUT /:id/read` — mark single read, auto-filter by userId
  - [x] `PUT /read-all` — mark all read, auto-filter by userId
  - [x] `GET /preferences` — get my preferences
  - [x] `PUT /preferences` — update preferences with class-validator DTO
  - [x] Update `src/modules/notification/infrastructure/http/index.ts` — barrel export
- [x] Task 9: Wire NotificationModule and register in AppModule (AC: #10)
  - [x] Update `src/modules/notification/notification.module.ts` — register controllers, providers (repository, read DAO, command handlers, query handlers), export tokens
  - [x] Update `src/app.module.ts` — add `NotificationModule` to imports
- [x] Task 10: Write tests (AC: all)
  - [x] Create `src/modules/notification/infrastructure/http/notification.controller.spec.ts` — test all endpoints with mocked command/query bus
  - [x] Create `src/modules/notification/application/commands/handlers/mark-notification-read.handler.spec.ts`
  - [x] Create `src/modules/notification/application/commands/handlers/update-notification-preference.handler.spec.ts`
  - [x] Create `src/modules/notification/application/queries/handlers/get-notifications.handler.spec.ts`
  - [x] Create `src/modules/notification/application/queries/handlers/get-notification-preferences.handler.spec.ts`
  - [x] Run `tsc --noEmit` and `jest` — all pass (479 existing + 20 new = 499)

## Dev Notes

### MUST-FOLLOW: Exact Code Patterns

Follow the Comment module CRUD patterns EXACTLY. Read these files before implementing:

**Controller pattern:** `src/modules/comment/infrastructure/http/comment.controller.ts`
- Inject `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`
- Use `parsePagination()` helper from `src/modules/work-log/infrastructure/http/work-log.controller.ts` — copy the same helper
- All endpoints use `@CurrentUser() user: any` — extract `user.userId` for filtering
- `@ApiTags('notifications')`, `@ApiBearerAuth('JWT-auth')`

**Read DAO pattern:** `src/modules/comment/infrastructure/persistence/read/comment-read-dao.ts`
- extends `BaseReadDao`, injects `DATABASE_READ_TOKEN`
- `protected async executeQuery<T>(sql: string): Promise<T[]>` required by base class
- `mapToDto()` private helper method

**Repository pattern:** `src/modules/comment/infrastructure/persistence/write/comment.repository.ts`
- extends `BaseAggregateRepository<Notification>`, injects `DATABASE_WRITE_TOKEN`, `EVENT_BUS_TOKEN`, optionally `OUTBOX_REPOSITORY_TOKEN`
- `useOutbox: false` in super() call

**Module wiring pattern:** `src/modules/comment/comment.module.ts`
- Register concrete classes as providers, map to DI tokens with `useExisting`
- Export DI tokens for cross-module access
- Import `SharedCqrsModule`

**Query handler pattern:** `src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts`
- `@QueryHandler(QueryClass)`, injects read DAO via DI token
- Returns `{ data, total, page, totalPages }`

**Command handler pattern:** `src/modules/comment/application/commands/handlers/create-comment.handler.ts`
- `@CommandHandler(CommandClass)`, injects repository via DI token
- Uses `@Optional() @Inject(REQUEST_CONTEXT_TOKEN)` for event metadata
- Catches `DomainException` and wraps in `BusinessRuleException`

### KEY DIFFERENCES from Comment/WorkLog CRUD

1. **No version tracking** — Notification entity has `undefined` version. Repository persist logic must NOT do version-based optimistic concurrency. For new notifications: always INSERT. For markAsRead: simple UPDATE with id + userId WHERE clause.
2. **No soft delete** — Notifications are never deleted. No `isDeleted` column, no `deletedAt` column. Read queries do NOT filter by `isDeleted`.
3. **NotificationPreference upsert** — Preferences use a composite key (userId, type, channel). The update handler must check if a preference row exists; if yes, update `enabled`; if no, INSERT new row.
4. **Default preferences seeding** — `GET /notifications/preferences` must return ALL 8 types x 2 channels = 16 preference entries. If a preference doesn't exist in DB for the user, return the default (see AC #8). Do NOT auto-seed on user creation — seed on read (lazy initialization pattern).
5. **All endpoints filter by currentUser.userId** — security boundary. No `@Roles()` needed — any authenticated user manages their own notifications.
6. **mark-all-read is a bulk update** — not a loop of individual saves. Use single SQL UPDATE statement for efficiency.
7. **Notification is append-only** — the `save()` method only does INSERT, never UPDATE (except for the dedicated `updateReadStatus` method).

### NotificationDto Design

```typescript
export class NotificationDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;           // e.g. 'daily_work_log_reminder'
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) actionLink: string | null;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: Date;
}
```

### NotificationPreferenceDto Design

```typescript
export class NotificationPreferenceDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;           // e.g. 'daily_work_log_reminder'
  @ApiProperty() channel: string;        // 'in_app' | 'email'
  @ApiProperty() enabled: boolean;
}
```

### UpdateNotificationPreferenceDto (class-validator)

```typescript
export class PreferenceItemDto {
  @IsString() type: string;
  @IsString() channel: string;
  @IsBoolean() enabled: boolean;
}

export class UpdateNotificationPreferenceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItemDto)
  preferences: PreferenceItemDto[];
}
```

### Read DAO Interface Design

```typescript
export interface INotificationReadDao {
  findByUserId(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<{ data: NotificationDto[]; total: number }>;

  findById(id: string, userId: string): Promise<NotificationDto | null>;

  findPreferencesByUserId(userId: string): Promise<NotificationPreferenceDto[]>;

  findPreferenceByUserAndTypeAndChannel(
    userId: string,
    type: string,
    channel: string,
  ): Promise<NotificationPreferenceDto | null>;

  countUnreadByUserId(userId: string): Promise<number>;
}
```

### Default Preferences Logic (AC #8)

When `GET /notifications/preferences` is called, return preferences seeded with defaults:

```typescript
const ALL_TYPES = NotificationType.VALID_TYPES; // 8 types
const ALL_CHANNELS = ['in_app', 'email'];

// Default email-enabled types (N-1, N-3, N-5, N-7)
const EMAIL_ENABLED_BY_DEFAULT = [
  'daily_work_log_reminder',    // N-1
  'weekly_summary',             // N-3
  'monthly_report_ready',       // N-5
  'comment_received',           // N-7
];
```

For each (type, channel) combination:
- `in_app`: default `enabled: true` for all types
- `email`: default `enabled: true` for N-1/N-3/N-5/N-7, `enabled: false` for others

If user has explicit preference in DB → use that. Otherwise → use default.

### Repository Persistence Design

**Notification persistence (append-only + mark read):**

```typescript
class NotificationRepository extends BaseAggregateRepository<Notification> {
  // save() — only INSERT for new notifications
  protected async persist(aggregate: Notification): Promise<void> {
    await this.db.insert(notificationsTable).values(this.toPersistence(aggregate));
  }

  // updateReadStatus — for markAsRead
  async updateReadStatus(id: string, userId: string): Promise<void> {
    await this.db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
  }

  // markAllRead — bulk update
  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  }

  // getById — no version check, no isDeleted filter
  async getById(id: string): Promise<Notification | null> {
    const result = await this.db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, id))
      .limit(1);
    if (result.length === 0) return null;
    return this.toDomain(result[0]);
  }
}
```

**Note:** Since Notification has no version, the persist method signature differs from Comment/WorkLog. The `BaseAggregateRepository` expects `persist(aggregate, expectedVersion, options)`. For Notification, `expectedVersion` will be `undefined` (since entity has no version). The persist implementation only does INSERT — no version check needed.

**NotificationPreference persistence (upsert pattern):**

```typescript
// In a separate method or dedicated preference persistence
async savePreference(preference: NotificationPreference): Promise<void> {
  const existing = await this.db
    .select()
    .from(notificationPreferencesTable)
    .where(
      and(
        eq(notificationPreferencesTable.userId, preference.userId),
        eq(notificationPreferencesTable.type, preference.type.value),
        eq(notificationPreferencesTable.channel, preference.channel.value),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await this.db
      .update(notificationPreferencesTable)
      .set({ enabled: preference.enabled, updatedAt: new Date() })
      .where(eq(notificationPreferencesTable.id, existing[0].id));
  } else {
    await this.db
      .insert(notificationPreferencesTable)
      .values(this.preferenceToPersistence(preference));
  }
}
```

### Notification Controller Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/notifications` | — | `{ data: NotificationDto[], total, page, totalPages }` |
| PUT | `/notifications/:id/read` | — | `{ success: true }` |
| PUT | `/notifications/read-all` | — | `{ success: true }` |
| GET | `/notifications/preferences` | — | `NotificationPreferenceDto[]` |
| PUT | `/notifications/preferences` | `{ preferences: [{ type, channel, enabled }] }` | `NotificationPreferenceDto[]` |

**Security:** All endpoints filter by `user.userId` from JWT. No endpoint allows accessing other users' notifications or preferences. The `@CurrentUser()` decorator extracts the authenticated user.

**No `@Roles()` needed** — both employee and manager manage their own notifications equally.

### NotificationModule Wiring

```typescript
@Module({
  imports: [SharedCqrsModule, UserModule, WorkLogModule, ProjectModule],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    { provide: NOTIFICATION_REPOSITORY_TOKEN, useExisting: NotificationRepository },
    NotificationReadDao,
    { provide: NOTIFICATION_READ_DAO_TOKEN, useExisting: NotificationReadDao },
    ...CommandHandlers,
    ...QueryHandlers,
    NotificationReadModelProjection,
  ],
  exports: [NOTIFICATION_REPOSITORY_TOKEN, NOTIFICATION_READ_DAO_TOKEN],
})
export class NotificationModule {}
```

### AppModule Update

Add `NotificationModule` to `app.module.ts` imports:

```typescript
import { NotificationModule } from './modules/notification/notification.module';
// Add to imports array after CommentModule
```

### Read Model Projection

Follow the pattern from `src/modules/comment/infrastructure/projections/comment-read-model.projection.ts` — subscribe to `NotificationSentEvent` and update the read model. The projection file stub already exists at `src/modules/notification/infrastructure/projections/` — implement it.

### Anti-Patterns to AVOID

- **DO NOT** add version-based optimistic concurrency to Notification persist — entity has no version
- **DO NOT** filter by `isDeleted` in notification queries — notifications are never deleted
- **DO NOT** allow cross-user access — every query must include `userId = currentUser.userId`
- **DO NOT** use `@Roles()` on notification endpoints — all authenticated users access their own
- **DO NOT** loop over individual saves for `markAllRead` — use single bulk UPDATE
- **DO NOT** forget to add `parsePagination()` helper to controller — copy from WorkLogController
- **DO NOT** create NotificationPreferenceRepository as a separate class — handle preference persistence in the same NotificationRepository or as a dedicated service
- **DO NOT** forget to seed default preferences in `GET /preferences` — users start with defaults
- **DO NOT** add `@Public()` decorator — all notification endpoints require JWT
- **DO NOT** forget `updatedAt: new Date()` when updating preferences
- **DO NOT** emit domain events for preference updates — architecture only defines NotificationSentEvent
- **DO NOT** use `@Cron()` or schedulers in this story — those are Stories 4.5-4.7
- **DO NOT** create email sending infrastructure — that's Story 4.5+
- **DO NOT** forget to update barrel exports (index.ts) in every subfolder

### Files to CREATE

```
src/modules/notification/application/dtos/notification.dto.ts
src/modules/notification/application/dtos/notification-preference.dto.ts
src/modules/notification/application/dtos/update-notification-preference.dto.ts
src/modules/notification/application/dtos/index.ts
src/modules/notification/application/commands/mark-notification-read.command.ts
src/modules/notification/application/commands/mark-all-read.command.ts
src/modules/notification/application/commands/update-notification-preference.command.ts
src/modules/notification/application/commands/index.ts
src/modules/notification/application/commands/handlers/mark-notification-read.handler.ts
src/modules/notification/application/commands/handlers/mark-all-read.handler.ts
src/modules/notification/application/commands/handlers/update-notification-preference.handler.ts
src/modules/notification/application/commands/handlers/index.ts
src/modules/notification/application/queries/get-notifications.query.ts
src/modules/notification/application/queries/get-notification-preferences.query.ts
src/modules/notification/application/queries/index.ts
src/modules/notification/application/queries/handlers/get-notifications.handler.ts
src/modules/notification/application/queries/handlers/get-notification-preferences.handler.ts
src/modules/notification/application/queries/handlers/index.ts
src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts
src/modules/notification/application/queries/ports/index.ts
src/modules/notification/infrastructure/persistence/read/notification-read-dao.ts
src/modules/notification/infrastructure/persistence/write/notification.repository.ts
src/modules/notification/infrastructure/http/notification.controller.ts
src/modules/notification/infrastructure/projections/notification-read-model.projection.ts
# Tests
src/modules/notification/infrastructure/http/notification.controller.spec.ts
src/modules/notification/application/commands/handlers/mark-notification-read.handler.spec.ts
src/modules/notification/application/commands/handlers/update-notification-preference.handler.spec.ts
src/modules/notification/application/queries/handlers/get-notifications.handler.spec.ts
src/modules/notification/application/queries/handlers/get-notification-preferences.handler.spec.ts
```

### Files to MODIFY

```
src/modules/notification/notification.module.ts      — wire controllers, providers, exports
src/modules/notification/infrastructure/http/index.ts — export NotificationController
src/modules/notification/infrastructure/persistence/read/index.ts — export NotificationReadDao
src/modules/notification/infrastructure/persistence/write/index.ts — export NotificationRepository
src/modules/notification/infrastructure/projections/index.ts — export projection
src/app.module.ts                                     — add NotificationModule import
```

### Previous Story Learnings (Stories 4.1, 4.2, 4.3)

- All string fields must be trimmed before validation and storage
- Package manager is `bun` — use `bun add` for dependencies (no new deps in this story)
- Fastify is used (not Express) — `FastifyReply` for response manipulation
- `||` not `??` for string fallbacks where empty strings should be falsy
- 479 tests pass at end of Story 4.3 — don't break them
- Mock DAO/repository must include ALL methods in test setup
- `ForbiddenException` available from `src/libs/core/common`
- `ValidationException` for DTO validation, `BusinessRuleException` for domain rules, `NotFoundException` for missing entities
- CommentModule was registered in AppModule during Story 4.2, not 4.1 — follow same pattern: register NotificationModule in AppModule now (Story 4.4)
- `BaseAggregateRepository` constructor: `super(eventBus, outboxRepository, { useOutbox: false })`
- `AggregateRoot.markAsDirty()` is used (not `markAsModified()` as in some documentation)
- DomainErrorCode for notification already added in Story 4.3
- Drizzle schemas already registered in Story 4.3
- `@QueryHandler` and `@CommandHandler` decorators from `src/libs/shared/cqrs`

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source file
- **Controller tests** must cover:
  - `GET /notifications` returns paginated list, auto-filtered by userId
  - `GET /notifications` with pagination params
  - `PUT /notifications/:id/read` marks as read
  - `PUT /notifications/:id/read` for wrong user returns 404
  - `PUT /notifications/read-all` marks all as read
  - `GET /notifications/preferences` returns preferences with defaults
  - `PUT /notifications/preferences` updates preferences
  - `PUT /notifications/preferences` validates input (invalid type, missing fields)
- **MarkNotificationReadHandler tests:**
  - Success: marks notification as read
  - Not found: throws NotFoundException when notification doesn't exist or belongs to different user
- **UpdateNotificationPreferenceHandler tests:**
  - Creates new preference when none exists (upsert insert)
  - Updates existing preference when one exists (upsert update)
  - Validates type and channel values
- **GetNotificationsHandler tests:**
  - Returns paginated results with correct structure `{ data, total, page, totalPages }`
  - Only returns notifications for the requesting user
- **GetNotificationPreferencesHandler tests:**
  - Returns all 16 default preference entries (8 types x 2 channels)
  - Overrides defaults with user's explicit preferences
  - Returns correct default enabled values (email enabled for N-1, N-3, N-5, N-7)
- Run `tsc --noEmit` and `jest` — all pass (479 existing + new)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4] — Acceptance criteria, endpoints
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.6] — Notification module folder structure, schemas, endpoints
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.7] — API endpoint summary for notifications
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-07] — Notification requirements, anti-spam, preferences
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR8] — Notification preferences format
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR9] — Pagination pattern
- [Source: _bmad-output/implementation-artifacts/4-3-notification-module-entities-value-objects-schema.md] — Previous story entities, schemas, error codes
- [Source: src/modules/comment/infrastructure/http/comment.controller.ts] — Controller pattern
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Pagination + list controller pattern
- [Source: src/modules/comment/infrastructure/persistence/read/comment-read-dao.ts] — Read DAO pattern
- [Source: src/modules/comment/infrastructure/persistence/write/comment.repository.ts] — Repository pattern
- [Source: src/modules/comment/comment.module.ts] — Module wiring pattern
- [Source: src/modules/notification/domain/entities/notification.entity.ts] — Notification entity (from 4.3)
- [Source: src/modules/notification/domain/entities/notification.entity.ts] — Notification entity (from 4.3)
- [Source: src/modules/notification/domain/entities/notification-preference.entity.ts] — NotificationPreference entity (from 4.3)

### Review Findings

- [x] [Review][Patch] `PUT ':id/read'` route captures literal `read-all` — declared before `@Put('read-all')`, NestJS matches parameterized route first, breaking AC#4 [notification.controller.ts:87-110]
- [x] [Review][Patch] Unused imports in repository: `outboxRepository`, `DrizzleTransaction` injected but never used — dead code [notification.repository.ts:9,34-36]
- [x] [Review][Patch] `MarkNotificationReadHandler` bypasses domain entity — uses DTO via readDao + raw `updateReadStatus()` instead of loading Notification entity and calling `markAsRead()` [mark-notification-read.handler.ts]
- [x] [Review][Patch] `UpdateNotificationPreferenceDto.preferences` allows empty array — no `@ArrayMinSize(1)`, silently does nothing with 200 OK [update-notification-preference.dto.ts:19-24]
- [x] [Review][Patch] No `@ArrayMaxSize()` on preferences input — DoS vector, client can send thousands of items [update-notification-preference.dto.ts:19-24]
- [x] [Review][Defer] `savePreference` TOCTOU race condition — select-then-insert without unique constraint or transaction [notification.repository.ts:75-98] — deferred, pre-existing schema design from Story 4.3
- [x] [Review][Defer] Batch preference update not atomic — no transaction wrapping multiple saves [update-notification-preference.handler.ts:361-389] — deferred, pre-existing pattern
- [x] [Review][Defer] `save()` duplicate key error on re-insert — no `onConflictDoNothing()` [notification.repository.ts:41] — deferred, retry scenario unlikely in v1
- [x] [Review][Defer] Projection idempotency is in-memory only, lost on restart [notification-read-model.projection.ts:23,38-42] — deferred, follows existing Comment projection pattern
- [x] [Review][Defer] Command handlers missing `REQUEST_CONTEXT_TOKEN` injection [mark-notification-read.handler.ts, mark-all-read.handler.ts] — deferred, no domain events emitted from these handlers
- [x] [Review][Defer] `getById`, `countUnreadByUserId`, `findPreferenceByUserAndTypeAndChannel` declared but unused [i-notification-read-dao.interface.ts] — deferred, API surface for future stories (4.5-4.7)

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 10 tasks implemented: DTOs, commands, queries/ports, read DAO, write repository, command handlers, query handlers, controller, module wiring, tests
- NotificationRepository is standalone (not extending BaseAggregateRepository) because Notification has no version tracking — BaseAggregateRepository.save() calls incrementVersion() which would break for undefined version
- INotificationRepository interface simplified from IAggregateRepository to custom interface with save, getById, updateReadStatus, markAllRead, savePreference
- Made NotificationType.VALID_TYPES and NotificationChannel.VALID_CHANNELS public to support default preferences seeding logic in GetNotificationPreferencesHandler
- Default preferences: lazy initialization in GET /preferences handler — returns 16 entries (8 types x 2 channels), email enabled by default for N-1/N-3/N-5/N-7
- Queries extend IQuery<TResult> (class), commands implement ICommand (interface) — matches existing project patterns
- All endpoints auto-filter by currentUser.userId — no cross-user access possible
- markAllRead uses single bulk UPDATE statement, not individual saves
- 20 new tests: 5 controller + 2 mark-read handler + 4 preference handler + 4 notifications handler + 5 preferences handler
- 499 total tests pass, tsc --noEmit clean

### File List

**Created:**
- src/modules/notification/application/dtos/notification.dto.ts
- src/modules/notification/application/dtos/notification-preference.dto.ts
- src/modules/notification/application/dtos/update-notification-preference.dto.ts
- src/modules/notification/application/dtos/index.ts
- src/modules/notification/application/commands/mark-notification-read.command.ts
- src/modules/notification/application/commands/mark-all-read.command.ts
- src/modules/notification/application/commands/update-notification-preference.command.ts
- src/modules/notification/application/commands/index.ts
- src/modules/notification/application/commands/handlers/mark-notification-read.handler.ts
- src/modules/notification/application/commands/handlers/mark-all-read.handler.ts
- src/modules/notification/application/commands/handlers/update-notification-preference.handler.ts
- src/modules/notification/application/commands/handlers/index.ts
- src/modules/notification/application/queries/get-notifications.query.ts
- src/modules/notification/application/queries/get-notification-preferences.query.ts
- src/modules/notification/application/queries/index.ts
- src/modules/notification/application/queries/handlers/get-notifications.handler.ts
- src/modules/notification/application/queries/handlers/get-notification-preferences.handler.ts
- src/modules/notification/application/queries/handlers/index.ts
- src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts
- src/modules/notification/application/queries/ports/index.ts
- src/modules/notification/infrastructure/persistence/read/notification-read-dao.ts
- src/modules/notification/infrastructure/persistence/write/notification.repository.ts
- src/modules/notification/infrastructure/http/notification.controller.ts
- src/modules/notification/infrastructure/projections/notification-read-model.projection.ts
- src/modules/notification/infrastructure/http/notification.controller.spec.ts
- src/modules/notification/application/commands/handlers/mark-notification-read.handler.spec.ts
- src/modules/notification/application/commands/handlers/update-notification-preference.handler.spec.ts
- src/modules/notification/application/queries/handlers/get-notifications.handler.spec.ts
- src/modules/notification/application/queries/handlers/get-notification-preferences.handler.spec.ts

**Modified:**
- src/modules/notification/domain/repositories/i-notification-repository.interface.ts — custom interface replacing IAggregateRepository<Notification>
- src/modules/notification/domain/value-objects/notification-type.value-object.ts — made VALID_TYPES public
- src/modules/notification/domain/value-objects/notification-channel.value-object.ts — made VALID_CHANNELS public
- src/modules/notification/notification.module.ts — wired controllers, providers, exports
- src/modules/notification/infrastructure/http/index.ts — export NotificationController
- src/modules/notification/infrastructure/persistence/read/index.ts — export NotificationReadDao
- src/modules/notification/infrastructure/persistence/write/index.ts — export NotificationRepository
- src/modules/notification/infrastructure/projections/index.ts — export NotificationReadModelProjection
- src/modules/notification/application/index.ts — barrel exports for dtos, commands, queries
- src/app.module.ts — added NotificationModule import
