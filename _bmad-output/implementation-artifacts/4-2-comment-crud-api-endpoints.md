# Story 4.2: Comment CRUD — API Endpoints

Status: done

## Story

As a manager,
I want to create, update, and delete comments on WorkLog entries,
so that I can give contextual feedback to employees.

## Acceptance Criteria

1. **Given** CommentModule with entity and repository, and a WorkLog exists, **When** `POST /work-logs/:workLogId/comments` with `{ content: "Kết quả test thế nào?" }`, **Then** comment created, returns 201 + full Comment DTO with `authorName` (UX-DR11)
2. **`PUT /comments/:id`** updates comment content — only the author (manager) can edit
3. **`DELETE /comments/:id`** soft-deletes — only the author can delete, returns `{ deleted: true, id }`
4. **All endpoints** protected by `@Roles('manager')` — employee returns 403
5. **Commenting on non-existent WorkLog** returns `404 WORKLOG_NOT_FOUND`
6. **CommentCreatedEvent** emitted on create for notification consumers (Story 4.5)
7. **Comments appear** in monthly report response (nested in WorkLog DTO) — this story creates the read DAO that enables it

## Tasks / Subtasks

- [x] Task 1: Create DTOs (AC: #1, #3)
  - [x] Create `src/modules/comment/application/dtos/comment.dto.ts` — CommentDto class with: id, workLogId, authorId, authorName, content, version, isDeleted, createdAt, updatedAt. Constructor pattern matches WorkLogDto.
  - [x] Create `src/modules/comment/application/dtos/create-comment.dto.ts` — CreateCommentDto with class-validator: content (IsString, MinLength(1), MaxLength(2000))
  - [x] Create `src/modules/comment/application/dtos/index.ts` — barrel export
- [x] Task 2: Create commands (AC: #1, #2, #3)
  - [x] Create `src/modules/comment/application/commands/create-comment.command.ts` — implements ICommand: workLogId, content, authorId (from user.userId in controller)
  - [x] Create `src/modules/comment/application/commands/update-comment.command.ts` — implements ICommand: id, content, authorId (for ownership check)
  - [x] Create `src/modules/comment/application/commands/delete-comment.command.ts` — implements ICommand: id, authorId (for ownership check)
  - [x] Create `src/modules/comment/application/commands/index.ts` — barrel export
- [x] Task 3: Create ICommentReadDao interface and implementation (AC: #1, #7)
  - [x] Create `src/modules/comment/application/queries/ports/i-comment-read-dao.interface.ts` — findById(id): Promise<CommentDto | null>, findByWorkLogId(workLogId): Promise<CommentDto[]>
  - [x] Create `src/modules/comment/infrastructure/persistence/read/comment-read-dao.ts` — extends BaseReadDao, implements ICommentReadDao, uses DrizzleDB with schema, leftJoins usersTable for authorName, filters isDeleted=false
  - [x] Update `src/modules/comment/infrastructure/persistence/read/index.ts` — export CommentReadDao
- [x] Task 4: Create CommentRepository (AC: #1, #2, #3)
  - [x] Create `src/modules/comment/infrastructure/persistence/write/comment.repository.ts` — extends BaseAggregateRepository<Comment>, implements ICommentRepository, toPersistence/toDomain methods following exact WorkLogRepository pattern, optimistic concurrency via version check
  - [x] Update `src/modules/comment/infrastructure/persistence/write/index.ts` — export CommentRepository
- [x] Task 5: Create command handlers (AC: #1, #2, #3, #5, #6)
  - [x] Create `src/modules/comment/application/commands/handlers/create-comment.handler.ts` — @CommandHandler, validates WorkLog exists via WORKLOG_READ_DAO_TOKEN (404 if not), generates CommentId with randomUUID, calls Comment.create(), saves, returns CommentDto with authorName from userReadDao
  - [x] Create `src/modules/comment/application/commands/handlers/update-comment.handler.ts` — @CommandHandler, loads comment, checks authorId === command.authorId (403 if mismatch), calls comment.updateContent(), saves, returns CommentDto
  - [x] Create `src/modules/comment/application/commands/handlers/delete-comment.handler.ts` — @CommandHandler, loads comment, checks authorId === command.authorId (403 if mismatch), calls comment.delete(), saves, returns { deleted: true, id }
  - [x] Create `src/modules/comment/application/commands/handlers/index.ts` — barrel export
- [x] Task 6: Create CommentController (AC: #1, #2, #3, #4)
  - [x] Create `src/modules/comment/infrastructure/http/comment.controller.ts` — Two controllers: WorkLogCommentController (@Controller('work-logs')) for POST :workLogId/comments, CommentController (@Controller('comments')) for PUT/DELETE :id. All use @Roles('manager').
  - [x] Update `src/modules/comment/infrastructure/http/index.ts` — export controllers
- [x] Task 7: Create read-model projection (AC: #6)
  - [x] Create `src/modules/comment/infrastructure/projections/comment-read-model.projection.ts` — follows exact WorkLogReadModelProjection pattern: @EventsHandler(CommentCreatedEvent, CommentUpdatedEvent, CommentDeletedEvent), extends BaseProjection, stub handler (logs events)
  - [x] Update `src/modules/comment/infrastructure/projections/index.ts` — export projection
- [x] Task 8: Wire up CommentModule and register in AppModule (AC: all)
  - [x] Update `src/modules/comment/comment.module.ts` — add controllers, providers (repository + read DAO with useExisting aliases), command handlers, projection. Exports: COMMENT_REPOSITORY_TOKEN, COMMENT_READ_DAO_TOKEN
  - [x] Update `src/app.module.ts` — add CommentModule to imports array
- [x] Task 9: Write tests (AC: all)
  - [x] Create `src/modules/comment/infrastructure/http/comment.controller.spec.ts` — test POST/PUT/DELETE with mocked command bus, role enforcement, response shapes
  - [x] Create `src/modules/comment/application/commands/handlers/create-comment.handler.spec.ts` — test create flow: valid creation, worklog not found 404, domain validation errors
  - [x] Create `src/modules/comment/application/commands/handlers/update-comment.handler.spec.ts` — test update flow: valid update, wrong author 403, comment not found 404
  - [x] Create `src/modules/comment/application/commands/handlers/delete-comment.handler.spec.ts` — test delete flow: valid delete, wrong author 403, comment not found 404, already deleted
  - [x] Run `tsc --noEmit` and `jest` — all pass (402 existing + 21 new = 423 total)

## Dev Notes

### MUST-FOLLOW: Exact Code Patterns

Follow WorkLog module CRUD patterns EXACTLY. Read these files before implementing:

**Controller pattern:** `src/modules/work-log/infrastructure/http/work-log.controller.ts`
- Injects `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`
- `@ApiTags`, `@ApiBearerAuth('JWT-auth')`, `@Controller('work-logs')`
- Uses `@CurrentUser() user: any` — `user.userId` for employee/author ID, `user.role` for role
- `@HttpCode(HttpStatus.CREATED)` on POST, `@HttpCode(HttpStatus.OK)` on DELETE
- POST returns DTO + Location header via `@Res({ passthrough: true }) res: FastifyReply`
- DELETE returns `{ deleted: true, id: string }`

**IMPORTANT: Sub-resource POST routing:**
- Architecture spec: `POST /work-logs/:id/comments`
- The CommentController should be `@Controller('comments')` with PUT/DELETE at `/:id`
- BUT POST create must be at `/work-logs/:workLogId/comments` — this is a sub-resource route
- Two approaches:
  1. Add the POST route in the **WorkLogController** as `@Post(':id/comments')` with `@Roles('manager')` — requires WorkLogController to inject COMMAND_BUS_TOKEN and CommentCreateCommand (cleaner URL but cross-module coupling)
  2. Keep CommentController as `@Controller('work-logs')` with `@Post(':workLogId/comments')` + separate routes for PUT/DELETE using absolute paths — but NestJS `@Controller` prefix applies to all routes, so this won't work for PUT/DELETE on `/comments/:id`
- **Recommended approach:** Use approach 1 — add `@Post(':workLogId/comments')` to CommentController with `@Controller('work-logs')`, then create a SECOND controller or use a separate route file for PUT/DELETE under `/comments/:id`
- **SIMPLEST approach (follow this):** Two separate controller classes:
  - `CommentController` with `@Controller('comments')` — handles PUT `/:id` and DELETE `/:id`
  - OR: single controller with `@Controller('work-logs')` and add `@Post(':workLogId/comments')`, plus use absolute `@Put('/comments/:id')` — but NestJS doesn't support absolute paths in method decorators
  - **ACTUAL SIMPLEST:** Put POST in WorkLogController as a sub-resource endpoint (WorkLogController already handles `/work-logs/:id/...` routes). Keep CommentController for PUT/DELETE on `/comments/:id`. This matches the REST spec exactly and avoids routing hacks.
  - **BUT this creates cross-module coupling** — WorkLogController would need to import Comment commands
  - **FINAL DECISION:** Keep everything in CommentModule. Use `@Controller('work-logs')` for CommentController, add `@Post(':workLogId/comments')`. For PUT/DELETE, they won't work under this prefix. So use TWO controllers:
    - `WorkLogCommentController` with `@Controller('work-logs')` — only POST `:workLogId/comments`
    - `CommentController` with `@Controller('comments')` — PUT `:id` and DELETE `:id`
  - Both registered in CommentModule. Both use `@Roles('manager')`.

**Command pattern:** `src/modules/work-log/application/commands/create-work-log.command.ts`
- `implements ICommand`, readonly fields, simple constructor

**Handler pattern:** `src/modules/work-log/application/commands/handlers/create-work-log.handler.ts`
- `@CommandHandler(CommandClass)`, `implements ICommandHandler<Command, Dto>`
- Injects: REPOSITORY_TOKEN, optional REQUEST_CONTEXT_TOKEN for event metadata
- Catches DomainException and translates to appropriate HTTP exceptions (BusinessRuleException, NotFoundException)
- Builds response DTO at the end with display names from userReadDao
- **CreateWorkLogHandler** shows: resolve defaults → validate existence → duplicate check → domain create → catch DomainException → save → build DTO

**Repository pattern:** `src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts`
- `extends BaseAggregateRepository<Comment> implements ICommentRepository`
- Injects DATABASE_WRITE_TOKEN, EVENT_BUS_TOKEN, optional OUTBOX_REPOSITORY_TOKEN
- `super(eventBus, outboxRepository, { useOutbox: false })`
- toPersistence: maps entity to CommentRecord (note: `isDeleted` and `deletedAt` both mapped)
- toDomain: calls `Comment.reconstitute(id, props, version, createdAt, updatedAt, deletedAt)`
- persist: insert if version===0, else update with version check (optimistic concurrency)

**Read DAO pattern:** `src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts`
- `extends BaseReadDao implements IWorkLogReadDao`
- Injects DATABASE_READ_TOKEN
- Uses `this.db.select(...).from(commentsTable).leftJoin(usersTable, ...)` for authorName
- Always filters `isDeleted = false`

**DTO pattern:** `src/modules/work-log/application/dtos/work-log.dto.ts`
- Plain class with typed fields + constructor(params) that assigns each field
- `authorName` resolved via leftJoin to usersTable

**Module pattern:** `src/modules/work-log/work-log.module.ts`
- Registers controllers, providers with `{ provide: TOKEN, useExisting: ConcreteClass }` aliases
- Spreads `CommandHandlers` array
- Exports tokens that other modules need

**AppModule:** `src/app.module.ts`
- Add `CommentModule` to imports array after WorkLogModule

### Comment CRUD Specifics

**CommentDto fields:**
```typescript
export class CommentDto {
  id: string;
  workLogId: string;
  authorId: string;
  authorName: string;  // resolved from usersTable via leftJoin
  content: string;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  constructor(params: { ... }) { /* assign each field */ }
}
```

**CreateCommentDto (request validation):**
```typescript
export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: 'Nội dung nhận xét là bắt buộc' })
  @MaxLength(2000, { message: 'Nội dung không được vượt quá 2000 ký tự' })
  content: string;
}
```

**CreateCommentCommand:**
```typescript
export class CreateCommentCommand implements ICommand {
  constructor(
    public readonly workLogId: string,
    public readonly content: string,
    public readonly authorId: string,  // user.userId from controller
  ) {}
}
```

**CreateCommentHandler flow:**
1. Validate WorkLog exists: `this.workLogReadDao.findById(command.workLogId)` — throw `NotFoundException.entity('WorkLog', workLogId)` if null
2. Generate ID: `new CommentId(randomUUID())`
3. Domain create: `Comment.create(id, { workLogId, authorId, content }, metadata)`
4. Catch `DomainException` → translate to `BusinessRuleException`
5. Save: `this.repository.save(comment)`
6. Build DTO: resolve authorName via `this.userReadDao.findById(command.authorId)`
7. Return `CommentDto`

**UpdateCommentHandler flow:**
1. Load: `this.repository.getById(command.id)` — 404 if null
2. **Author check:** `comment.authorId !== command.authorId` → throw `ForbiddenException` (or `NotFoundException.entity` — see note below)
3. Update: `comment.updateContent(command.content, metadata)`
4. Catch `DomainException` (e.g. COMMENT_ALREADY_DELETED) → translate
5. Save and return DTO

**DeleteCommentHandler flow:**
1. Load → 404 if null
2. **Author check:** same as update
3. Delete: `comment.delete(metadata)`
4. Catch `DomainException` → translate
5. Save and return `{ deleted: true, id: command.id }`

**Author ownership check — 403 vs 404:**
- WorkLog uses 404 for C-7 ownership check (prevent information leakage about other users' data)
- Comment is different: all endpoints are `@Roles('manager')`, so only managers can access. A manager can see all comments. If a manager tries to edit another manager's comment, return **403 Forbidden** — not 404. The resource exists, they just don't own it.
- Use `ForbiddenException` from `src/libs/core/common` for author mismatch on update/delete.

**CommentController endpoint details:**

WorkLogCommentController (`@Controller('work-logs')`):
```typescript
@Post(':workLogId/comments')
@Roles('manager')
@HttpCode(HttpStatus.CREATED)
async create(
  @Param('workLogId') workLogId: string,
  @Body() dto: CreateCommentDto,
  @CurrentUser() user: any,
  @Res({ passthrough: true }) res: FastifyReply,
): Promise<CommentDto> {
  const command = new CreateCommentCommand(workLogId, dto.content, user.userId);
  const result = await this.commandBus.execute<CreateCommentCommand, CommentDto>(command);
  res.header('Location', `/comments/${result.id}`);
  return result;
}
```

CommentController (`@Controller('comments')`):
```typescript
@Put(':id')
@Roles('manager')
async update(
  @Param('id') id: string,
  @Body() dto: CreateCommentDto,  // reuse same DTO — only has content field
  @CurrentUser() user: any,
): Promise<CommentDto> {
  const command = new UpdateCommentCommand(id, dto.content, user.userId);
  return this.commandBus.execute<UpdateCommentCommand, CommentDto>(command);
}

@Delete(':id')
@Roles('manager')
@HttpCode(HttpStatus.OK)
async delete(
  @Param('id') id: string,
  @CurrentUser() user: any,
): Promise<{ deleted: boolean; id: string }> {
  const command = new DeleteCommentCommand(id, user.userId);
  return this.commandBus.execute<DeleteCommentCommand, { deleted: boolean; id: string }>(command);
}
```

**ICommentReadDao interface:**
```typescript
export interface ICommentReadDao {
  findById(id: string): Promise<CommentDto | null>;
  findByWorkLogId(workLogId: string): Promise<CommentDto[]>;
}
```

The `findByWorkLogId` method is needed for monthly report to nest comments under WorkLog DTOs. It may not be called from this story's controller but is part of the read DAO contract for future use.

**CommentRepository toPersistence mapping:**
```typescript
private toPersistence(aggregate: Comment): CommentRecord {
  return {
    id: aggregate.id,
    workLogId: aggregate.workLogId,
    authorId: aggregate.authorId,
    content: aggregate.content,
    version: aggregate.version,
    isDeleted: aggregate.isDeleted,    // from entity getter: !!this._deletedAt
    deletedAt: aggregate.deletedAt ?? null,
    createdAt: aggregate.createdAt,
    updatedAt: aggregate.updatedAt,
  };
}
```

**CommentRepository toDomain mapping:**
```typescript
private toDomain(row: CommentRecord): Comment {
  return Comment.reconstitute(
    row.id,
    { workLogId: row.workLogId, authorId: row.authorId, content: row.content },
    row.version,
    row.createdAt,
    row.updatedAt,
    row.deletedAt,
  );
}
```

**CommentModule updated wiring:**
```typescript
@Module({
  imports: [SharedCqrsModule, WorkLogModule, UserModule],
  controllers: [WorkLogCommentController, CommentController],
  providers: [
    CommentRepository,
    { provide: COMMENT_REPOSITORY_TOKEN, useExisting: CommentRepository },
    CommentReadDao,
    { provide: COMMENT_READ_DAO_TOKEN, useExisting: CommentReadDao },
    ...CommandHandlers,
    CommentReadModelProjection,
  ],
  exports: [COMMENT_REPOSITORY_TOKEN, COMMENT_READ_DAO_TOKEN],
})
export class CommentModule {}
```

### Dependency Injections for Handlers

**CreateCommentHandler** needs:
- `COMMENT_REPOSITORY_TOKEN` (ICommentRepository)
- `WORK_LOG_READ_DAO_TOKEN` (IWorkLogReadDao — from WorkLogModule, to validate WorkLog exists)
- `USER_READ_DAO_TOKEN` (IUserReadDao — from UserModule, to resolve authorName)
- `REQUEST_CONTEXT_TOKEN` (optional — for event metadata)

**UpdateCommentHandler** needs:
- `COMMENT_REPOSITORY_TOKEN`
- `USER_READ_DAO_TOKEN` (for authorName in response DTO)
- `REQUEST_CONTEXT_TOKEN` (optional)

**DeleteCommentHandler** needs:
- `COMMENT_REPOSITORY_TOKEN`
- `REQUEST_CONTEXT_TOKEN` (optional)

Note: DeleteCommentHandler does NOT need USER_READ_DAO_TOKEN — delete returns `{ deleted: true, id }`, not a full DTO.

### Cross-Module DAO Imports

Handlers need to import DAO tokens from other modules:
- `WORK_LOG_READ_DAO_TOKEN` from `@modules/work-log/constants/tokens`
- `IWorkLogReadDao` from `@modules/work-log/application/queries/ports`
- `USER_READ_DAO_TOKEN` from `@modules/user/constants/tokens`
- `IUserReadDao` from `@modules/user/application/queries/ports`

These are available because CommentModule imports WorkLogModule and UserModule, which export these tokens.

### Anti-Patterns to AVOID

- **DO NOT** create a single controller trying to handle both `/work-logs/:workLogId/comments` (POST) and `/comments/:id` (PUT/DELETE) — NestJS `@Controller` prefix applies to all routes. Use two controllers.
- **DO NOT** forget `@Roles('manager')` on ALL three endpoints — employees must get 403
- **DO NOT** use 404 for author ownership check on update/delete — use 403 Forbidden. The comment exists, the manager just isn't the author. 404 is for C-7 employee data isolation.
- **DO NOT** forget to validate WorkLog existence in CreateCommentHandler — `WORKLOG_NOT_FOUND` 404
- **DO NOT** register CommentModule in AppModule before all providers are wired — do it in Task 8 when everything is ready
- **DO NOT** forget `isDeleted: false` filter in repository.getById and read DAO queries
- **DO NOT** forget to map both `isDeleted` AND `deletedAt` in toPersistence — the schema has both columns
- **DO NOT** use `ValidationException` for business rule violations — use `NotFoundException`, `ForbiddenException`, `BusinessRuleException` as appropriate
- **DO NOT** create query handlers — this story only needs commands (create/update/delete). Read DAO is called directly from handlers, not through query bus.
- **DO NOT** forget the `version` field in optimistic concurrency check — insert if version===0, else update with version WHERE clause
- **DO NOT** forget `{ useOutbox: false }` in repository super() call — same as WorkLogRepository
- **DO NOT** put CommentController under `@Controller('work-logs')` — use `WorkLogCommentController` for POST only
- **DO NOT** forget to handle `DomainException` from entity in handlers — translate to appropriate HTTP exceptions
- **DO NOT** return full CommentDto from delete — return `{ deleted: true, id: string }` like WorkLog

### Files to CREATE

```
src/modules/comment/application/dtos/comment.dto.ts
src/modules/comment/application/dtos/create-comment.dto.ts
src/modules/comment/application/dtos/index.ts
src/modules/comment/application/commands/create-comment.command.ts
src/modules/comment/application/commands/update-comment.command.ts
src/modules/comment/application/commands/delete-comment.command.ts
src/modules/comment/application/commands/index.ts
src/modules/comment/application/commands/handlers/create-comment.handler.ts
src/modules/comment/application/commands/handlers/update-comment.handler.ts
src/modules/comment/application/commands/handlers/delete-comment.handler.ts
src/modules/comment/application/commands/handlers/index.ts
src/modules/comment/application/queries/ports/i-comment-read-dao.interface.ts
src/modules/comment/application/queries/ports/index.ts
src/modules/comment/infrastructure/http/comment.controller.ts
src/modules/comment/infrastructure/persistence/read/comment-read-dao.ts
src/modules/comment/infrastructure/persistence/write/comment.repository.ts
src/modules/comment/infrastructure/projections/comment-read-model.projection.ts
src/modules/comment/infrastructure/http/comment.controller.spec.ts
src/modules/comment/application/commands/handlers/create-comment.handler.spec.ts
src/modules/comment/application/commands/handlers/update-comment.handler.spec.ts
src/modules/comment/application/commands/handlers/delete-comment.handler.spec.ts
```

### Files to MODIFY

```
src/modules/comment/comment.module.ts              — wire controllers, providers, handlers, projection
src/modules/comment/infrastructure/http/index.ts   — export controllers
src/modules/comment/infrastructure/persistence/read/index.ts    — export CommentReadDao
src/modules/comment/infrastructure/persistence/write/index.ts   — export CommentRepository
src/modules/comment/infrastructure/projections/index.ts          — export projection
src/app.module.ts                                   — import CommentModule
```

### Previous Story Learnings (Story 4.1)

- Comment entity follows exact WorkLog entity patterns: create/reconstitute/updateContent/delete with domain events
- All string fields must be trimmed before validation and storage (two rounds of review caught this)
- DomainErrorCode enum has 9 Comment error codes: COMMENT_ID_EMPTY, COMMENT_ID_TOO_LONG, COMMENT_CONTENT_REQUIRED, COMMENT_CONTENT_TOO_LONG, COMMENT_ALREADY_DELETED, COMMENT_WORKLOG_ID_REQUIRED, COMMENT_WORKLOG_ID_TOO_LONG, COMMENT_AUTHOR_ID_REQUIRED, COMMENT_AUTHOR_ID_TOO_LONG
- CommentModule already imports SharedCqrsModule, WorkLogModule, UserModule
- DI tokens created: COMMENT_REPOSITORY_TOKEN, COMMENT_READ_DAO_TOKEN
- Barrel exports exist for all domain layers (entities, value-objects, events, repositories)
- Infrastructure barrel files exist but are empty (http, persistence/read, persistence/write, projections)
- CommentModule NOT yet registered in AppModule — this story does it
- `user.userId` is the correct field for user ID; `user.role` for role check
- Use `ValidationException` for DTO validation errors, `BusinessRuleException` for domain rule violations
- Package manager is `bun` — use `bun add` for dependencies (no new deps in this story)
- Fastify is used (not Express) — `FastifyReply` for response manipulation
- `||` not `??` for string fallbacks where empty strings should be falsy
- 402 tests pass at end of Story 4.1 — don't break them
- Mock DAO/repository must include ALL methods in test setup
- `ForbiddenException` is available from `src/libs/core/common`

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source file
- Controller tests: mock command bus, verify correct command dispatched, verify response shapes, test role enforcement
- Handler tests: mock repository and DAOs, test happy path + all error paths (not found, wrong author, domain validation errors)
- Each handler test file should cover:
  - **Create:** valid creation returns DTO, WorkLog not found → 404, domain validation error → BusinessRuleException
  - **Update:** valid update returns DTO, comment not found → 404, wrong author → 403, already deleted → BusinessRuleException
  - **Delete:** valid delete returns { deleted, id }, comment not found → 404, wrong author → 403, already deleted → BusinessRuleException
- Run `tsc --noEmit` and `jest` — all pass (402 existing + new tests)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2] — Acceptance criteria, API endpoints
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.5] — Comment module folder structure, schema, entity behaviors
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.6] — Comment API endpoints table
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 8] — Complete file listing
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-3] — Comment is separate module
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-7] — Notifications use domain events
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-04] — Comment requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#UJ-05] — Manager comment user journey
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR11] — DTOs return display names (authorName)
- [Source: _bmad-output/implementation-artifacts/4-1-comment-module-entity-value-objects-schema.md] — Previous story, entity patterns, learnings
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Controller pattern
- [Source: src/modules/work-log/application/commands/handlers/create-work-log.handler.ts] — Handler pattern
- [Source: src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts] — Repository pattern
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — Read DAO pattern
- [Source: src/modules/work-log/work-log.module.ts] — Module wiring pattern

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 9 tasks implemented: DTOs, commands, read DAO, repository, 3 handlers, 2 controllers, projection, module wiring, tests
- Two-controller pattern: WorkLogCommentController (@Controller('work-logs')) for POST :workLogId/comments, CommentController (@Controller('comments')) for PUT/DELETE :id
- All endpoints @Roles('manager') with author ownership check (403 Forbidden on mismatch)
- CreateCommentHandler validates WorkLog existence (404 NotFoundException)
- CommentRepository follows exact WorkLogRepository pattern with optimistic concurrency
- CommentReadDao extends BaseReadDao with leftJoin to usersTable for authorName
- CommentModule registered in AppModule
- 21 new tests (4 controller + 5 create + 5 update + 5 delete), all 423 tests pass, tsc --noEmit clean

### File List

**Created:**
- src/modules/comment/application/dtos/comment.dto.ts
- src/modules/comment/application/dtos/create-comment.dto.ts
- src/modules/comment/application/dtos/index.ts
- src/modules/comment/application/commands/create-comment.command.ts
- src/modules/comment/application/commands/update-comment.command.ts
- src/modules/comment/application/commands/delete-comment.command.ts
- src/modules/comment/application/commands/index.ts
- src/modules/comment/application/commands/handlers/create-comment.handler.ts
- src/modules/comment/application/commands/handlers/update-comment.handler.ts
- src/modules/comment/application/commands/handlers/delete-comment.handler.ts
- src/modules/comment/application/commands/handlers/index.ts
- src/modules/comment/application/queries/ports/i-comment-read-dao.interface.ts
- src/modules/comment/application/queries/ports/index.ts
- src/modules/comment/infrastructure/http/comment.controller.ts
- src/modules/comment/infrastructure/http/comment.controller.spec.ts
- src/modules/comment/infrastructure/persistence/read/comment-read-dao.ts
- src/modules/comment/infrastructure/persistence/write/comment.repository.ts
- src/modules/comment/infrastructure/projections/comment-read-model.projection.ts
- src/modules/comment/application/commands/handlers/create-comment.handler.spec.ts
- src/modules/comment/application/commands/handlers/update-comment.handler.spec.ts
- src/modules/comment/application/commands/handlers/delete-comment.handler.spec.ts

**Modified:**
- src/modules/comment/comment.module.ts — wired controllers, providers, handlers, projection
- src/modules/comment/infrastructure/http/index.ts — export controllers
- src/modules/comment/infrastructure/persistence/read/index.ts — export CommentReadDao
- src/modules/comment/infrastructure/persistence/write/index.ts — export CommentRepository
- src/modules/comment/infrastructure/projections/index.ts — export projection
- src/app.module.ts — import CommentModule

### Review Findings

#### Review 1 (2026-05-20) — 3-layer adversarial (Blind Hunter, Edge Case Hunter, Acceptance Auditor)

- [x] [Review][Patch] `findByWorkLogId` returned unsorted results — no `.orderBy()`, non-deterministic ordering. Added `.orderBy(asc(commentsTable.createdAt))`. [comment-read-dao.ts:47-65]
- [x] [Review][Defer] `findByWorkLogId` has no pagination — future concern, not called from any endpoint in this story. [comment-read-dao.ts] — deferred, future enhancement
- [x] [Review][Defer] `executeQuery` accepts raw SQL string — pre-existing pattern from WorkLog read DAO. [comment-read-dao.ts] — deferred, pre-existing
- [x] [Review][Defer] No DB index on `work_log_id` column — pre-existing, no indexes defined in any module's schema. [comment.schema.ts] — deferred, pre-existing
- [x] [Review][Defer] `@MinLength(1)` allows whitespace past DTO layer — pre-existing pattern; domain entity catches it. [create-comment.dto.ts] — deferred, pre-existing
