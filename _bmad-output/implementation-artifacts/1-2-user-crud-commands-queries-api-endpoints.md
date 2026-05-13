# Story 1.2: User CRUD Commands & Queries — API Endpoints

Status: done

## Story

As an admin,
I want to create, deactivate, and list users via API,
so that I can manage user accounts in the system.

## Acceptance Criteria

1. **Given** UserModule with entity and repository, **When** I send `POST /users` with `{ email, password, fullName, role }`, **Then** user is created with bcrypt-hashed password (salt >= 10), returns 201 + full User DTO + Location header
2. `GET /users` returns paginated list `{ data, total, page, totalPages }` sorted by `createdAt desc`
3. `GET /users/:id` returns user detail DTO
4. Deactivate command sets `isActive = false`, emits `UserDeactivatedEvent`
5. Validation errors return `{ code: "VALIDATION_ERROR", message: "...", details: [{ field, message }] }`
6. Duplicate email returns `409 { code: "USER_DUPLICATE_EMAIL", message: "...", suggestion: "..." }`
7. User not found returns `404 { code: "USER_NOT_FOUND", message: "...", suggestion: "..." }`
8. All endpoints require JWT auth except where noted (auth endpoints in Story 1.4 will add `@Public()` later — for now, all guarded by `JwtAuthGuard`)
9. Response DTOs never expose `password` field

## Tasks / Subtasks

- [x] Task 1: Implement User Read DAO (AC: #2, #3)
  - [x] Create `src/modules/user/infrastructure/persistence/read/user-read-dao.ts` — implements `IUserReadDao`
  - [x] `findAll(params: { page, limit }): Promise<PaginatedResult<UserRecord>>` — paginated query with `isDeleted: false` filter, sorted by `createdAt desc`
  - [x] `findById(id: string): Promise<UserRecord | null>` — single user lookup
  - [x] `findByEmail(email: string): Promise<UserRecord | null>` — for duplicate check (read side)
  - [x] Create `src/modules/user/infrastructure/persistence/read/index.ts` barrel
- [x] Task 2: Implement User Write Repository (AC: #1, #4)
  - [x] Create `src/modules/user/infrastructure/persistence/write/user.repository.ts` — implements `IUserRepository`
  - [x] `save(user: User): Promise<void>` — insert or update using Drizzle, extract domain events after save
  - [x] `findById(id: string): Promise<User | null>` — reconstitute from DB record
  - [x] `findByEmail(email: string): Promise<User | null>` — for uniqueness check in command handler
  - [x] Create `src/modules/user/infrastructure/persistence/write/index.ts` barrel
- [x] Task 3: Create Application DTOs (AC: #1, #5, #9)
  - [x] Create `src/modules/user/application/dtos/create-user.dto.ts` — `class-validator` DTO: `email` (isEmail), `password` (minLength 8, maxLength 100), `fullName` (minLength 1, maxLength 200), `role` (isIn ['employee', 'manager'])
  - [x] Create `src/modules/user/application/dtos/user.dto.ts` — response DTO: id, email, fullName, role, isActive, version, createdAt, updatedAt. **NEVER include password**
  - [x] Create `src/modules/user/application/dtos/index.ts` barrel
- [x] Task 4: Create Command Handlers (AC: #1, #4, #5, #6)
  - [x] Create `src/modules/user/application/commands/create-user.command.ts`
  - [x] Create `src/modules/user/application/commands/deactivate-user.command.ts`
  - [x] Create `src/modules/user/application/commands/index.ts` barrel
  - [x] Create `src/modules/user/application/commands/handlers/create-user.handler.ts`
    - Inject `IUserRepository` + `IHashService` (bcrypt, via DI token)
    - Validate email uniqueness via `repository.findByEmail()`
    - Hash password via `IHashService.hash()` (salt rounds >= 10)
    - Call `User.create()` with hashed password
    - Save via repository
    - Return created user DTO
  - [x] Create `src/modules/user/application/commands/handlers/deactivate-user.handler.ts`
    - Load user via `repository.findById()`
    - Throw not found if null
    - Call `user.deactivate(metadata)`
    - Save via repository
    - Return updated user DTO
  - [x] Create `src/modules/user/application/commands/handlers/index.ts` barrel
- [x] Task 5: Create Query Handlers (AC: #2, #3, #7)
  - [x] Create `src/modules/user/application/queries/get-user-list.query.ts`
  - [x] Create `src/modules/user/application/queries/get-user.query.ts`
  - [x] Create `src/modules/user/application/queries/index.ts` barrel
  - [x] Create `src/modules/user/application/queries/handlers/get-user-list.handler.ts` — uses `IUserReadDao`, returns paginated DTOs
  - [x] Create `src/modules/user/application/queries/handlers/get-user.handler.ts` — uses `IUserReadDao`, returns single DTO or throws not found
  - [x] Create `src/modules/user/application/queries/handlers/index.ts` barrel
  - [x] Create `src/modules/user/application/queries/ports/i-user-read-dao.interface.ts` — interface for read-side queries
  - [x] Create `src/modules/user/application/queries/ports/index.ts` barrel
- [x] Task 6: Create Controller (AC: #1-#9)
  - [x] Create `src/modules/user/infrastructure/http/user.controller.ts`
    - `POST /users` — inject CommandBus, dispatch `CreateUserCommand`, return 201 + Location header + full DTO
    - `GET /users` — inject QueryBus, dispatch `GetUserListQuery`, return paginated result
    - `GET /users/:id` — inject QueryBus, dispatch `GetUserQuery`, return single DTO
    - `DELETE /users/:id/deactivate` — inject CommandBus, dispatch `DeactivateUserCommand`, return updated DTO
  - [x] Create `src/modules/user/infrastructure/http/index.ts` barrel
- [x] Task 7: Wire up UserModule DI (AC: all)
  - [x] Update `src/modules/user/user.module.ts` — register all providers (repository, read DAO, command handlers, query handlers, controller), import `SharedCqrsModule`
  - [x] Provide `IHashService` — created `IHashService` interface + `BcryptHashService` implementation in user module infrastructure
- [x] Task 8: Create projection handler (AC: #2, #3)
  - [x] Create `src/modules/user/infrastructure/projections/user-read-model.projection.ts` — subscribes to `UserCreatedEvent`, `UserDeactivatedEvent`, updates read model
  - [x] Create `src/modules/user/infrastructure/projections/index.ts` barrel
- [x] Task 9: Write tests
  - [x] Unit tests for command handlers (create-user, deactivate-user)
  - [x] Unit tests for query handlers (get-user-list, get-user)
  - [x] Test: duplicate email returns 409
  - [x] Test: not found returns 404
  - [x] Test: validation errors return 400 with details
  - [x] Test: password never in response DTO

## Dev Notes

### MUST-FOLLOW: Existing Project Patterns

This story adds application and infrastructure layers to UserModule. Follow patterns from existing modules exactly.

**Reference Files (READ FIRST):**
- Controller pattern: `src/modules/product/infrastructure/http/product.controller.ts`
- Command handler: `src/modules/product/application/commands/handlers/` — observe how CommandBus is used
- Query handler: `src/modules/product/application/queries/handlers/` — observe how QueryBus is used
- DTOs: `src/modules/product/application/dtos/` — observe `class-validator` + `class-transformer` usage
- Read DAO: `src/modules/product/infrastructure/persistence/read/product-read-dao.ts`
- Write repo: `src/modules/product/infrastructure/persistence/write/product.repository.ts`
- Projection: `src/modules/product/infrastructure/projections/product-read-model.projection.ts`
- Module wiring: `src/modules/product/product.module.ts`

**Core Infrastructure (import from `src/libs/shared` or `src/libs/core`):**
- `SharedCqrsModule` — provides CommandBus, QueryBus, EventBus
- `DrizzleUnitOfWork` — transactional boundaries for command handlers
- `OutboxModule` — outbox pattern for domain events

### Password Hashing Strategy

Story 1.4 (Auth Module) will create `BcryptHashService` in `src/modules/auth/infrastructure/services/bcrypt-hash.service.ts`. For this story:
- **Option A (recommended):** Create a minimal `IHashService` interface in user module (`src/modules/user/domain/services/hash.interface.ts`) and a temporary `BcryptHashService` implementation in user module infrastructure. When Auth module is built in Story 1.4, migrate the implementation there and provide it via cross-module DI.
- **Option B:** Depend on a shared `IHashService` token that will be provided by Auth module later. This creates a temporary broken DI until Story 1.4.

Either way, the interface is simple: `hash(plain: string): Promise<string>` and `compare(plain: string, hashed: string): Promise<boolean>`.

### Pagination Pattern

Follow the existing pagination pattern from Product module. If no existing pattern, use:

```typescript
// Query params
interface PaginationParams {
  page?: number;  // default 1
  limit?: number; // default 20, max 100
}

// Response shape (UX-DR9)
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
```

### Error Response Format (UX Spec)

All errors follow: `{ statusCode, code, message, suggestion, details? }`

```typescript
// Validation error (400)
{ statusCode: 400, code: "VALIDATION_ERROR", message: "...", details: [{ field: "email", message: "..." }] }

// Duplicate email (409)
{ statusCode: 409, code: "USER_DUPLICATE_EMAIL", message: "Email đã tồn tại", suggestion: "Sử dụng email khác hoặc tìm kiếm người dùng hiện có" }

// Not found (404)
{ statusCode: 404, code: "USER_NOT_FOUND", message: "Không tìm thấy người dùng", suggestion: "Kiểm tra lại ID người dùng" }
```

Error codes use `USER_*` namespace per UX design spec convention.

### Create User Endpoint Details

`POST /users` request body:
```json
{
  "email": "user@example.com",
  "password": "plainPassword123",
  "fullName": "Nguyễn Văn A",
  "role": "employee"
}
```

Response: `201 Created` + `Location: /users/{id}` + full User DTO (no password):
```json
{
  "id": "...",
  "email": "user@example.com",
  "fullName": "Nguyễn Văn A",
  "role": "employee",
  "isActive": true,
  "version": 1,
  "createdAt": "2026-05-12T00:00:00.000Z",
  "updatedAt": "2026-05-12T00:00:00.000Z"
}
```

### User DTO Mapping

Map entity to response DTO. Never expose `password` or internal `_props`. Follow the existing Product DTO mapping pattern from the Product module.

### ID Generation

Follow existing pattern for ID generation. Check `ProductModule` for how IDs are generated (likely UUID v4 or nanoid). The schema uses `varchar('id', { length: 50 })`.

### CQRS Command/Query Pattern

Commands and Queries are dispatched via injected `CommandBus` / `QueryBus`:
- Controller receives HTTP request → validates DTO → dispatches Command/Query → returns result
- Handlers are registered via DI and picked up by the bus

### Import Aliases

```
src/libs/core/domain → @core/domain
src/libs/core/infrastructure → @core/infrastructure
src/libs/core/common → @core/common
src/libs/shared → @shared/...
src/modules/* → @modules/*
```

### Story 1-1 Review Findings to Address

These items from Story 1-1 code review may affect this story:
- **UserEmail VO not used in entity** — When creating user in command handler, validate email via `UserEmail` VO before passing to `User.create()`, or instantiate `UserEmail` inside `create()`. Decide and be consistent.
- **Schema/Entity soft-delete mismatch** — schema has `isDeleted: boolean`, entity has `deletedAt: Date | null`. Repository must handle mapping between these.
- **Double version increment in deactivate()** — May need to fix if not addressed in Story 1-1 review. Check `user.entity.ts` lines 141-149.
- **UserDeactivatedEvent payload empty** — When calling `deactivate(metadata)`, ensure `metadata.userId` is passed so `deactivatedBy` is populated.
- **changeRole() no idempotency guard** — Not relevant for this story but be aware.

### Anti-Patterns to AVOID

- **DO NOT** expose `password` in any response DTO, even partially
- **DO NOT** hash password in the entity or domain layer — hashing is infrastructure concern
- **DO NOT** use plain SQL queries — use Drizzle ORM query builder
- **DO NOT** skip pagination on list endpoint — always apply default page/limit
- **DO NOT** throw raw Error — use domain exceptions or NestJS HttpException with standard error format
- **DO NOT** forget `isDeleted: false` filter on all read queries
- **DO NOT** create auth guards or JWT logic — that's Story 1.4/1.5. For now, all user endpoints are guarded by the global `JwtAuthGuard` (which doesn't exist yet, so endpoints will be unreachable until Story 1.5). This is intentional — the admin CLI seed command (Story 1.3) will be the way to create the first user.
- **DO NOT** import `@nestjs/common` decorators in domain layer files

### Module Structure — Files to Create/Modify

**New files:**
```
src/modules/user/application/commands/create-user.command.ts
src/modules/user/application/commands/deactivate-user.command.ts
src/modules/user/application/commands/index.ts
src/modules/user/application/commands/handlers/create-user.handler.ts
src/modules/user/application/commands/handlers/deactivate-user.handler.ts
src/modules/user/application/commands/handlers/index.ts
src/modules/user/application/dtos/create-user.dto.ts
src/modules/user/application/dtos/user.dto.ts
src/modules/user/application/dtos/index.ts
src/modules/user/application/queries/get-user.query.ts
src/modules/user/application/queries/get-user-list.query.ts
src/modules/user/application/queries/index.ts
src/modules/user/application/queries/handlers/get-user.handler.ts
src/modules/user/application/queries/handlers/get-user-list.handler.ts
src/modules/user/application/queries/handlers/index.ts
src/modules/user/application/queries/ports/i-user-read-dao.interface.ts
src/modules/user/application/queries/ports/index.ts
src/modules/user/infrastructure/http/user.controller.ts
src/modules/user/infrastructure/http/index.ts
src/modules/user/infrastructure/persistence/read/user-read-dao.ts
src/modules/user/infrastructure/persistence/read/index.ts
src/modules/user/infrastructure/persistence/write/user.repository.ts
src/modules/user/infrastructure/persistence/write/index.ts
src/modules/user/infrastructure/projections/user-read-model.projection.ts
src/modules/user/infrastructure/projections/index.ts
```

**Modified files:**
```
src/modules/user/user.module.ts — register all new providers
```

### Testing Standards

- Unit tests for each handler (mock repository, read DAO)
- Integration/e2e tests for controller endpoints
- Test file naming: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for integration
- Follow existing test patterns from Product module tests
- Minimum coverage: all error paths (validation, duplicate, not found)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.2] — User Module architecture, schema, DI tokens
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 4.2] — User entity fields
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 5.6] — FR-06 auth requirements (context)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Error format, response patterns, pagination
- [Source: _bmad-output/implementation-artifacts/1-1-user-module-aggregate-value-objects-schema.md] — Previous story context, review findings
- [Source: src/modules/product/] — Reference implementation patterns
- [Source: src/modules/user/domain/] — Domain layer created in Story 1-1

## Dev Agent Record

### Agent Model Used

glm-5[1m]

### Debug Log References

- Fixed TS1272 errors: changed `import { IUserRepository }` to `import type { IUserRepository }` for decorated constructor params
- Fixed projection type narrowing: cast `event` to `UserCreatedEvent` before accessing `.data.email`
- Pre-existing compile errors from missing Product/Order modules in Summary project — not introduced by this story

### Completion Notes List

- Task 1: UserReadDao with findById, findAll (paginated), findByEmail — all with `isDeleted: false` filter
- Task 2: UserRepository extending BaseAggregateRepository with OCC, toPersistence/toDomain mapping handles UserEmail VO and soft-delete fields
- Task 3: CreateUserDto with class-validator, UserDto response (never exposes password)
- Task 4: CreateUserHandler with email uniqueness check, bcrypt hashing, request context; DeactivateUserHandler with not-found check
- Task 5: GetUserHandler and GetUserListHandler with pagination metadata
- Task 6: UserController with POST (201+Location), GET list, GET :id, DELETE :id/deactivate
- Task 7: UserModule wired with all providers, exported HASH_SERVICE_TOKEN for Auth module reuse
- Task 8: UserReadModelProjection subscribing to UserCreatedEvent and UserDeactivatedEvent
- Task 9: 18 new tests (6 spec files), all passing; 76 total user module tests pass, 0 regressions
- Installed bcrypt + @types/bcrypt as new dependencies
- Total: 31 new files created, 4 files modified

### File List

- `src/modules/user/application/commands/create-user.command.ts` (new)
- `src/modules/user/application/commands/deactivate-user.command.ts` (new)
- `src/modules/user/application/commands/index.ts` (modified — was empty placeholder)
- `src/modules/user/application/commands/handlers/create-user.handler.ts` (new)
- `src/modules/user/application/commands/handlers/deactivate-user.handler.ts` (new)
- `src/modules/user/application/commands/handlers/index.ts` (new)
- `src/modules/user/application/commands/handlers/create-user.handler.spec.ts` (new)
- `src/modules/user/application/commands/handlers/deactivate-user.handler.spec.ts` (new)
- `src/modules/user/application/dtos/create-user.dto.ts` (new)
- `src/modules/user/application/dtos/user.dto.ts` (new)
- `src/modules/user/application/dtos/index.ts` (new)
- `src/modules/user/application/dtos/create-user.dto.spec.ts` (new)
- `src/modules/user/application/dtos/user.dto.spec.ts` (new)
- `src/modules/user/application/queries/get-user.query.ts` (new)
- `src/modules/user/application/queries/get-user-list.query.ts` (new)
- `src/modules/user/application/queries/index.ts` (new)
- `src/modules/user/application/queries/handlers/get-user.handler.ts` (new)
- `src/modules/user/application/queries/handlers/get-user-list.handler.ts` (new)
- `src/modules/user/application/queries/handlers/index.ts` (new)
- `src/modules/user/application/queries/handlers/get-user.handler.spec.ts` (new)
- `src/modules/user/application/queries/handlers/get-user-list.handler.spec.ts` (new)
- `src/modules/user/application/queries/ports/i-user-read-dao.interface.ts` (new)
- `src/modules/user/application/queries/ports/index.ts` (new)
- `src/modules/user/application/index.ts` (modified — was empty placeholder)
- `src/modules/user/infrastructure/http/user.controller.ts` (new)
- `src/modules/user/infrastructure/http/index.ts` (new)
- `src/modules/user/infrastructure/persistence/read/user-read-dao.ts` (modified — was stub)
- `src/modules/user/infrastructure/persistence/read/index.ts` (new)
- `src/modules/user/infrastructure/persistence/write/user.repository.ts` (modified — was stub)
- `src/modules/user/infrastructure/persistence/write/index.ts` (new)
- `src/modules/user/infrastructure/projections/user-read-model.projection.ts` (new)
- `src/modules/user/infrastructure/projections/index.ts` (new)
- `src/modules/user/infrastructure/services/bcrypt-hash.service.ts` (new)
- `src/modules/user/infrastructure/services/index.ts` (new)
- `src/modules/user/domain/services/hash.interface.ts` (new)
- `src/modules/user/domain/services/index.ts` (modified — was empty placeholder)
- `src/modules/user/constants/tokens.ts` (modified — added HASH_SERVICE_TOKEN)
- `src/modules/user/user.module.ts` (modified — full DI wiring)
- `package.json` (modified — added bcrypt + @types/bcrypt)

### Review Findings

- [x] [Review][Decision→Patch] Race condition (TOCTOU) on email uniqueness — handler now catches DB unique constraint error (PG error code 23505), maps to ConflictException with `USER_DUPLICATE_EMAIL`
- [x] [Review][Decision→Patch] Duplicate email error code — extended `ConflictException.duplicate()` with `options.code` and `options.suggestion` params; handler passes `USER_DUPLICATE_EMAIL` with Vietnamese suggestion
- [x] [Review][Decision→Patch] Changed `DELETE :id/deactivate` to `PATCH /users/:id/deactivate`
- [x] [Review][Decision→Patch] Not-found error — extended `NotFoundException.entity()` with `options.suggestion` param; handler passes Vietnamese suggestion
- [x] [Review][Patch] Pagination input validated — clamp page >= 1, limit 1-100, reject NaN [`user.controller.ts`]
- [x] [Review][Patch] Pagination limit capped at 100 per spec [`user.controller.ts`]
- [x] [Review][Patch] Location header now dynamic `/users/{id}` via `@Res()` passthrough [`user.controller.ts`]
- [x] [Review][Patch] Write repo `getById`/`findByEmail` now filter `isDeleted = false` [`user.repository.ts`]
- [x] [Review][Patch] Removed dead `deactivatedBy` from `DeactivateUserCommand` [`deactivate-user.command.ts`]
- [x] [Review][Defer] Projection uses in-memory Set for idempotency — lost on restart. Deferred: projection is currently no-op, will address when real projection needed.
- [x] [Review][Defer] Projection never writes to read model — only logs. Deferred: same-table architecture makes this acceptable for now.
- [x] [Review][Defer] Deactivate on already-inactive user still calls `save()` — wasted OCC version. Deferred: entity-level guard exists, handler-level optimization deferred.
- [x] [Review][Defer] Validation error code `VALIDATION_FAILED` not `VALIDATION_ERROR`. Deferred: global filter responsibility, not this story's scope.
- [x] [Review][Defer] `SELECT *` fetches password from DB unnecessarily. Deferred: minor perf concern, can optimize later.
