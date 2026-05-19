# Story 3.1: WorkLog Module — Aggregate, Value Objects & Domain Services

Status: done

## Story

As a developer,
I want to create WorkLogModule with domain entity, value objects, and domain services,
so that the 3-day lock rule and business day logic are enforced at domain level.

## Acceptance Criteria

1. **Given** existing project with auth (Epic 1) and projects (Epic 2), **When** WorkLogModule is created with WorkLog entity (id, projectId, employeeId, executionDate, content, isUnlocked, unlockedBy, unlockedAt, unlockReason), value objects (WorkLogId, ExecutionDate), domain services (BusinessDayCalculator, WorkLogLockPolicy, WithinEditWindowSpecification), **Then** WorkLog entity has factory methods `create()` and `reconstitute()`, lifecycle methods `updateContent()`, `delete()`, `unlock()`, `lock()`, `isWithinEditWindow()`
2. `ExecutionDate` value object rejects future dates and dates beyond 3 business days lookback
3. `BusinessDayCalculator` calculates business days excluding weekends and Vietnamese holidays
4. `WorkLogLockPolicy.isEditable(workLog, calculator)` returns true/false based on 3-day window
5. WorkLog entity `updateContent()` and `delete()` reject changes outside edit window (unless unlocked)
6. `unlock()` records `unlockedBy`, `unlockedAt`, `unlockReason` — mandatory audit trail (C-6)
7. `workLogsTable` Drizzle schema matches Architecture, registered in shared schema registry
8. Domain events: WorkLogCreated, WorkLogUpdated, WorkLogDeleted, WorkLogUnlocked

## Tasks / Subtasks

- [x] Task 1: Create WorkLogId value object (AC: #1)
  - [x] Create `src/modules/work-log/domain/value-objects/work-log-id.value-object.ts` — extends `BaseValueObject`, validates non-empty string, max 50 chars
  - [x] Create `src/modules/work-log/domain/value-objects/index.ts` — barrel export
- [x] Task 2: Create IBusinessDayCalculator interface (AC: #3)
  - [x] Create `src/modules/work-log/domain/services/business-day-calculator.interface.ts` — interface with `isBusinessDay(date)`, `countBusinessDaysBetween(start, end)`, `addBusinessDays(date, days)`, `getEditWindowClosesAt(executionDate)`
  - [x] This interface lives in domain — pure TypeScript, no framework dependency
- [x] Task 3: Create ExecutionDate value object (AC: #2)
  - [x] Create `src/modules/work-log/domain/value-objects/execution-date.value-object.ts` — extends `BaseValueObject`, validates no future dates, validates within 3 business day lookback using `IBusinessDayCalculator`
  - [x] Methods: `isWithinEditWindow(calculator)`, `daysSinceExecution(calculator)`
- [x] Task 4: Create domain events (AC: #8)
  - [x] Create `src/modules/work-log/domain/events/work-log-created.event.ts`
  - [x] Create `src/modules/work-log/domain/events/work-log-updated.event.ts`
  - [x] Create `src/modules/work-log/domain/events/work-log-deleted.event.ts`
  - [x] Create `src/modules/work-log/domain/events/work-log-unlocked.event.ts` — carries unlockedBy, unlockedAt, unlockReason
  - [x] Create `src/modules/work-log/domain/events/index.ts` — barrel export
- [x] Task 5: Create WorkLog entity (AC: #1, #5, #6)
  - [x] Create `src/modules/work-log/domain/entities/work-log.entity.ts` — extends `AggregateRoot implements ISoftDeletable`
  - [x] Factory: `create(id, props, calculator, metadata)` — validates ExecutionDate via calculator
  - [x] Factory: `reconstitute(id, props, version, dates)` — no validation, no events
  - [x] `updateContent(newContent, calculator, metadata)` — rejects if outside edit window and not unlocked
  - [x] `deleteWithCheck(calculator, metadata)` — rejects if outside edit window and not unlocked (renamed from `delete` to avoid ISoftDeletable interface conflict)
  - [x] `unlock(unlockedBy, reason, metadata)` — sets isUnlocked=true, records audit fields, emits WorkLogUnlockedEvent
  - [x] `lock()` — sets isUnlocked=false (auto-lock after employee saves post-unlock)
  - [x] `isWithinEditWindow(calculator)` — delegates to ExecutionDate VO
  - [x] Create `src/modules/work-log/domain/entities/index.ts`
- [x] Task 6: Create domain services (AC: #3, #4)
  - [x] Create `src/modules/work-log/domain/services/work-log-lock-policy.service.ts` — pure domain service with `isEditable(workLog, calculator): boolean`
  - [x] Create `src/modules/work-log/domain/services/index.ts` — barrel export
- [x] Task 7: Create WithinEditWindowSpecification (AC: #4)
  - [x] Create `src/modules/work-log/domain/specifications/within-edit-window.specification.ts` — extends `BaseSpecification<WorkLog>`
  - [x] `isSatisfiedBy(workLog)` — checks if workLog is within edit window or unlocked
  - [x] Create `src/modules/work-log/domain/specifications/index.ts`
- [x] Task 8: Create repository interface (AC: #1)
  - [x] Create `src/modules/work-log/domain/repositories/i-work-log-repository.interface.ts` — extends `IAggregateRepository<WorkLog>`
  - [x] Create `src/modules/work-log/domain/repositories/index.ts`
- [x] Task 9: Create domain barrel exports (AC: all)
  - [x] Create `src/modules/work-log/domain/index.ts` — re-exports entities, value-objects, events, services, repositories, specifications
- [x] Task 10: Create DI tokens (AC: #1)
  - [x] Create `src/modules/work-log/constants/tokens.ts` — `WORK_LOG_REPOSITORY_TOKEN`, `WORK_LOG_READ_DAO_TOKEN`, `BUSINESS_DAY_CALCULATOR_TOKEN`
- [x] Task 11: Create Drizzle schema (AC: #7)
  - [x] Create `src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts` — `workLogsTable` + `workLogsRelations`
  - [x] Create `src/modules/work-log/infrastructure/persistence/drizzle/schema/index.ts`
  - [x] Register in `src/libs/shared/database/drizzle/schema/index.ts`
- [x] Task 12: Write tests (AC: all)
  - [x] `work-log-id.value-object.spec.ts` — valid/empty/too-long
  - [x] `execution-date.value-object.spec.ts` — valid today, future rejected, beyond 3 biz days rejected, weekend handling
  - [x] `work-log.entity.spec.ts` — create, update within/outside window, delete within/outside window, unlock + update + lock, reconstitute
  - [x] `work-log-lock-policy.service.spec.ts` — editable within window, locked outside window, editable when unlocked
  - [x] `within-edit-window.specification.spec.ts` — satisfied when editable, not satisfied when locked

## Dev Notes

### CRITICAL: This is a DOMAIN-ONLY story — No controllers, handlers, or infrastructure services

This story creates ONLY the domain layer (entities, value objects, domain services, specifications, events, repository interfaces) and the Drizzle schema. Application layer (commands, queries, handlers, DTOs), infrastructure (controllers, read DAOs, write repositories), and module registration will come in Stories 3.2-3.9.

**DO NOT create:**
- No `work-log.module.ts`
- No controllers
- No command/query handlers
- No read DAOs or write repositories (only the interface)
- No DTOs (application layer)

### MUST-FOLLOW: Existing Codebase Patterns

Every file must follow the exact patterns established by Project and User modules:

**Import paths:**
- Core domain: `import { AggregateRoot, ISoftDeletable, DomainException, IEventMetadata } from 'src/libs/core/domain'`
- Domain events: `import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain'`
- Value objects: `import { BaseValueObject, DomainException } from 'src/libs/core/domain'`
- Specifications: `import { BaseSpecification, ISpecification } from 'src/libs/core/domain'`
- Shared CQRS: `import { CommandHandler } from 'src/libs/shared/cqrs'`
- Cross-module imports use `@modules/` alias (e.g., `@modules/auth/...`)

**Entity pattern (follow `project.entity.ts` exactly):**
```typescript
export class WorkLog extends AggregateRoot implements ISoftDeletable {
  private _props: WorkLogProps;
  private _deletedAt?: Date | null = null;

  private constructor(id: WorkLogId, props: WorkLogProps, version?, createdAt?, updatedAt?, deletedAt?) {
    super(id.value, version, createdAt, updatedAt);
    this._props = props;
    this._deletedAt = deletedAt;
  }

  static create(id, props, calculator, metadata?): WorkLog { ... }
  static reconstitute(id, props, version, createdAt, updatedAt, deletedAt?): WorkLog { ... }
  // lifecycle methods...
}
```

**Value object pattern (follow `project-id.value-object.ts`):**
```typescript
export class WorkLogId extends BaseValueObject {
  constructor(public readonly value: string) {
    super();
    // validation...
  }
  protected getEqualityComponents(): unknown[] { return [this.value]; }
  toString(): string { return this.value; }
}
```

**Event pattern (follow `project-created.event.ts`):**
```typescript
export class WorkLogCreatedEvent extends BaseDomainEvent<WorkLogCreatedEventData> {
  constructor(aggregateId: string, data: WorkLogCreatedEventData, metadata?: IEventMetadata) {
    super(aggregateId, 'WorkLog', 'WorkLogCreated', data, metadata);
  }
}
```

### WorkLog Entity Design

**Props interface:**
```typescript
export interface WorkLogProps {
  projectId: string;
  employeeId: string;
  executionDate: Date;
  content: string;
  isUnlocked: boolean;
  unlockedBy: string | null;
  unlockedAt: Date | null;
  unlockReason: string | null;
}
```

**Key entity methods — follow these signatures exactly:**

`create(id, props, calculator, metadata?)`:
- Validates content is non-empty
- Creates `ExecutionDate` value object (which validates future/lookback)
- Sets `isUnlocked = false`, `unlockedBy = null`, `unlockedAt = null`, `unlockReason = null`
- Emits `WorkLogCreatedEvent`

`updateContent(newContent, calculator, metadata?)`:
- Calls `ensureNotDeleted()`
- Checks edit window: if `!isWithinEditWindow(calculator)` AND `!isUnlocked` → throw `DomainException` with message suggesting contact manager
- Updates content, marks modified, emits `WorkLogUpdatedEvent`

`delete(calculator, metadata?)`:
- Calls `ensureNotDeleted()`
- Same edit window check as updateContent
- Calls `this.delete()` from ISoftDeletable
- Emits `WorkLogDeletedEvent`

`unlock(unlockedBy, reason, metadata?)`:
- Sets `isUnlocked = true`, `unlockedBy`, `unlockedAt = new Date()`, `unlockReason = reason`
- reason is mandatory — throw if empty
- Emits `WorkLogUnlockedEvent` with full audit data

`lock()`:
- Resets `isUnlocked = false` (called after employee saves post-unlock update)

`isWithinEditWindow(calculator)`:
- Delegates to ExecutionDate value object's `isWithinEditWindow(calculator)`
- OR returns true if `isUnlocked` is true

### ExecutionDate Value Object Design

```typescript
export class ExecutionDate extends BaseValueObject {
  constructor(public readonly value: Date, calculator?: IBusinessDayCalculator) {
    super();
    // Skip validation if no calculator (for reconstitute path)
    if (calculator) {
      this.validateNotFuture(value);
      this.validateWithinLookback(value, calculator);
    }
  }

  isWithinEditWindow(calculator: IBusinessDayCalculator): boolean {
    // 3 business days from executionDate = edit window
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const businessDaysSince = calculator.countBusinessDaysBetween(this.value, now);
    return businessDaysSince <= 3;
  }

  private validateNotFuture(date: Date): void {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (date > now) {
      throw new DomainException('Execution date cannot be in the future');
    }
  }

  private validateWithinLookback(date: Date, calculator: IBusinessDayCalculator): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const businessDaysSince = calculator.countBusinessDaysBetween(date, now);
    if (businessDaysSince > 3) {
      throw new DomainException('Execution date is beyond 3 business day lookback window');
    }
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value.toISOString()];
  }
}
```

**IMPORTANT:** The `calculator` parameter is optional in the constructor. When `undefined`, skip validation — this is the reconstitute path (loading from DB). The `create()` factory path always provides the calculator.

### IBusinessDayCalculator Interface Design

```typescript
export interface IBusinessDayCalculator {
  /** Check if a date is a business day (not weekend, not holiday) */
  isBusinessDay(date: Date): boolean;

  /** Count business days between start (exclusive) and end (inclusive) */
  countBusinessDaysBetween(start: Date, end: Date): number;

  /** Add N business days to a date */
  addBusinessDays(date: Date, days: number): Date;

  /** Calculate when the edit window closes for a given execution date */
  getEditWindowClosesAt(executionDate: Date): Date;
}
```

**Vietnamese holidays for 2026 (hardcode initially):**
- Jan 1: New Year's Day
- Jan 29-31: Tet (Lunar New Year) — adjust per year
- Feb 1-2: Tet holiday
- Apr 30: Reunification Day
- May 1: International Labor Day
- Sep 2: National Day

The interface lives in domain. A concrete implementation (with holiday config) will be in infrastructure — but this story does NOT create it. Tests can use a simple stub.

### WorkLogLockPolicy Design

```typescript
export class WorkLogLockPolicy {
  isEditable(workLog: WorkLog, calculator: IBusinessDayCalculator): boolean {
    if (workLog.isUnlocked) return true;
    return workLog.isWithinEditWindow(calculator);
  }
}
```

### WithinEditWindowSpecification Design

```typescript
export class WithinEditWindowSpecification extends BaseSpecification<WorkLog> {
  constructor(private readonly calculator: IBusinessDayCalculator) {
    super();
  }

  isSatisfiedBy(workLog: WorkLog): boolean {
    return workLog.isWithinEditWindow(this.calculator);
  }
}
```

### Drizzle Schema

```typescript
// src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts
import { pgTable, varchar, text, timestamp, boolean, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

export const workLogsTable = pgTable('work_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  projectId: varchar('project_id', { length: 50 }).notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  executionDate: timestamp('execution_date').notNull(),
  content: text('content').notNull(),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  unlockedBy: varchar('unlocked_by', { length: 50 }),
  unlockedAt: timestamp('unlocked_at'),
  unlockReason: text('unlock_reason'),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workLogsRelations = relations(workLogsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [workLogsTable.projectId],
    references: [projectsTable.id],
  }),
  employee: one(usersTable, {
    fields: [workLogsTable.employeeId],
    references: [usersTable.id],
  }),
}));

export type WorkLogRecord = typeof workLogsTable.$inferSelect;
export type WorkLogRecordInsert = typeof workLogsTable.$inferInsert;
```

**Register in `src/libs/shared/database/drizzle/schema/index.ts`:**
```typescript
import { workLogsTable, workLogsRelations } from '@modules/work-log/infrastructure/persistence/drizzle/schema';

export const schema = {
  // ...existing...
  workLogsTable,
  workLogsRelations,
};
```

### DI Tokens

```typescript
// src/modules/work-log/constants/tokens.ts
export const WORK_LOG_REPOSITORY_TOKEN = Symbol('IWorkLogRepository');
export const WORK_LOG_READ_DAO_TOKEN = Symbol('IWorkLogReadDao');
export const BUSINESS_DAY_CALCULATOR_TOKEN = Symbol('IBusinessDayCalculator');
```

### Domain Events Data Shapes

```typescript
// WorkLogCreatedEvent
{ projectId, employeeId, executionDate, content }

// WorkLogUpdatedEvent
{ content }

// WorkLogDeletedEvent
{ deletedAt }

// WorkLogUnlockedEvent — C-6 audit trail
{ unlockedBy, unlockedAt, unlockReason }
```

### Files to CREATE

```
src/modules/work-log/domain/entities/work-log.entity.ts
src/modules/work-log/domain/entities/index.ts
src/modules/work-log/domain/value-objects/work-log-id.value-object.ts
src/modules/work-log/domain/value-objects/execution-date.value-object.ts
src/modules/work-log/domain/value-objects/index.ts
src/modules/work-log/domain/events/work-log-created.event.ts
src/modules/work-log/domain/events/work-log-updated.event.ts
src/modules/work-log/domain/events/work-log-deleted.event.ts
src/modules/work-log/domain/events/work-log-unlocked.event.ts
src/modules/work-log/domain/events/index.ts
src/modules/work-log/domain/services/business-day-calculator.interface.ts
src/modules/work-log/domain/services/work-log-lock-policy.service.ts
src/modules/work-log/domain/services/index.ts
src/modules/work-log/domain/specifications/within-edit-window.specification.ts
src/modules/work-log/domain/specifications/index.ts
src/modules/work-log/domain/repositories/i-work-log-repository.interface.ts
src/modules/work-log/domain/repositories/index.ts
src/modules/work-log/domain/index.ts
src/modules/work-log/constants/tokens.ts
src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts
src/modules/work-log/infrastructure/persistence/drizzle/schema/index.ts
```

**Files to MODIFY:**
```
src/libs/shared/database/drizzle/schema/index.ts — register workLogsTable + workLogsRelations
```

### Anti-Patterns to AVOID

- **DO NOT** create `work-log.module.ts` — that's for a later story
- **DO NOT** create any controllers, command handlers, or query handlers
- **DO NOT** create read DAOs or write repository implementations — only the interface
- **DO NOT** create DTOs — those belong to application layer (Story 3.2+)
- **DO NOT** import anything from `@nestjs/common` in domain layer files — domain must be pure TypeScript
- **DO NOT** use `Date.now()` directly in entity methods — receive calculator as parameter for testability
- **DO NOT** put holiday list in domain services — that's infrastructure configuration; interface only in domain
- **DO NOT** forget `ISoftDeletable` interface — WorkLog uses soft delete for audit trail
- **DO NOT** forget that `reconstitute()` does NOT emit events and does NOT validate business rules
- **DO NOT** forget the unique constraint note in Architecture: `(project_id, employee_id, execution_date, is_deleted)` — but this is DB-level, not domain level; just note it in a comment in schema

### Previous Story Learnings (Epic 2)

From Stories 2.1-2.4 implementation:
- **Use `SharedCqrsModule`** for CQRS bus infrastructure
- **`CommandHandlers` array spread in module** — add handler to array is sufficient
- **All handlers follow same pattern:** `@CommandHandler(CommandClass)`, inject token, execute, return DTO
- **Import paths use `@modules/` and `@shared/` aliases** — Jest moduleNameMapper only maps these
- **Spec import paths:** Use barrel exports (`../ports` not `../../ports/i-xxx.interface`) — wrong paths caused TS2307
- **`@CommandHandler` decorator** from `src/libs/shared/cqrs` (re-export of @nestjs/cqrs)
- **`BaseAggregateRepository`** handles event publishing + optimistic concurrency — just extend it
- **Schema registration:** Add to `src/libs/shared/database/drizzle/schema/index.ts` barrel
- **Repository interface** extends `IAggregateRepository<T>` which provides `save()`, `getById()`, `delete()`
- **Project entity uses `private constructor`** with `static create()` and `static reconstitute()` — follow this pattern
- **`delete()` on entity sets `_deletedAt`** — ISoftDeletable pattern
- **Entity uses `ensureNotDeleted()`** guard before mutations — follow this pattern

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Value object tests: valid input, empty input, boundary input
- Entity tests: create success, create with invalid props, update within/outside window, unlock flow, reconstitute
- Domain service tests: mock the calculator interface
- Specification tests: verify `isSatisfiedBy` with various states
- Run `tsc --noEmit` after all changes
- Use a simple `StubBusinessDayCalculator` for tests that implements `IBusinessDayCalculator`

### Project Structure Notes

- Module name: `work-log` (kebab-case, matching architecture doc)
- Domain follows invariant structure: `entities/`, `value-objects/`, `events/`, `services/`, `specifications/`, `repositories/`
- Each folder has `index.ts` barrel export
- `domain/index.ts` re-exports from all sub-folders

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.4] — WorkLog module architecture
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 2.3] — Value objects table
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-01] — WorkLog management requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 4.5] — Business constraints C-1 through C-7
- [Source: src/modules/project/domain/entities/project.entity.ts] — Entity pattern to follow
- [Source: src/modules/project/domain/value-objects/project-id.value-object.ts] — VO pattern to follow
- [Source: src/modules/project/domain/events/project-created.event.ts] — Event pattern to follow
- [Source: src/libs/core/domain/specifications/specification.interface.ts] — Specification pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

- Renamed `delete(calculator, metadata)` to `deleteWithCheck(calculator, metadata)` — `ISoftDeletable.delete()` interface requires no-params signature, causing TS2416 conflict
- Tests for "outside edit window" scenarios use `WorkLog.reconstitute()` to create WorkLog instances that bypass constructor validation, then check edit window with a calculator returning >3 days

### Completion Notes List

- All 12 tasks completed
- 21 new files created, 1 file modified (schema registry)
- WorkLog entity: create/reconstitute/updateContent/deleteWithCheck/unlock/lock/isWithinEditWindow
- ExecutionDate VO: validates no future dates, no beyond 3-business-day lookback, optional calculator for reconstitute path
- IBusinessDayCalculator interface: pure TypeScript, no framework deps
- WorkLogLockPolicy: isEditable checks unlocked flag then edit window
- WithinEditWindowSpecification: extends BaseSpecification<WorkLog>
- 4 domain events: Created, Updated, Deleted, Unlocked (with C-6 audit trail)
- Drizzle schema with workLogsTable + workLogsRelations, registered in shared schema registry
- 36/36 test suites pass, 259/259 tests pass, tsc --noEmit clean

### File List

**New files:**
- src/modules/work-log/domain/entities/work-log.entity.ts
- src/modules/work-log/domain/entities/index.ts
- src/modules/work-log/domain/value-objects/work-log-id.value-object.ts
- src/modules/work-log/domain/value-objects/execution-date.value-object.ts
- src/modules/work-log/domain/value-objects/index.ts
- src/modules/work-log/domain/events/work-log-created.event.ts
- src/modules/work-log/domain/events/work-log-updated.event.ts
- src/modules/work-log/domain/events/work-log-deleted.event.ts
- src/modules/work-log/domain/events/work-log-unlocked.event.ts
- src/modules/work-log/domain/events/index.ts
- src/modules/work-log/domain/services/business-day-calculator.interface.ts
- src/modules/work-log/domain/services/work-log-lock-policy.service.ts
- src/modules/work-log/domain/services/index.ts
- src/modules/work-log/domain/specifications/within-edit-window.specification.ts
- src/modules/work-log/domain/specifications/index.ts
- src/modules/work-log/domain/repositories/i-work-log-repository.interface.ts
- src/modules/work-log/domain/repositories/index.ts
- src/modules/work-log/domain/index.ts
- src/modules/work-log/constants/tokens.ts
- src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts
- src/modules/work-log/infrastructure/persistence/drizzle/schema/index.ts
- src/modules/work-log/domain/value-objects/work-log-id.value-object.spec.ts
- src/modules/work-log/domain/value-objects/execution-date.value-object.spec.ts
- src/modules/work-log/domain/entities/work-log.entity.spec.ts
- src/modules/work-log/domain/services/work-log-lock-policy.service.spec.ts
- src/modules/work-log/domain/specifications/within-edit-window.specification.spec.ts

**Modified files:**
- src/libs/shared/database/drizzle/schema/index.ts — registered workLogsTable + workLogsRelations

### Senior Developer Review (AI)

**Review Date:** 2026-05-18
**Review Outcome:** Changes Requested
**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### Action Items

- [x] [Review][Decision] `delete()` vs `deleteWithCheck()` — Decision 1C: removed ISoftDeletable, merged into single `delete(calculator, metadata)` method that enforces edit window. [work-log.entity.ts:84,181]
- [x] [Review][Decision] `lock()` should it clear unlock audit metadata? Decision 2A: `lock()` now clears all unlock fields (unlockedBy, unlockedAt, unlockReason) and calls markAsModified. [work-log.entity.ts:234]
- [x] [Review][Decision] Content max length — Decision 3A: added 5000 char max validation in create() and updateContent(). [work-log.entity.ts:102]
- [x] [Review][Patch] Date mutation vulnerability — fixed: ExecutionDate stores defensive copy, WorkLog.create copies executionDate, getter returns copy. [execution-date.value-object.ts:4, work-log.entity.ts:61]
- [x] [Review][Patch] `unlock()` idempotency — fixed: early return if already unlocked, preserves original audit trail. [work-log.entity.ts:204]
- [x] [Review][Patch] `unlockedBy` validation — fixed: added emptiness check for unlockedBy param. [work-log.entity.ts:204]
- [x] [Review][Patch] Non-null assertion on `_deletedAt` — fixed: inline delete + event in single method, no non-null assertion needed. [work-log.entity.ts:198]
- [x] [Review][Patch] `projectId`/`employeeId` validation — fixed: added static validation methods for emptiness and max 50 chars. [work-log.entity.ts:96]
- [x] [Review][Defer] TOCTOU on edit window check — check-then-act pattern. Deferred: handled by optimistic concurrency at infrastructure level (version field). [work-log.entity.ts:152,181]
- [x] [Review][Defer] No IBusinessDayCalculator infrastructure implementation — deferred: out of scope for this domain-only story. [business-day-calculator.interface.ts]
- [x] [Review][Defer] No domain-level C-7 enforcement (employee ownership) — deferred: application layer concern, not domain entity responsibility.
- [x] [Review][Defer] No C-3 uniqueness enforcement (project+employee+date) — deferred: noted in schema comment, will be DB migration + application handler check.
- [x] [Review][Defer] ExecutionDate validation skipped in isWithinEditWindow path — deferred: by design for reconstitute path, same pattern as Project entity.
- [x] [Review][Defer] Schema `isDeleted` boolean vs entity `deletedAt` date dual source — deferred: follows existing Project entity pattern, repository handles mapping.
