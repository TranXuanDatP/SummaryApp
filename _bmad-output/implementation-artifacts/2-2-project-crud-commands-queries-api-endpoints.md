# Story 2.2: Project CRUD — Commands, Queries & API Endpoints

Status: done

## Story

As any authenticated user,
I want to create, update, list, and view projects via API,
so that I can organize my work by project.

## Acceptance Criteria

1. **Given** ProjectModule with entity and repository, **When** I send `POST /projects` with `{ name, description? }`, **Then** project created with status `active`, returns 201 + full Project DTO + Location header
2. **Given** projects exist, **When** I send `GET /projects`, **Then** returns paginated list `{ data, total, page, totalPages }` ordered by `createdAt desc`
3. **Given** a project exists, **When** I send `GET /projects/:id`, **Then** returns project detail DTO
4. **Given** a project exists, **When** I send `PUT /projects/:id` with `{ name?, description? }`, **Then** updates project — only `JwtAuthGuard` required (both roles per C-4)
5. All read queries apply `isDeleted: false` filter (soft delete)

## Tasks / Subtasks

- [x] Task 1: Create DTOs (AC: #1, #3, #4)
  - [x] Create `src/modules/project/application/dtos/project.dto.ts` — follow `UserDto` pattern: class with constructor params `{ id, name, description, status, version, createdAt, updatedAt }`
  - [x] Create `src/modules/project/application/dtos/create-project.dto.ts` — follow `CreateUserDto`: `class-validator` decorators (`@IsString`, `@MinLength(1)`, `@MaxLength(200)` for name; `@IsOptional()`, `@IsString()`, `@MaxLength(1000)` for description)
  - [x] Create `src/modules/project/application/dtos/update-project.dto.ts` — `name` and `description` both optional with same validation rules
  - [x] Create `src/modules/project/application/dtos/index.ts` barrel
- [x] Task 2: Create commands (AC: #1, #4)
  - [x] Create `src/modules/project/application/commands/create-project.command.ts` — `implements ICommand`, constructor `(name: string, description: string | null)`
  - [x] Create `src/modules/project/application/commands/update-project.command.ts` — `implements ICommand`, constructor `(id: string, name?: string, description?: string | null)`
  - [x] Create `src/modules/project/application/commands/index.ts` barrel
- [x] Task 3: Create command handlers (AC: #1, #4)
  - [x] Create `src/modules/project/application/commands/handlers/create-project.handler.ts` — `@CommandHandler(CreateProjectHandler)`, inject `PROJECT_REPOSITORY_TOKEN` + optional `REQUEST_CONTEXT_TOKEN`, check duplicate name via `findByName()`, call `Project.create()`, save, return `ProjectDto`
  - [x] Create `src/modules/project/application/commands/handlers/update-project.handler.ts` — `@CommandHandler(UpdateProjectHandler)`, load project, throw `NotFoundException` if null, call `project.updateDetails()`, save, return `ProjectDto`
  - [x] Create `src/modules/project/application/commands/handlers/index.ts` barrel
- [x] Task 4: Create queries and ports (AC: #2, #3)
  - [x] Create `src/modules/project/application/queries/ports/i-project-read-dao.interface.ts` — `findById(id): Promise<ProjectDto | null>`, `findAll(params): Promise<{ data, total }>`, `findByName(name): Promise<ProjectDto | null>`
  - [x] Create `src/modules/project/application/queries/ports/index.ts` barrel
  - [x] Create `src/modules/project/application/queries/get-project.query.ts` — `extends IQuery<ProjectDto>`, constructor `(id: string)`
  - [x] Create `src/modules/project/application/queries/get-project-list.query.ts` — `extends IQuery<{data, total, page, totalPages}>`, constructor `(page, limit)`
  - [x] Create `src/modules/project/application/queries/index.ts` barrel
- [x] Task 5: Create query handlers (AC: #2, #3)
  - [x] Create `src/modules/project/application/queries/handlers/get-project.handler.ts` — `@QueryHandler(GetProjectHandler)`, inject `PROJECT_READ_DAO_TOKEN`, throw `NotFoundException` if null
  - [x] Create `src/modules/project/application/queries/handlers/get-project-list.handler.ts` — `@QueryHandler(GetProjectListHandler)`, inject `PROJECT_READ_DAO_TOKEN`, compute `totalPages`
  - [x] Create `src/modules/project/application/queries/handlers/index.ts` barrel
- [x] Task 6: Create read DAO (AC: #2, #3, #5)
  - [x] Create `src/modules/project/infrastructure/persistence/read/project-read-dao.ts` — follow `UserReadDao` exactly: `extends BaseReadDao implements IProjectReadDao`, inject `DATABASE_READ_TOKEN`, `findById()`, `findAll()` with pagination, `findByName()`, all with `isDeleted: false` filter, `mapToDto()` private
  - [x] Create `src/modules/project/infrastructure/persistence/read/index.ts` barrel
- [x] Task 7: Create write repository (AC: #1, #4)
  - [x] Create `src/modules/project/infrastructure/persistence/write/project.repository.ts` — follow `UserRepository` exactly: `extends BaseAggregateRepository<Project> implements IProjectRepository`, `persist()` with optimistic locking, `getById()`, `findByName()`, `toPersistence()`, `toDomain()`
  - [x] Create `src/modules/project/infrastructure/persistence/write/index.ts` barrel
- [x] Task 8: Create projection (AC: #1, #4)
  - [x] Create `src/modules/project/infrastructure/projections/project-read-model.projection.ts` — follow `UserReadModelProjection` pattern: `@EventsHandler(ProjectCreatedEvent, ProjectUpdatedEvent)`, log event types
  - [x] Create `src/modules/project/infrastructure/projections/index.ts` barrel
- [x] Task 9: Create controller (AC: #1, #2, #3, #4)
  - [x] Create `src/modules/project/infrastructure/http/project.controller.ts` — follow `UserController` pattern: `@ApiTags('projects')`, `@Controller('projects')`, inject `COMMAND_BUS_TOKEN` + `QUERY_BUS_TOKEN`, endpoints: POST (201 + Location), GET list, GET :id, PUT :id
  - [x] Update `src/modules/project/infrastructure/http/index.ts` barrel
- [x] Task 10: Create application barrel and update module (AC: all)
  - [x] Create `src/modules/project/application/index.ts` barrel
  - [x] Update `src/modules/project/project.module.ts` — follow `UserModule` pattern: register all providers, handlers, controllers, export tokens
- [x] Task 11: Write tests (AC: all)
  - [x] Handler unit tests: `create-project.handler.spec.ts`, `update-project.handler.spec.ts`
  - [x] Controller unit tests: `project.controller.spec.ts`
  - [x] DTO validation tests: `create-project.dto.spec.ts`, `update-project.dto.spec.ts`

## Dev Notes

### MUST-FOLLOW: Architecture Section 3.3 — Project Module Application + Infrastructure

Story 2.1 created the **domain layer + Drizzle schema + minimal module registration**. This story creates the **application layer + infrastructure persistence/HTTP + wires everything in the module**.

**Files to CREATE (this story):**
```
src/modules/project/application/index.ts
src/modules/project/application/commands/index.ts
src/modules/project/application/commands/create-project.command.ts
src/modules/project/application/commands/update-project.command.ts
src/modules/project/application/commands/handlers/index.ts
src/modules/project/application/commands/handlers/create-project.handler.ts
src/modules/project/application/commands/handlers/update-project.handler.ts
src/modules/project/application/dtos/index.ts
src/modules/project/application/dtos/project.dto.ts
src/modules/project/application/dtos/create-project.dto.ts
src/modules/project/application/dtos/update-project.dto.ts
src/modules/project/application/queries/index.ts
src/modules/project/application/queries/get-project.query.ts
src/modules/project/application/queries/get-project-list.query.ts
src/modules/project/application/queries/handlers/index.ts
src/modules/project/application/queries/handlers/get-project.handler.ts
src/modules/project/application/queries/handlers/get-project-list.handler.ts
src/modules/project/application/queries/ports/index.ts
src/modules/project/application/queries/ports/i-project-read-dao.interface.ts
src/modules/project/infrastructure/http/project.controller.ts
src/modules/project/infrastructure/persistence/read/project-read-dao.ts
src/modules/project/infrastructure/persistence/read/index.ts
src/modules/project/infrastructure/persistence/write/project.repository.ts
src/modules/project/infrastructure/persistence/write/index.ts
src/modules/project/infrastructure/projections/project-read-model.projection.ts
src/modules/project/infrastructure/projections/index.ts
```

**Files to MODIFY (this story):**
```
src/modules/project/project.module.ts           — wire providers, controllers, exports
src/modules/project/infrastructure/http/index.ts — export ProjectController (if exists)
```

### CRITICAL: Follow Existing UserModule Patterns EXACTLY

The UserModule established the definitive patterns across Stories 1.1-1.5. The Project module MUST follow these conventions:

**Controller pattern** — see `user.controller.ts`:
```typescript
@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()                        // HttpCode(201), Location header via @Res
  @Get()                         // paginated list
  @Get(':id')                    // single detail
  @Put(':id')                    // update
}
```
- Use `parsePagination()` helper (copy from UserController)
- POST returns `HttpCode(HttpStatus.CREATED)` + `res.header('Location', '/projects/' + result.id)`
- PUT does NOT need `@HttpCode` — NestJS defaults to 200

**Command handler pattern** — see `create-user.handler.ts`:
```typescript
@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand, ProjectDto> {
  constructor(
    @Inject(PROJECT_REPOSITORY_TOKEN) private readonly repo: IProjectRepository,
    @Optional() @Inject(REQUEST_CONTEXT_TOKEN) private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: CreateProjectCommand): Promise<ProjectDto> {
    // 1. Build eventMetadata from requestContext (optional)
    // 2. Check duplicate via repo.findByName()
    // 3. Entity.factory()
    // 4. repo.save(entity)
    // 5. Return new ProjectDto({...})
  }
}
```

**Duplicate check for project name:**
```typescript
const existing = await this.projectRepository.findByName(command.name);
if (existing) {
  throw ConflictException.duplicate('Project', 'name', command.name, {
    code: 'PROJECT_DUPLICATE_NAME',
    suggestion: 'Sử dụng tên khác hoặc tìm kiếm dự án hiện có',
  });
}
```
Also wrap `repo.save()` in try/catch for DB-level unique constraint (error code `23505`), same pattern as `CreateUserHandler`.

**Update handler pattern** — see `deactivate-user.handler.ts`:
```typescript
const project = await this.projectRepository.getById(command.id);
if (!project) {
  throw NotFoundException.entity('Project', command.id, {
    suggestion: 'Kiểm tra lại ID dự án',
  });
}
project.updateDetails({ name: command.name, description: command.description }, eventMetadata);
await this.projectRepository.save(project);
```

**Read DAO pattern** — see `user-read-dao.ts`:
- `extends BaseReadDao implements IProjectReadDao`
- `@Inject(DATABASE_READ_TOKEN) private readonly db: DrizzleDB<typeof schema>`
- All queries filter `eq(projectsTable.isDeleted, false)`
- `findAll()` uses `Promise.all([dataQuery, countQuery])` with `desc(projectsTable.createdAt)`
- `findByName()` uses `eq(projectsTable.name, name)` (exact match — fuzzy search is Story 2.3)
- `mapToDto()` converts `ProjectRecord` → `ProjectDto`

**Write repository pattern** — see `user.repository.ts`:
- `extends BaseAggregateRepository<Project> implements IProjectRepository`
- Constructor: `@Inject(DATABASE_WRITE_TOKEN)`, `@Inject(EVENT_BUS_TOKEN)`, `@Optional() @Inject(OUTBOX_REPOSITORY_TOKEN)`
- `super(eventBus, outboxRepository, { useOutbox: false })`
- `persist()`: insert if `expectedVersion === 0`, optimistic-lock update otherwise
- `getById()`: filter `isDeleted: false`
- `findByName()`: filter `isDeleted: false` + name match
- `toPersistence()`: entity → `ProjectRecord` (note: `deletedAt` exists in schema from Story 2.1 fix)
- `toDomain()`: `ProjectRecord` → `Project.reconstitute(...)` — pass `deletedAt` as last arg

**Projection pattern** — see `user-read-model.projection.ts`:
```typescript
@EventsHandler(ProjectCreatedEvent, ProjectUpdatedEvent)
export class ProjectReadModelProjection extends BaseProjection<...> implements IEventHandler<...> {
  // Log events, implement isEventProcessed/markEventProcessed
}
```

**Module registration pattern** — see `user.module.ts`:
```typescript
@Module({
  imports: [SharedCqrsModule],
  controllers: [ProjectController],
  providers: [
    ProjectRepository,
    { provide: PROJECT_REPOSITORY_TOKEN, useExisting: ProjectRepository },
    ...CommandHandlers,
    ProjectReadDao,
    { provide: PROJECT_READ_DAO_TOKEN, useExisting: ProjectReadDao },
    ...QueryHandlers,
    ProjectReadModelProjection,
  ],
  exports: [PROJECT_REPOSITORY_TOKEN, PROJECT_READ_DAO_TOKEN],
})
export class ProjectModule {}
```
Note: No `CommandRunnerModule` needed (that's User-specific for CLI seed).

### Project DTO Shape

```typescript
export class ProjectDto {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: { id, name, description, status, version, createdAt, updatedAt }) { ... }
}
```

### Create Project DTO (Request Validation)

```typescript
export class CreateProjectDto {
  @IsString()
  @MinLength(1, { message: 'Tên dự án là bắt buộc' })
  @MaxLength(200, { message: 'Tên dự án không được vượt quá 200 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không được vượt quá 1000 ký tự' })
  description?: string;
}
```

### Update Project DTO (Request Validation)

```typescript
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Tên dự án không được để trống' })
  @MaxLength(200, { message: 'Tên dự án không được vượt quá 200 ký tự' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Mô tả không được vượt quá 1000 ký tự' })
  description?: string;
}
```

### API Endpoint Details

| Method | Endpoint | Guard | Returns |
|--------|----------|-------|---------|
| POST | `/projects` | `JwtAuthGuard` (any role — C-4) | 201 + ProjectDto + Location header |
| GET | `/projects` | `JwtAuthGuard` | `{ data, total, page, totalPages }` ordered by `createdAt desc` |
| GET | `/projects/:id` | `JwtAuthGuard` | ProjectDto |
| PUT | `/projects/:id` | `JwtAuthGuard` (any role) | ProjectDto |

### Project Schema Reference (already created in Story 2.1)

```typescript
export const projectsTable = pgTable('projects', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Files to READ FIRST (before writing any code)

- `src/modules/user/infrastructure/http/user.controller.ts` — controller pattern
- `src/modules/user/application/commands/handlers/create-user.handler.ts` — create handler pattern
- `src/modules/user/application/commands/handlers/deactivate-user.handler.ts` — update handler pattern
- `src/modules/user/application/queries/handlers/get-user.handler.ts` — get by ID handler
- `src/modules/user/application/queries/handlers/get-user-list.handler.ts` — list handler
- `src/modules/user/infrastructure/persistence/read/user-read-dao.ts` — read DAO pattern
- `src/modules/user/infrastructure/persistence/write/user.repository.ts` — write repository pattern
- `src/modules/user/infrastructure/projections/user-read-model.projection.ts` — projection pattern
- `src/modules/user/application/dtos/user.dto.ts` — DTO pattern
- `src/modules/user/application/dtos/create-user.dto.ts` — request DTO with validation
- `src/modules/user/user.module.ts` — module wiring pattern
- `src/modules/project/domain/entities/project.entity.ts` — entity to work with
- `src/modules/project/domain/repositories/i-project-repository.interface.ts` — repo interface
- `src/modules/project/infrastructure/persistence/drizzle/schema/project.schema.ts` — schema

### Anti-Patterns to AVOID

- **DO NOT** create fuzzy search endpoint — that's Story 2.3 (`GET /projects/search?q=`)
- **DO NOT** create merge endpoint — that's Story 2.4 (`POST /projects/:id/merge`)
- **DO NOT** add `@Roles()` to any endpoint — architecture says `JwtAuthGuard` only for CRUD (C-4: both roles can create/update)
- **DO NOT** add soft delete endpoint (DELETE /projects/:id) — not in architecture for this story, projects are archived not deleted
- **DO NOT** forget `isDeleted: false` filter on ALL read queries
- **DO NOT** forget to handle `description` as nullable (`string | null`) — the schema column is nullable
- **DO NOT** import `WorkLogModule` or `CommentModule` — Project is standalone per dependency graph
- **DO NOT** use `@Patch()` for update — architecture says `PUT /projects/:id`
- **DO NOT** forget to wrap `repo.save()` in try/catch for unique constraint violation (error code `23505`)
- **DO NOT** create `IProjectReadDao` methods that don't exist in the interface — keep it clean: `findById`, `findAll`, `findByName`

### Story 2.1 Learnings (from previous story)

- **Use `SharedCqrsModule`** — already provides command/query/event bus infrastructure
- **Import paths use `@modules/` alias** — e.g., `@modules/user/infrastructure/persistence/drizzle/schema`
- **Import paths use `@shared/` alias** — e.g., `@shared/database/outbox/drizzle/schema/outbox.schema`
- **`BaseAggregateRepository` takes `(eventBus, outboxRepository, { useOutbox: false })`** — outbox optional
- **`AggregateRoot.addDomainEvent()` calls `markAsUpdated()`** which increments version — version is 1 after create(), not 0
- **domainEvents accessed via `getDomainEvents()` method**, not a property
- **Project entity `updateDetails()` accepts `{ name?, description? }`** — partial update, no-op if no changes
- **Project entity `create()` accepts `Omit<ProjectProps, 'status'> & { status?: ProjectStatus }`** — status defaults to active
- **Schema has `deletedAt` column** (added during Story 2.1 review fix) — include in `toPersistence()` and `toDomain()`
- **Pre-existing compile errors from missing Product/Order modules** — not introduced by new code

### Testing Standards

- Handler tests: mock repository/DAO, test happy path + error paths (not found, duplicate name)
- Controller tests: mock command/query bus, test endpoint routing and response shape
- DTO tests: validate class-validator decorators work correctly (valid input passes, invalid input fails)
- Test file naming: `*.spec.ts` colocated with source
- Use `describe/it` blocks, no `test()` calls
- Run `tsc --noEmit` after all files created to verify TypeScript compiles clean

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.3] — Project Module full file listing
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.2] — Project API endpoints
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-13] — Open creation (C-4) — both roles
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Error Code Table] — `PROJECT_DUPLICATE_NAME` error code
- [Source: src/modules/user/] — All patterns to follow (controller, handlers, DAO, repository, DTOs, projection, module)

## Dev Agent Record

### Agent Model Used

GLM-5[1m] via Claude Code

### Debug Log References

N/A

### Completion Notes List

- Created 27 new files following UserModule patterns exactly (DTOs, commands, handlers, queries, read DAO, write repository, projection, controller, barrels)
- Updated project.module.ts from minimal to fully wired (providers, controllers, exports)
- All endpoints follow architecture: POST /projects (201 + Location), GET /projects (paginated), GET /projects/:id, PUT /projects/:id
- JwtAuthGuard only — no @Roles() decorator (C-4: both roles can CRUD)
- CreateProjectHandler checks duplicate name via findByName() + DB unique constraint catch (23505)
- Read DAO filters isDeleted: false on all queries, paginated with count
- Write repository uses optimistic locking via version check
- 5 new test files (27 new tests), 201 total — all pass, zero regressions
- TypeScript compiles clean (tsc --noEmit passes)

### File List

**New files:**
- src/modules/project/application/index.ts
- src/modules/project/application/dtos/project.dto.ts
- src/modules/project/application/dtos/create-project.dto.ts
- src/modules/project/application/dtos/update-project.dto.ts
- src/modules/project/application/dtos/index.ts
- src/modules/project/application/dtos/create-project.dto.spec.ts
- src/modules/project/application/dtos/update-project.dto.spec.ts
- src/modules/project/application/commands/create-project.command.ts
- src/modules/project/application/commands/update-project.command.ts
- src/modules/project/application/commands/index.ts
- src/modules/project/application/commands/handlers/create-project.handler.ts
- src/modules/project/application/commands/handlers/update-project.handler.ts
- src/modules/project/application/commands/handlers/index.ts
- src/modules/project/application/commands/handlers/create-project.handler.spec.ts
- src/modules/project/application/commands/handlers/update-project.handler.spec.ts
- src/modules/project/application/queries/get-project.query.ts
- src/modules/project/application/queries/get-project-list.query.ts
- src/modules/project/application/queries/index.ts
- src/modules/project/application/queries/ports/i-project-read-dao.interface.ts
- src/modules/project/application/queries/ports/index.ts
- src/modules/project/application/queries/handlers/get-project.handler.ts
- src/modules/project/application/queries/handlers/get-project-list.handler.ts
- src/modules/project/application/queries/handlers/index.ts
- src/modules/project/infrastructure/http/project.controller.ts
- src/modules/project/infrastructure/http/project.controller.spec.ts
- src/modules/project/infrastructure/persistence/read/project-read-dao.ts
- src/modules/project/infrastructure/persistence/read/index.ts
- src/modules/project/infrastructure/persistence/write/project.repository.ts
- src/modules/project/infrastructure/persistence/write/index.ts
- src/modules/project/infrastructure/projections/project-read-model.projection.ts
- src/modules/project/infrastructure/projections/index.ts

**Modified files:**
- src/modules/project/project.module.ts — wired providers, controllers, exports
- src/modules/project/infrastructure/http/index.ts — added ProjectController export
