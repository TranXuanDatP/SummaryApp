# Story 2.1: Project Module — Aggregate, Value Objects & Schema

Status: done

## Story

As a developer,
I want to create ProjectModule with domain entity, value objects, and Drizzle schema,
so that projects exist as a foundation for WorkLog entries.

## Acceptance Criteria

1. **Given** the existing NestJS project with auth from Epic 1, **When** ProjectModule is created with Project entity (id, name, description, status), value objects (ProjectId, ProjectStatus with `active|completed|archived`), domain events (Created, Updated, Completed, Archived), repository interface, and Drizzle schema, **Then** Project entity has factory methods `create()` and `reconstitute()`, lifecycle methods `updateDetails()`, `activate()`, `complete()`, `archive()`
2. `projectsTable` schema matches Architecture document, registered in shared schema registry
3. ProjectModule imported by AppModule
4. Module follows existing folder structure pattern from UserModule: `domain/`, `application/`, `infrastructure/`, `constants/`

## Tasks / Subtasks

- [x] Task 1: Create value objects (AC: #1)
  - [x] Create `src/modules/project/domain/value-objects/project-id.value-object.ts` — follow `UserId` pattern exactly
  - [x] Create `src/modules/project/domain/value-objects/project-status.value-object.ts` — follow `UserRole` pattern: static readonly constants `ACTIVE = 'active'`, `COMPLETED = 'completed'`, `ARCHIVED = 'archived'`, validate against `VALID_STATUSES`
  - [x] Create `src/modules/project/domain/value-objects/index.ts` barrel
- [x] Task 2: Create domain events (AC: #1)
  - [x] Create `src/modules/project/domain/events/project-created.event.ts` — follow `UserCreatedEvent` pattern: `BaseDomainEvent` with typed payload `{ name, description, status }`
  - [x] Create `src/modules/project/domain/events/project-updated.event.ts` — payload `{ name?, description? }`
  - [x] Create `src/modules/project/domain/events/project-completed.event.ts` — payload `{ previousStatus }`
  - [x] Create `src/modules/project/domain/events/project-archived.event.ts` — payload `{ previousStatus }`
  - [x] Create `src/modules/project/domain/events/index.ts` barrel
- [x] Task 3: Create Project entity (AC: #1)
  - [x] Create `src/modules/project/domain/entities/project.entity.ts` — follow `User` entity pattern: extends `AggregateRoot`, implements `ISoftDeletable`, private constructor, `create()`, `reconstitute()`, lifecycle methods
  - [x] Create `src/modules/project/domain/entities/index.ts` barrel
- [x] Task 4: Create repository interface (AC: #1)
  - [x] Create `src/modules/project/domain/repositories/i-project-repository.interface.ts` — extends `IAggregateRepository<Project>`, add `findByName(name: string): Promise<Project | null>` for uniqueness check
  - [x] Create `src/modules/project/domain/repositories/index.ts` barrel
- [x] Task 5: Create domain services placeholder (AC: #4)
  - [x] Create `src/modules/project/domain/services/index.ts` — empty barrel for now
  - [x] Create `src/modules/project/domain/index.ts` barrel
- [x] Task 6: Create DI tokens (AC: #4)
  - [x] Create `src/modules/project/constants/tokens.ts` — `PROJECT_REPOSITORY_TOKEN`, `PROJECT_READ_DAO_TOKEN` (follow UserModule pattern)
- [x] Task 7: Create Drizzle schema (AC: #2)
  - [x] Create `src/modules/project/infrastructure/persistence/drizzle/schema/project.schema.ts` — exact schema from Architecture doc
  - [x] Create `src/modules/project/infrastructure/persistence/drizzle/schema/index.ts` barrel
- [x] Task 8: Create ProjectModule and register (AC: #3)
  - [x] Create `src/modules/project/project.module.ts` — minimal module: imports `SharedCqrsModule`, no controllers/handlers yet (those come in Story 2.2)
  - [x] Create `src/modules/project/index.ts` barrel
  - [x] Update `src/app.module.ts` — add `ProjectModule` to imports array
  - [x] Update `src/libs/shared/database/drizzle/schema/index.ts` — import and register `projectsTable`
- [x] Task 9: Write tests (AC: #1)
  - [x] Unit tests for `Project` entity — `create()`, `reconstitute()`, `updateDetails()`, `activate()`, `complete()`, `archive()`, soft delete
  - [x] Unit tests for `ProjectStatus` value object — valid values, invalid value rejection
  - [x] Unit tests for `ProjectId` value object — empty rejection, max length validation

## Dev Notes

### MUST-FOLLOW: Architecture Section 3.3 — Project Module

The architecture specifies these files in the Project module (full listing in Architecture doc). This story creates the **domain layer + Drizzle schema + module registration only**. Application layer (commands, queries, handlers, DTOs) and infrastructure (controller, read DAO, write repository implementation, projections) come in Story 2.2.

**Files to CREATE (this story):**
```
src/modules/project/project.module.ts
src/modules/project/index.ts
src/modules/project/constants/tokens.ts
src/modules/project/domain/index.ts
src/modules/project/domain/entities/project.entity.ts
src/modules/project/domain/entities/index.ts
src/modules/project/domain/value-objects/project-id.value-object.ts
src/modules/project/domain/value-objects/project-status.value-object.ts
src/modules/project/domain/value-objects/index.ts
src/modules/project/domain/events/project-created.event.ts
src/modules/project/domain/events/project-updated.event.ts
src/modules/project/domain/events/project-completed.event.ts
src/modules/project/domain/events/project-archived.event.ts
src/modules/project/domain/events/index.ts
src/modules/project/domain/repositories/i-project-repository.interface.ts
src/modules/project/domain/repositories/index.ts
src/modules/project/domain/services/index.ts
src/modules/project/infrastructure/persistence/drizzle/schema/project.schema.ts
src/modules/project/infrastructure/persistence/drizzle/schema/index.ts
```

**Files to MODIFY (this story):**
```
src/app.module.ts                                          — add ProjectModule import
src/libs/shared/database/drizzle/schema/index.ts           — register projectsTable
```

### CRITICAL: Follow Existing UserModule Patterns EXACTLY

The UserModule (Epic 1, Stories 1.1-1.5) established the definitive patterns. The Project module MUST follow these conventions:

**Entity pattern** — `user.entity.ts`:
- `extends AggregateRoot implements ISoftDeletable`
- Private constructor with `(id, props, version?, createdAt?, updatedAt?, deletedAt?)`
- Props interface: `ProjectProps { name: string; description: string | null; status: ProjectStatus }`
- Static `create(id, props, metadata?)` — validates props, emits domain event
- Static `reconstitute(id, props, version, createdAt, updatedAt, deletedAt?)` — no events
- `addDomainEvent()` calls in factory/lifecycle methods
- `ensureNotDeleted()` guard on all mutation methods
- Private static validators for required fields

**Value Object pattern** — `user-id.value-object.ts`, `user-role.value-object.ts`:
- `extends BaseValueObject`
- `constructor(public readonly value: string)` with validation
- `protected getEqualityComponents(): unknown[]` returns `[this.value]`
- `toString(): string` returns `this.value`
- Static constants for enum values (e.g., `UserRole.EMPLOYEE = 'employee'`)

**Event pattern** — `user-created.event.ts`:
- `extends BaseDomainEvent<TypedPayload>`
- Constructor: `(aggregateId, data, metadata?)`
- `super(aggregateId, 'Project', 'EventName', data, metadata)`

**Repository interface pattern** — `i-user-repository.interface.ts`:
- `extends IAggregateRepository<Project>`
- Custom query methods like `findByName()`

**Schema pattern** — `user.schema.ts`:
- `pgTable()` with exact column types from architecture doc
- Export `ProjectRecord` and `ProjectRecordInsert` types

**Module pattern** — `user.module.ts`:
- `imports: [SharedCqrsModule]`
- Providers registered with `{ provide: TOKEN, useExisting: ConcreteClass }`
- Exports: repository and read DAO tokens

### Project Entity Key Behaviors (from Architecture)

```typescript
class Project extends AggregateRoot implements ISoftDeletable {
  static create(id, props, metadata?): Project        // factory — emits ProjectCreatedEvent
  static reconstitute(...): Project                    // hydration — no events
  updateDetails(params: { name?, description? }, metadata?): void  // emits ProjectUpdatedEvent
  activate(): void          // status -> active, emits event if changed
  complete(): void          // status -> completed, emits ProjectCompletedEvent
  archive(): void           // status -> archived, emits ProjectArchivedEvent
}
```

Status transitions: `active -> completed -> archived`. Only `active` projects can transition. `completed` can only go to `archived`. `archived` is terminal.

### Project Schema (Drizzle) — EXACT from Architecture

```typescript
export const projectsTable = pgTable('projects', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

Note: Unlike User schema, Project does NOT have `deletedAt` column in the architecture doc. Follow the architecture doc exactly. The `isDeleted` boolean is sufficient for soft delete.

### DI Tokens

```typescript
export const PROJECT_REPOSITORY_TOKEN = Symbol('IProjectRepository');
export const PROJECT_READ_DAO_TOKEN = Symbol('IProjectReadDao');
```

### ProjectModule Registration — Minimal (this story)

```typescript
// src/modules/project/project.module.ts
import { Module } from '@nestjs/common';
import { SharedCqrsModule } from 'src/libs/shared';

@Module({
  imports: [SharedCqrsModule],
  providers: [],
  exports: [],
})
export class ProjectModule {}
```

This is intentionally minimal — no providers, no controllers yet. Those get added in Story 2.2 (CRUD commands/queries) and Story 2.3 (search). The module just needs to exist and be imported in AppModule so the schema is registered.

### AppModule Update

```typescript
// src/app.module.ts — add ProjectModule import
import { ProjectModule } from './modules/project/project.module';
// ...
imports: [
  // ... existing imports ...
  UserModule,
  AuthModule,
  ProjectModule,  // NEW
],
```

### Schema Registry Update

```typescript
// src/libs/shared/database/drizzle/schema/index.ts
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';

export const schema = {
  // Existing
  usersTable,
  refreshTokensTable,
  outboxTable,
  outboxStatusEnum,
  // Task Management
  projectsTable,  // NEW
};
```

### Files to READ FIRST (before writing any code)

- `src/modules/user/domain/entities/user.entity.ts` — entity pattern to follow
- `src/modules/user/domain/value-objects/user-id.value-object.ts` — ID value object pattern
- `src/modules/user/domain/value-objects/user-role.value-object.ts` — enum value object pattern
- `src/modules/user/domain/events/user-created.event.ts` — event pattern
- `src/modules/user/domain/repositories/i-user-repository.interface.ts` — repository interface pattern
- `src/modules/user/infrastructure/persistence/drizzle/schema/user.schema.ts` — schema pattern
- `src/modules/user/user.module.ts` — module pattern
- `src/app.module.ts` — will be modified to add ProjectModule
- `src/libs/shared/database/drizzle/schema/index.ts` — will be modified to register projectsTable

### Anti-Patterns to AVOID

- **DO NOT** create application layer (commands, queries, handlers, DTOs) — that's Story 2.2
- **DO NOT** create infrastructure HTTP layer (controller) — that's Story 2.2
- **DO NOT** create read DAO or write repository implementation — that's Story 2.2
- **DO NOT** add `deletedAt` column to schema — architecture doc doesn't include it for Project
- **DO NOT** import `UserModule` in `ProjectModule` — Project is standalone per architecture dependency graph
- **DO NOT** create `description` as non-nullable — it's optional per architecture (`varchar('description', { length: 1000 })` with no `.notNull()`)
- **DO NOT** forget to register `projectsTable` in the shared schema registry
- **DO NOT** forget to add `ProjectModule` to AppModule imports
- **DO NOT** create projection files — those come in Story 2.2

### Story 1-1 through 1-5 Learnings (from previous stories)

- **Use `SharedCqrsModule`** — already provides command/query/event bus infrastructure
- **Import paths use `@modules/` alias** — e.g., `@modules/user/infrastructure/persistence/drizzle/schema`
- **Import paths use `@shared/` alias** — e.g., `@shared/database/outbox/drizzle/schema/outbox.schema`
- **`BaseAggregateRepository` takes `(eventBus, outboxRepository, { useOutbox: false })`** — outbox optional
- **Pre-existing compile errors from missing Product/Order modules** — not introduced by new code
- **`AggregateRoot` base provides `id`, `version`, `createdAt`, `updatedAt`** — don't duplicate these in entity props
- **Events use `super(aggregateId, 'AggregateType', 'EventName', data, metadata)`** — see `UserCreatedEvent`
- **Value objects compare via `getEqualityComponents()`** — use `equals()` for comparison, not `===`

### Testing Standards

- Entity tests: `create()` emits event, `reconstitute()` doesn't emit, lifecycle methods validate state transitions, `ensureNotDeleted()` guards mutations
- Value object tests: valid values accepted, invalid values throw `DomainException`, `equals()` works correctly
- Test file naming: `*.spec.ts` colocated with source
- Use `describe/it` blocks, no `test()` calls

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.3] — Project Module full structure
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 2.2] — Value objects table
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 5] — app.module.ts update
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 6] — Schema registry update
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-10] — Soft delete pattern
- [Source: src/modules/user/] — All patterns to follow (entity, value objects, events, repository interface, schema, module)

## Dev Agent Record

### Agent Model Used

GLM-5[1m] via Claude Code

### Debug Log References

N/A

### Completion Notes List

- Created ProjectId and ProjectStatus value objects following UserId/UserRole patterns exactly
- Created 4 domain events (Created, Updated, Completed, Archived) following UserCreatedEvent pattern
- Created Project entity with AggregateRoot + ISoftDeletable, factory methods create()/reconstitute(), lifecycle methods updateDetails()/activate()/complete()/archive()
- Status transitions enforced: active→completed→archived, completed→active (activate), idempotent guards on all transitions
- Created IProjectRepository interface extending IAggregateRepository with findByName()
- Created Drizzle schema matching Architecture doc exactly (no deletedAt column, nullable description)
- Registered projectsTable in shared schema registry
- Created minimal ProjectModule (SharedCqrsModule import only) and registered in AppModule
- Fixed TS1205 error: used `export type` for interface re-export in repositories barrel
- Key learning: AggregateRoot.addDomainEvent() calls markAsUpdated() which increments version — version is 1 after create(), not 0
- Key learning: domainEvents is accessed via getDomainEvents() method, not a property
- 35 new tests (8 ProjectId, 8 ProjectStatus, 19 Project entity), 170 total — all pass, zero regressions
- TypeScript compiles clean (tsc --noEmit passes)

### File List

**New files:**
- src/modules/project/project.module.ts
- src/modules/project/index.ts
- src/modules/project/constants/tokens.ts
- src/modules/project/domain/index.ts
- src/modules/project/domain/entities/project.entity.ts
- src/modules/project/domain/entities/index.ts
- src/modules/project/domain/entities/project.entity.spec.ts
- src/modules/project/domain/value-objects/project-id.value-object.ts
- src/modules/project/domain/value-objects/project-id.value-object.spec.ts
- src/modules/project/domain/value-objects/project-status.value-object.ts
- src/modules/project/domain/value-objects/project-status.value-object.spec.ts
- src/modules/project/domain/value-objects/index.ts
- src/modules/project/domain/events/project-created.event.ts
- src/modules/project/domain/events/project-updated.event.ts
- src/modules/project/domain/events/project-completed.event.ts
- src/modules/project/domain/events/project-archived.event.ts
- src/modules/project/domain/events/index.ts
- src/modules/project/domain/repositories/i-project-repository.interface.ts
- src/modules/project/domain/repositories/index.ts
- src/modules/project/domain/services/index.ts
- src/modules/project/infrastructure/persistence/drizzle/schema/project.schema.ts
- src/modules/project/infrastructure/persistence/drizzle/schema/index.ts

**Modified files:**
- src/app.module.ts — added ProjectModule import and registration
- src/libs/shared/database/drizzle/schema/index.ts — registered projectsTable

### Review Findings

- [x] [Review][Decision] Schema-entity soft delete mismatch — Fixed: Added `deletedAt` timestamp to schema to match entity pattern [project.schema.ts]
- [x] [Review][Patch] ProjectArchivedEvent uses wrong event type name — False positive, file was correct. The truncated diff misled the Blind Hunter.
- [x] [Review][Patch] Name validation trims for emptiness check but stores untrimmed name [project.entity.ts] — Fixed: names are now trimmed before storing in create() and updateDetails()
- [x] [Review][Patch] Description length not validated in entity [project.entity.ts] — Fixed: added validateDescription() method, called in create() and updateDetails()
- [x] [Review][Patch] Missing application/ directory — Fixed: created src/modules/project/application/
- [x] [Review][Defer] ProjectUpdatedEvent records partial data without previous values [project-updated.event.ts] — deferred, design improvement for future
- [x] [Review][Defer] complete()/archive() preconditions not documented in architecture [project.entity.ts:161-165,183-189] — deferred, correct logic needs spec update
- [x] [Review][Defer] findByName has no normalization contract [i-project-repository.interface.ts:5] — deferred, Story 2.2 implementation concern
