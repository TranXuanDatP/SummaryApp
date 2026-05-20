# Story 4.1: Comment Module -- Entity, Value Objects & Schema

Status: review

## Story

As a developer,
I want to create CommentModule with domain entity and Drizzle schema,
so that comments can be persisted as manager feedback on WorkLogs.

## Acceptance Criteria

1. **Given** WorkLogModule exists from Epic 3, **When** CommentModule is created, **Then** Comment entity has `create()`, `reconstitute()`, `updateContent()` factory/lifecycle methods
2. **Comment entity fields:** id, workLogId, authorId, content — with soft delete support (`isDeleted`, `deletedAt`)
3. **CommentId value object** validates non-empty string, max 50 chars — follows exact pattern of `WorkLogId`
4. **Domain events:** `CommentCreatedEvent`, `CommentUpdatedEvent`, `CommentDeletedEvent` — emitted on respective lifecycle actions
5. **`ICommentRepository` interface** extends `IAggregateRepository<Comment>` — marker interface pattern
6. **`commentsTable` Drizzle schema** matches Architecture spec with `relations` to `workLogsTable` and `usersTable`
7. **Schema registered** in shared schema registry at `src/libs/shared/database/drizzle/schema/index.ts`
8. **CommentModule** imports `WorkLogModule` and `UserModule`
9. **DI tokens:** `COMMENT_REPOSITORY_TOKEN` and `COMMENT_READ_DAO_TOKEN` in `constants/tokens.ts`
10. **DomainErrorCode entries** added for Comment validation errors

## Tasks / Subtasks

- [x] Task 1: Create Comment module folder structure and barrel exports (AC: #8)
  - [x] Create `src/modules/comment/` with subfolders: `domain/`, `application/`, `infrastructure/`, `constants/`
  - [x] Create `index.ts` barrel files in each subfolder
  - [x] Create `comment.module.ts` — imports `SharedCqrsModule`, `WorkLogModule`, `UserModule`; empty providers/controllers for now
- [x] Task 2: Create CommentId value object (AC: #3)
  - [x] Create `src/modules/comment/domain/value-objects/comment-id.value-object.ts` — extends `BaseValueObject`, validates non-empty + max 50 chars, throws `DomainException` with `DomainErrorCode.COMMENT_ID_EMPTY` / `COMMENT_ID_TOO_LONG`
  - [x] Create `src/modules/comment/domain/value-objects/index.ts` — barrel export
- [x] Task 3: Add DomainErrorCode entries for Comment (AC: #10)
  - [x] Update `src/libs/core/domain/exceptions/domain-error-code.ts` — add `COMMENT_ID_EMPTY`, `COMMENT_ID_TOO_LONG`, `COMMENT_CONTENT_REQUIRED`, `COMMENT_CONTENT_TOO_LONG`, `COMMENT_ALREADY_DELETED`
- [x] Task 4: Create Comment entity (AC: #1, #2)
  - [x] Create `src/modules/comment/domain/entities/comment.entity.ts` — extends `AggregateRoot`
  - [x] Implement `Props` interface: `workLogId: string`, `authorId: string`, `content: string`
  - [x] Implement private constructor with `id: CommentId`, `props`, `version`, `createdAt`, `updatedAt`, `_deletedAt`
  - [x] Implement `static create()` — validates content (non-empty, max 2000 chars), constructs entity, emits `CommentCreatedEvent`, returns entity
  - [x] Implement `static reconstitute()` — takes raw string id, props, version, timestamps, `deletedAt`; wraps id in `CommentId`; no events
  - [x] Implement `updateContent(newContent, metadata?)` — validates content, calls `markAsDirty()`, emits `CommentUpdatedEvent`
  - [x] Implement `delete(metadata?)` — calls `ensureNotDeleted()`, sets `_deletedAt`, emits `CommentDeletedEvent`
  - [x] Implement `ensureNotDeleted()` — throws `DomainException` with `COMMENT_ALREADY_DELETED` if deleted
  - [x] Getters: `workLogId`, `authorId`, `content`, `isDeleted`, `deletedAt`
  - [x] Create `src/modules/comment/domain/entities/index.ts` — barrel export
- [x] Task 5: Create domain events (AC: #4)
  - [x] Create `src/modules/comment/domain/events/comment-created.event.ts` — extends `BaseDomainEvent`, aggregateType `'Comment'`, eventName `'CommentCreated'`, data: `{ workLogId, authorId, content }`
  - [x] Create `src/modules/comment/domain/events/comment-updated.event.ts` — data: `{ content }`
  - [x] Create `src/modules/comment/domain/events/comment-deleted.event.ts` — data: `{}`
  - [x] Create `src/modules/comment/domain/events/index.ts` — barrel export
- [x] Task 6: Create repository interface (AC: #5)
  - [x] Create `src/modules/comment/domain/repositories/i-comment-repository.interface.ts` — `extends IAggregateRepository<Comment>`
  - [x] Create `src/modules/comment/domain/repositories/index.ts` — barrel export
  - [x] Create `src/modules/comment/domain/services/index.ts` — empty barrel (no domain services needed)
  - [x] Create `src/modules/comment/domain/index.ts` — barrel export aggregating entities, value-objects, events, repositories, services
- [x] Task 7: Create DI tokens (AC: #9)
  - [x] Create `src/modules/comment/constants/tokens.ts` — `COMMENT_REPOSITORY_TOKEN = Symbol('ICommentRepository')`, `COMMENT_READ_DAO_TOKEN = Symbol('ICommentReadDao')`
  - [x] Create `src/modules/comment/constants/index.ts` — barrel export
- [x] Task 8: Create Drizzle schema with relations (AC: #6, #7)
  - [x] Create `src/modules/comment/infrastructure/persistence/drizzle/schema/comment.schema.ts`
  - [x] Define `commentsTable` using `pgTable('comments', { ... })`
  - [x] Define `commentsRelations` with `one()` relations to `workLogsTable` (via `workLogId`) and `usersTable` (via `authorId`)
  - [x] Export `CommentRecord` and `CommentRecordInsert` inferred types
  - [x] Update `src/libs/shared/database/drizzle/schema/index.ts` — import and register `commentsTable`, `commentsRelations`
- [x] Task 9: Write tests (AC: all)
  - [x] Create `src/modules/comment/domain/entities/comment.entity.spec.ts` — test `create()` validation (empty content, too long), `reconstitute()`, `updateContent()` (valid + invalid), `delete()` + `ensureNotDeleted()`, event emission on create/update/delete, `isDeleted` getter
  - [x] Create `src/modules/comment/domain/value-objects/comment-id.value-object.spec.ts` — test valid id, empty id throws, too long id throws
  - [x] Run `tsc --noEmit` and `jest` — all pass (371 existing + new tests)

## Dev Notes

### MUST-FOLLOW: Exact Code Patterns

Follow the WorkLog module patterns EXACTLY. Read these files before implementing:

**Entity pattern:** `src/modules/work-log/domain/entities/work-log.entity.ts`
- `extends AggregateRoot`, private constructor, `_deletedAt` for soft delete
- `create()` — static factory, validates, constructs, calls `addDomainEvent()`, returns entity
- `reconstitute()` — static, takes raw `string` id (wraps in VO), no events
- `delete()` — calls `ensureNotDeleted()`, sets `_deletedAt`, emits event
- `markAsDirty()` on update — updates `updatedAt`, does NOT increment version (repository handles that)

**Value object pattern:** `src/modules/work-log/domain/value-objects/work-log-id.value-object.ts`
- `extends BaseValueObject`, validates in constructor, `getEqualityComponents()` returns `[this.value]`

**Event pattern:** `src/modules/work-log/domain/events/work-log-created.event.ts`
- `extends BaseDomainEvent<TData>`, super gets `(aggregateId, 'Comment', 'CommentCreated', data, metadata)`

**Repository interface:** `src/modules/work-log/domain/repositories/i-work-log-repository.interface.ts`
- Marker interface: `extends IAggregateRepository<Comment>`

**Schema pattern:** `src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts`
- `pgTable` + `relations` + inferred types, imports from other modules for FK relations

**Schema registry:** `src/libs/shared/database/drizzle/schema/index.ts`
- Import and add to `schema` object

**Module pattern:** `src/modules/work-log/work-log.module.ts`
- `@Module`, `useExisting` alias pattern, `SharedCqrsModule` import

**DI tokens:** `src/modules/work-log/constants/tokens.ts`
- `Symbol('InterfaceName')` pattern

### Comment Entity Specifics

Comment is simpler than WorkLog — no domain services needed (no `IBusinessDayCalculator` equivalent). The entity:

```typescript
interface CommentProps {
  workLogId: string;
  authorId: string;
  content: string;
}
```

**`create()` validation:**
- `content`: non-empty after trim, max 2000 chars → `COMMENT_CONTENT_REQUIRED` / `COMMENT_CONTENT_TOO_LONG`
- `workLogId`: non-empty → `DomainException` (basic presence check)
- `authorId`: non-empty → `DomainException` (basic presence check)

**`updateContent()` validation:**
- Same content validation as `create()`
- Calls `markAsDirty()` then `addDomainEvent(new CommentUpdatedEvent(...))`

**`delete()` flow:**
- Calls `ensureNotDeleted()` (throws `COMMENT_ALREADY_DELETED` if already deleted)
- Sets `this._deletedAt = new Date()`
- Emits `CommentDeletedEvent`

### Drizzle Schema (from Architecture)

```typescript
import { pgTable, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
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
```

### CommentModule (Minimal for Story 4.1)

Story 4.1 only creates the domain layer and schema. The module file is minimal — no controllers, no providers yet (those come in Story 4.2). But it MUST import `WorkLogModule` and `UserModule` per architecture spec.

```typescript
import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';
import { WorkLogModule } from '@modules/work-log/work-log.module';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [SharedCqrsModule, WorkLogModule, UserModule],
  providers: [],
  exports: [],
})
export class CommentModule {}
```

**IMPORTANT:** Do NOT register `CommentModule` in `AppModule` yet — that happens in Story 4.2 when the controller and handlers are added. Story 4.1 creates the module class but doesn't wire it into the app.

### Anti-Patterns to AVOID

- **DO NOT** add any infrastructure implementations (repository, read DAO, controller, handlers) — those are Story 4.2
- **DO NOT** add `CommentModule` to `AppModule` imports — that comes with Story 4.2
- **DO NOT** create `application/commands/` or `application/queries/` yet — Story 4.2 scope
- **DO NOT** add `@Roles()` or auth decorators — no controller in this story
- **DO NOT** forget `version`, `isDeleted`, `deletedAt` columns in the Drizzle schema — optimistic concurrency + soft delete
- **DO NOT** forget `updatedAt` column uses `.defaultNow()` (same as `createdAt`) — Drizzle handles update triggers
- **DO NOT** use `text` for `id`, `workLogId`, or `authorId` — use `varchar` with `length: 50`
- **DO NOT** forget to import `workLogsTable` and `usersTable` in the schema file for relations
- **DO NOT** emit domain events in `reconstitute()` — only `create()` and lifecycle methods emit events
- **DO NOT** forget to add new error codes to `DomainErrorCode` enum — not just throw strings
- **DO NOT** create domain services interface unless needed — Comment entity has no domain service dependencies

### Files to CREATE

```
src/modules/comment/comment.module.ts
src/modules/comment/index.ts
src/modules/comment/constants/tokens.ts
src/modules/comment/constants/index.ts
src/modules/comment/domain/entities/comment.entity.ts
src/modules/comment/domain/entities/comment.entity.spec.ts
src/modules/comment/domain/entities/index.ts
src/modules/comment/domain/value-objects/comment-id.value-object.ts
src/modules/comment/domain/value-objects/comment-id.value-object.spec.ts
src/modules/comment/domain/value-objects/index.ts
src/modules/comment/domain/events/comment-created.event.ts
src/modules/comment/domain/events/comment-updated.event.ts
src/modules/comment/domain/events/comment-deleted.event.ts
src/modules/comment/domain/events/index.ts
src/modules/comment/domain/repositories/i-comment-repository.interface.ts
src/modules/comment/domain/repositories/index.ts
src/modules/comment/domain/services/index.ts
src/modules/comment/domain/index.ts
src/modules/comment/application/index.ts
src/modules/comment/infrastructure/index.ts
src/modules/comment/infrastructure/persistence/drizzle/schema/comment.schema.ts
src/modules/comment/infrastructure/persistence/drizzle/schema/index.ts
src/modules/comment/infrastructure/persistence/index.ts
```

### Files to MODIFY

```
src/libs/core/domain/exceptions/domain-error-code.ts   — add Comment error codes
src/libs/core/domain/exceptions/index.ts               — ensure re-export (verify)
src/libs/shared/database/drizzle/schema/index.ts       — register commentsTable + commentsRelations
```

### Previous Story Learnings (Stories 3.1-3.9)

- Controller injects `QUERY_BUS_TOKEN` — Comment follows same DI token pattern
- `user.userId` is the correct field for employee ID; `user.role` for role check
- Use `ValidationException` for validation errors, NOT `BadRequestException`
- Mock DAO must include ALL methods in test setup
- Package manager is `bun` — use `bun add` for dependencies (no new deps in this story)
- All existing tests (371 at end of Epic 3) must pass — don't break them
- Value object tests: test valid, empty, too-long, and equality
- Entity tests: test create validation, reconstitute, update validation, delete + double-delete, event emission
- Fastify is used (not Express)
- `||` not `??` for string fallbacks where empty strings should be falsy

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source file
- Entity tests must cover:
  - `create()` — valid creation, emits `CommentCreatedEvent`
  - `create()` — empty content throws `DomainException` with `COMMENT_CONTENT_REQUIRED`
  - `create()` — content > 2000 chars throws `DomainException` with `COMMENT_CONTENT_TOO_LONG`
  - `create()` — empty workLogId/authorId throws `DomainException`
  - `reconstitute()` — preserves all fields including `deletedAt`
  - `reconstitute()` — does NOT emit events
  - `updateContent()` — valid update, emits `CommentUpdatedEvent`
  - `updateContent()` — empty content throws
  - `delete()` — sets `isDeleted` true, emits `CommentDeletedEvent`
  - `delete()` on already deleted — throws `COMMENT_ALREADY_DELETED`
  - `isDeleted` getter — false by default, true after delete
- Value object tests must cover: valid id, empty throws, too long throws, equality
- Run `tsc --noEmit` and `jest` — all pass (371 existing + new tests)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1] — Acceptance criteria, dependencies
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.5] — Comment module schema, relations, folder structure
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 2.2] — Entity relationships
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 6] — Schema registry
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-3] — Comment is separate module, not nested in WorkLog
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-10] — Soft delete follows ISoftDeletable pattern
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-04] — Comment requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR11] — DTOs return display names (authorName) — for Story 4.2
- [Source: src/modules/work-log/domain/entities/work-log.entity.ts] — Entity pattern to follow
- [Source: src/modules/work-log/domain/value-objects/work-log-id.value-object.ts] — Value object pattern
- [Source: src/modules/work-log/domain/events/work-log-created.event.ts] — Event pattern
- [Source: src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts] — Schema pattern

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 9 tasks implemented: module structure, CommentId VO, error codes, entity, domain events, repository interface, DI tokens, Drizzle schema, tests
- Comment entity follows exact WorkLog entity patterns: create/reconstitute/updateContent/delete with domain events
- Soft delete via `isDeleted` boolean + `deletedAt` timestamp
- Content validation: non-empty, max 2000 chars
- Drizzle schema with FK relations to `workLogsTable` and `usersTable`, registered in shared schema registry
- DomainErrorCode enum extended with 9 Comment error codes (5 original + 4 from code review fix)
- CommentModule imports WorkLogModule + UserModule (not registered in AppModule yet — Story 4.2 scope)
- 31 new tests (8 VO + 23 entity), all 402 tests pass, tsc --noEmit clean
- Code review: fixed 6 patch findings (wrong error codes, missing length validation, content trimming, delete event data, test gaps)

### File List

**Created:**
- src/modules/comment/comment.module.ts
- src/modules/comment/index.ts
- src/modules/comment/constants/tokens.ts
- src/modules/comment/constants/index.ts
- src/modules/comment/domain/entities/comment.entity.ts
- src/modules/comment/domain/entities/comment.entity.spec.ts
- src/modules/comment/domain/entities/index.ts
- src/modules/comment/domain/value-objects/comment-id.value-object.ts
- src/modules/comment/domain/value-objects/comment-id.value-object.spec.ts
- src/modules/comment/domain/value-objects/index.ts
- src/modules/comment/domain/events/comment-created.event.ts
- src/modules/comment/domain/events/comment-updated.event.ts
- src/modules/comment/domain/events/comment-deleted.event.ts
- src/modules/comment/domain/events/index.ts
- src/modules/comment/domain/repositories/i-comment-repository.interface.ts
- src/modules/comment/domain/repositories/index.ts
- src/modules/comment/domain/services/index.ts
- src/modules/comment/domain/index.ts
- src/modules/comment/application/index.ts
- src/modules/comment/infrastructure/index.ts
- src/modules/comment/infrastructure/http/index.ts
- src/modules/comment/infrastructure/persistence/index.ts
- src/modules/comment/infrastructure/persistence/drizzle/schema/comment.schema.ts
- src/modules/comment/infrastructure/persistence/drizzle/schema/index.ts
- src/modules/comment/infrastructure/persistence/read/index.ts
- src/modules/comment/infrastructure/persistence/write/index.ts
- src/modules/comment/infrastructure/services/index.ts
- src/modules/comment/infrastructure/projections/index.ts

**Modified:**
- src/libs/core/domain/exceptions/domain-error-code.ts — added 5 Comment error codes
- src/libs/shared/database/drizzle/schema/index.ts — registered commentsTable + commentsRelations

### Review Findings

- [x] [Review][Patch] Wrong error code for `authorId` validation — reused `COMMENT_ID_EMPTY` instead of dedicated code. Added `COMMENT_AUTHOR_ID_REQUIRED` + `COMMENT_AUTHOR_ID_TOO_LONG` error codes. [comment.entity.ts:65]
- [x] [Review][Patch] Wrong error code for `workLogId` validation — reused `WORKLOG_ID_EMPTY` (cross-domain). Added `COMMENT_WORKLOG_ID_REQUIRED` + `COMMENT_WORKLOG_ID_TOO_LONG` error codes. [comment.entity.ts:62]
- [x] [Review][Patch] No max-length validation for `workLogId`/`authorId` — schema uses `varchar(50)` but entity only checked emptiness. Added 50-char length checks. [comment.entity.ts:64,70]
- [x] [Review][Patch] `CommentDeletedEvent` carried empty data — no `deletedAt` timestamp. Now includes `{ deletedAt: ISO string }`. [comment.entity.ts:113, comment-deleted.event.ts]
- [x] [Review][Patch] Content validation inconsistency — max-length checked raw string, not trimmed. Now validates trimmed length; entity stores trimmed content on create and update. [comment.entity.ts:63-69,98-102,validateContent]
- [x] [Review][Patch] Missing whitespace-only tests for `workLogId`/`authorId` — added test coverage. [comment.entity.spec.ts]
- [x] [Review][Defer] Drizzle relations are query-only, no DB-level FK constraints — pre-existing architectural pattern across all modules. [comment.schema.ts] — deferred, pre-existing

#### Review 2 (2026-05-20) — 3-layer adversarial (Blind Hunter, Edge Case Hunter, Acceptance Auditor)

- [x] [Review][Patch] `CommentCreatedEvent` carried untrimmed `props.content` while entity stored trimmed — event now uses `trimmedContent`. [comment.entity.ts:80]
- [x] [Review][Patch] `CommentDeletedEventData.deletedAt` typed optional but always provided — made required, removed default `= {}`. [comment-deleted.event.ts:4]
- [x] [Review][Patch] `workLogId`/`authorId` length validated on raw string but emptiness checked on trimmed — now trims before all validation and stores trimmed values. [comment.entity.ts:61-84]
- [x] [Review][Patch] `CommentId` VO stored whitespace-padded value — now trims before validation and storage. [comment-id.value-object.ts:4-14]
- [x] [Review][Defer] `isDeleted` boolean in schema vs `_deletedAt`-derived in entity — dual source of truth risk. Pre-existing pattern across WorkLog/Project modules. [comment.schema.ts] — deferred, pre-existing
- [x] [Review][Defer] No DB-level FK constraints on `workLogId`/`authorId` — ORM relations only. Pre-existing architectural decision. [comment.schema.ts] — deferred, pre-existing
