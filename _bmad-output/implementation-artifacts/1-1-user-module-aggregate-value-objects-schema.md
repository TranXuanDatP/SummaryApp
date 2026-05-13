# Story 1.1: User Module — Aggregate, Value Objects & Schema

Status: done

## Story

As a developer,
I want to create UserModule with domain entity, value objects, and Drizzle schema,
so that user identity is available as foundation for the entire system.

## Acceptance Criteria

1. **Given** the existing NestJS DDD/CQRS project, **When** UserModule is created with User entity (id, email, password, fullName, role, isActive), value objects (UserId, UserEmail, UserRole), domain events (UserCreatedEvent, UserDeactivatedEvent), repository interface, and Drizzle schema, **Then** User entity has factory methods `create()` and `reconstitute()`, lifecycle methods `deactivate()`, `reactivate()`, `changeRole()`
2. `usersTable` schema matches Architecture document, registered in shared schema registry
3. Module follows folder structure: domain/, application/, infrastructure/, constants/
4. All files follow existing project patterns exactly (see Dev Notes)

## Tasks / Subtasks

- [x] Task 1: Create module skeleton & DI tokens (AC: #3)
  - [x] Create `src/modules/user/user.module.ts` — bare module, imports `SharedCqrsModule`
  - [x] Create `src/modules/user/constants/tokens.ts` — `USER_REPOSITORY_TOKEN`, `USER_READ_DAO_TOKEN`
  - [x] Create all barrel `index.ts` files for each subfolder (domain/, application/, infrastructure/, constants/)
- [x] Task 2: Create domain value objects (AC: #1, #3)
  - [x] Create `src/modules/user/domain/value-objects/user-id.value-object.ts` — extends `BaseValueObject`, validates non-empty string <= 50 chars
  - [x] Create `src/modules/user/domain/value-objects/user-email.value-object.ts` — extends `BaseValueObject`, validates email format via regex
  - [x] Create `src/modules/user/domain/value-objects/user-role.value-object.ts` — extends `BaseValueObject`, validates `'employee' | 'manager'` enum values
  - [x] Create `src/modules/user/domain/value-objects/index.ts` barrel
- [x] Task 3: Create domain events (AC: #1)
  - [x] Create `src/modules/user/domain/events/user-created.event.ts` — extends `BaseDomainEvent<UserCreatedEventData>`, aggregateType `'User'`, eventType `'UserCreated'`
  - [x] Create `src/modules/user/domain/events/user-deactivated.event.ts` — extends `BaseDomainEvent<UserDeactivatedEventData>`, aggregateType `'User'`, eventType `'UserDeactivated'`
  - [x] Create `src/modules/user/domain/events/index.ts` barrel
- [x] Task 4: Create User entity (AC: #1)
  - [x] Create `src/modules/user/domain/entities/user.entity.ts` — extends `AggregateRoot`, implements `ISoftDeletable`
  - [x] Implement `create()` factory — validates invariants, emits `UserCreatedEvent`
  - [x] Implement `reconstitute()` factory — no events, hydration only
  - [x] Implement `deactivate(metadata?)` — sets `isActive = false`, emits `UserDeactivatedEvent`
  - [x] Implement `reactivate()` — sets `isActive = true`
  - [x] Implement `changeRole(newRole)` — validates role, updates `_props.role`
  - [x] Implement `delete()` / `restore()` for `ISoftDeletable`
  - [x] Create `src/modules/user/domain/entities/index.ts` barrel
- [x] Task 5: Create repository interface (AC: #1, #3)
  - [x] Create `src/modules/user/domain/repositories/i-user-repository.interface.ts` — extends `IAggregateRepository<User>`, adds `findByEmail(email: string)`
  - [x] Create `src/modules/user/domain/repositories/index.ts` barrel
  - [x] Create `src/modules/user/domain/services/index.ts` (empty for now)
  - [x] Create `src/modules/user/domain/index.ts` barrel
- [x] Task 6: Create Drizzle schema & register in shared schema registry (AC: #2)
  - [x] Create `src/modules/user/infrastructure/persistence/drizzle/schema/user.schema.ts` — `usersTable` with columns matching Architecture spec exactly
  - [x] Create `src/modules/user/infrastructure/persistence/drizzle/schema/index.ts` barrel
  - [x] Update `src/libs/shared/database/drizzle/schema/index.ts` — import and register `usersTable`
- [x] Task 7: Wire up UserModule (AC: #3)
  - [x] Create placeholder infrastructure files: `user-read-dao.ts` (empty class stub), `user.repository.ts` (empty class stub)
  - [x] Create placeholder application layer: empty query/command ports
  - [x] Register providers and exports in `user.module.ts` following `ProductModule` pattern
  - [x] Register `UserModule` in `app.module.ts` imports array

## Dev Notes

### MUST-FOLLOW: Existing Project Patterns

This is the **first new module** in this project. You MUST replicate patterns from the existing `ProductModule` exactly. Read these reference files before writing any code:

**Reference Files (READ FIRST):**
- Entity pattern: `src/modules/product/domain/entities/product.entity.ts`
- Value Object pattern: `src/modules/product/domain/value-objects/product-id.value-object.ts`
- Event pattern: `src/modules/product/domain/events/product-created.event.ts`
- Repository interface: `src/modules/product/domain/repositories/product.repository.interface.ts`
- Drizzle schema: `src/modules/product/infrastructure/persistence/drizzle/schema/product.schema.ts`
- Module wiring: `src/modules/product/product.module.ts`
- DI tokens: `src/modules/product/constants/tokens.ts`
- Schema registry: `src/libs/shared/database/drizzle/schema/index.ts`

**Core Base Classes (import from `src/libs/core/domain`):**
- `AggregateRoot` — base class for entities (`src/libs/core/domain/entities/aggregate-root.ts`)
- `BaseValueObject` — base class for value objects (`src/libs/core/domain/value-objects/base.value-object.ts`)
- `BaseDomainEvent<TData>` — base class for domain events (`src/libs/core/domain/events/domain-event.interface.ts`)
- `ISoftDeletable` — interface for soft delete (`src/libs/core/domain/entities/interfaces/soft-deletable.interface.ts`)
- `DomainException` — for invariant violations (`src/libs/core/domain/exceptions/domain.exception.ts`)
- `IEventMetadata` — event metadata interface (`src/libs/core/domain/events/domain-event.interface.ts`)
- `IAggregateRepository<T>` — repository interface (`src/libs/core/domain/repositories/aggregate-repository.interface.ts`)

### User Entity Specifics

```typescript
// UserProps interface
interface UserProps {
  email: string;
  password: string;     // bcrypt hash, never plaintext
  fullName: string;
  role: UserRole;       // value object
  isActive: boolean;
}

// Entity structure (follow Product entity pattern):
// - Private constructor, public factory methods
// - _props pattern for encapsulation
// - _deletedAt for ISoftDeletable
// - Getters return primitives or value objects (never expose _props directly)
// - ensureNotDeleted() guard on all mutation methods
// - Static validators for create() factory
```

**User entity invariants to enforce in `create()`:**
- `email`: non-empty, valid email format (validated by UserEmail VO)
- `password`: non-empty string (hashing happens at application layer, NOT here)
- `fullName`: non-empty, max 200 chars
- `role`: must be `'employee'` or `'manager'` (validated by UserRole VO)
- `isActive`: defaults to `true`

**Key difference from Product:** User has `deactivate()` / `reactivate()` instead of just `delete()` / `restore()`. Both patterns coexist — `deactivate` is a business action (sets `isActive = false`), `delete` is soft-delete for data removal. Implement both.

### Drizzle Schema — EXACT Column Definitions

```typescript
// src/modules/user/infrastructure/persistence/drizzle/schema/user.schema.ts
export const usersTable = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'employee' | 'manager'
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type UserRecord = typeof usersTable.$inferSelect;
export type UserRecordInsert = typeof usersTable.$inferInsert;
```

**Schema registration** — add to `src/libs/shared/database/drizzle/schema/index.ts`:
```typescript
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';

export const schema = {
  // Existing...
  usersTable,
};
```

### Domain Event Payloads

```typescript
// UserCreatedEvent data
interface UserCreatedEventData {
  email: string;
  fullName: string;
  role: string;
}

// UserDeactivatedEvent data
interface UserDeactivatedEventData {
  deactivatedBy?: string; // userId of who performed action
}
```

### Value Object Patterns

```typescript
// UserId — mirrors ProductId exactly
class UserId extends BaseValueObject {
  constructor(public readonly value: string) { /* validate non-empty, <= 50 */ }
  protected getEqualityComponents(): unknown[] { return [this.value]; }
  toString(): string { return this.value; }
}

// UserEmail — email validation
class UserEmail extends BaseValueObject {
  constructor(public readonly value: string) {
    super();
    // Validate email format with regex
    // Throw DomainException if invalid
  }
  protected getEqualityComponents(): unknown[] { return [this.value]; }
}

// UserRole — enum validation
class UserRole extends BaseValueObject {
  static readonly EMPLOYEE = 'employee';
  static readonly MANAGER = 'manager';
  constructor(public readonly value: string) {
    super();
    // Validate value is one of EMPLOYEE | MANAGER
  }
  protected getEqualityComponents(): unknown[] { return [this.value]; }
}
```

### Repository Interface

```typescript
interface IUserRepository extends IAggregateRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  // NOTE: findByEmail is for WRITE side uniqueness check
  // Read-side queries go through IUserReadDao (created in Story 1.2)
}
```

### Module Structure (EXACT file list)

```
src/modules/user/
├── user.module.ts
├── index.ts
├── constants/
│   ├── tokens.ts
│   └── index.ts (if needed)
├── domain/
│   ├── index.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── user-id.value-object.ts
│   │   ├── user-email.value-object.ts
│   │   ├── user-role.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── user-created.event.ts
│   │   ├── user-deactivated.event.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-user-repository.interface.ts
│   │   └── index.ts
│   └── services/
│       └── index.ts
├── application/
│   ├── index.ts
│   ├── commands/ (empty for now — Story 1.2)
│   ├── queries/ (empty for now — Story 1.2)
│   └── dtos/ (empty for now — Story 1.2)
├── infrastructure/
│   ├── index.ts
│   ├── http/ (empty for now — Story 1.2)
│   └── persistence/
│       ├── index.ts
│       ├── drizzle/schema/
│       │   ├── user.schema.ts
│       │   └── index.ts
│       ├── read/ (stub for Story 1.2)
│       └── write/ (stub for Story 1.2)
```

### Anti-Patterns to AVOID

- **DO NOT** hash passwords in the entity. Password hashing is an infrastructure concern (BcryptHashService in AuthModule). The entity stores whatever string is passed in.
- **DO NOT** create application layer handlers, controllers, or DTOs. Those are Story 1.2.
- **DO NOT** import `@nestjs/common` or any NestJS decorator in domain layer files. Domain is pure TypeScript.
- **DO NOT** add `relations()` in user.schema.ts. Relations will be added when WorkLog/Comment modules reference usersTable.
- **DO NOT** create a full repository implementation — only the interface. Implementation is Story 1.2.
- **DO NOT** use UUID v4 for IDs. Follow existing pattern: `varchar('id', { length: 50 })`. ID generation strategy TBD at application layer.
- **DO NOT** use `enum` pg type for `role` column. Use `varchar` with string values per architecture spec.

### Import Aliases

The project uses TypeScript path aliases:
- `src/libs/core/domain` → `@core/domain`
- `src/libs/core/infrastructure` → `@core/infrastructure`
- `src/libs/core/common` → `@core/common`
- `src/libs/core/constants` → `@core/constants`
- `src/libs/shared` → `@shared/...`
- `src/modules/*` → `@modules/*`

**In domain layer**, import from `src/libs/core/domain` (use relative or alias path — check Product entity imports for the exact path style used).

### Project Structure Notes

- Module location: `src/modules/user/` — follows existing convention (`src/modules/product/`, `src/modules/order/`)
- This is Phase 1 in implementation order (Architecture Section 9) — all subsequent modules depend on UserModule
- UserModule is standalone — does NOT import any other new module
- Schema table name: `users` (lowercase, plural) — matches Drizzle convention

### References

- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.2] — User Module architecture, schema, entity behaviors
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 4.2] — User entity fields and business rules
- [Source: src/modules/product/] — Reference implementation for all patterns
- [Source: src/libs/core/domain/] — Base classes (AggregateRoot, BaseValueObject, BaseDomainEvent, ISoftDeletable, DomainException)
- [Source: src/libs/shared/database/drizzle/schema/index.ts] — Schema registry to update
- [Source: src/app.module.ts] — Module registration to update

## Dev Agent Record

### Agent Model Used

glm-5[1m]

### Debug Log References

- Fixed jest config: `roots` referenced non-existent `<rootDir>/libs`, changed to `<rootDir>/src`; added `src/libs` moduleNameMapper
- getDomainEvents() returns deep copies, so tests use `eventType` checks instead of `instanceof`

### Completion Notes List

- ✅ Task 1: Module skeleton with DI tokens, barrel files for all subfolders
- ✅ Task 2: UserId (non-empty, <=50), UserEmail (regex), UserRole (employee|manager) — 22 tests passing
- ✅ Task 3: UserCreatedEvent, UserDeactivatedEvent extending BaseDomainEvent — 7 tests passing
- ✅ Task 4: User entity with create/reconstitute/deactivate/reactivate/changeRole/delete/restore — 22 tests passing
- ✅ Task 5: IUserRepository interface extending IAggregateRepository with findByEmail
- ✅ Task 6: usersTable Drizzle schema matching Architecture spec, registered in shared schema registry
- ✅ Task 7: UserModule wired with DI providers, registered in AppModule
- Total: 51 new tests, 0 regressions, TypeScript compiles clean

### File List

- `src/modules/user/user.module.ts` (new)
- `src/modules/user/index.ts` (new)
- `src/modules/user/constants/tokens.ts` (new)
- `src/modules/user/constants/index.ts` (new)
- `src/modules/user/domain/value-objects/user-id.value-object.ts` (new)
- `src/modules/user/domain/value-objects/user-email.value-object.ts` (new)
- `src/modules/user/domain/value-objects/user-role.value-object.ts` (new)
- `src/modules/user/domain/value-objects/index.ts` (new)
- `src/modules/user/domain/value-objects/user-id.value-object.spec.ts` (new)
- `src/modules/user/domain/value-objects/user-email.value-object.spec.ts` (new)
- `src/modules/user/domain/value-objects/user-role.value-object.spec.ts` (new)
- `src/modules/user/domain/events/user-created.event.ts` (new)
- `src/modules/user/domain/events/user-deactivated.event.ts` (new)
- `src/modules/user/domain/events/index.ts` (new)
- `src/modules/user/domain/events/user-created.event.spec.ts` (new)
- `src/modules/user/domain/events/user-deactivated.event.spec.ts` (new)
- `src/modules/user/domain/entities/user.entity.ts` (new)
- `src/modules/user/domain/entities/index.ts` (new)
- `src/modules/user/domain/entities/user.entity.spec.ts` (new)
- `src/modules/user/domain/repositories/i-user-repository.interface.ts` (new)
- `src/modules/user/domain/repositories/index.ts` (new)
- `src/modules/user/domain/services/index.ts` (new)
- `src/modules/user/domain/index.ts` (new)
- `src/modules/user/infrastructure/persistence/drizzle/schema/user.schema.ts` (new)
- `src/modules/user/infrastructure/persistence/drizzle/schema/index.ts` (new)
- `src/modules/user/infrastructure/persistence/write/user.repository.ts` (new)
- `src/modules/user/infrastructure/persistence/read/user-read-dao.ts` (new)
- `src/modules/user/infrastructure/persistence/index.ts` (new)
- `src/modules/user/infrastructure/index.ts` (new)
- `src/modules/user/application/index.ts` (new)
- `src/libs/shared/database/drizzle/schema/index.ts` (modified — added usersTable)
- `src/app.module.ts` (modified — registered UserModule)
- `package.json` (modified — fixed jest roots and moduleNameMapper)

ư### Review Findings

- [x] [Review][Decision→Patch] `UserEmail` VO used in entity — `UserProps.email` changed to `UserEmail`, getter returns VO
- [x] [Review][Decision→Patch] Schema soft-delete aligned — added `deletedAt: timestamp('deleted_at')` to schema
- [x] [Review][Decision→Patch] `UserReactivatedEvent` created and emitted from `reactivate()`
- [x] [Review][Decision→Patch] `isActive` added to `UserCreatedEventData`
- [x] [Review][Patch] Double version increment fixed — removed `markAsModified()` from `deactivate()` since `addDomainEvent` already updates version [`user.entity.ts`]
- [x] [Review][Patch] `deactivatedBy` populated from `metadata?.userId` [`user.entity.ts`]
- [x] [Review][Patch] Idempotency guard added to `changeRole()` — early return if role unchanged [`user.entity.ts`]
- [x] [Review][Defer] Password validation too weak — only checks non-empty after trim, no min/max length. Deferred: validation requirements TBD at application layer per spec ("hashing happens at application layer").
- [x] [Review][Defer] `UserEmail` regex rejects internationalized emails (RFC 6531). Deferred: business requirement unclear, current scope uses ASCII emails.
- [x] [Review][Defer] `delete()`/`restore()` don't emit domain events. Deferred: pre-existing pattern from Product entity, not introduced by this change.
