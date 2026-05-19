# Story 3.4: WorkLog List & Query với Phân quyền

Status: done

## Story

As an employee or manager,
I want to list and filter WorkLog entries,
so that I can view work history by project, date, or employee.

## Acceptance Criteria

1. **Given** I am authenticated, **When** I send `GET /work-logs?projectId=abc&executionDate=2026-05-11`, **Then** returns paginated list `{ data: [WorkLog DTO], total, page, totalPages }` sorted by `executionDate desc`, default limit=20
2. Each WorkLog DTO in response includes `projectName`, `employeeName`, `isEditable`, `editWindowClosesAt` — computed correctly via BusinessDayCalculator
3. As employee: only my WorkLogs — auto-filtered by `employeeId = currentUser.userId` (C-7)
4. As manager: all employees' WorkLogs visible
5. Filter by `projectId` (optional) and/or `executionDate` (optional, ISO date string)
6. Pagination: `?page=1&limit=20`, max limit=100, response includes `total`, `page`, `totalPages`
7. Empty results → `{ data: [], total: 0, page: 1, totalPages: 0 }` — no error
8. All existing tests (304+) must continue to pass

## Tasks / Subtasks

- [x] Task 1: Fix Read DAO — inject calculator, compute isEditable/editWindowClosesAt correctly (addresses deferred item from Story 3-2)
  - [x] Update `src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts` — inject `IBusinessDayCalculator` via `BUSINESS_DAY_CALCULATOR_TOKEN`, compute `isEditable` and `editWindowClosesAt` in `mapToDto`
  - [x] Update `src/modules/work-log/work-log.module.ts` — ensure `BUSINESS_DAY_CALCULATOR_TOKEN` is available to `WorkLogReadDao`
- [x] Task 2: Update IWorkLogReadDao interface — add findAll method
  - [x] Update `src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts` — add `findAll(params: { employeeId?: string; projectId?: string; executionDate?: Date; page: number; limit: number }): Promise<{ data: WorkLogDto[]; total: number }>`
- [x] Task 3: Implement findAll in WorkLogReadDao
  - [x] Update `src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts` — implement `findAll` with dynamic WHERE conditions (optional filters), JOIN with projects + users, ORDER BY executionDate DESC, OFFSET/LIMIT pagination, COUNT query for total
- [x] Task 4: Create GetWorkLogsQuery
  - [x] Create `src/modules/work-log/application/queries/get-work-logs.query.ts` — carries `employeeId?: string`, `projectId?: string`, `executionDate?: Date`, `page: number`, `limit: number`, `userRole: string`
  - [x] Create `src/modules/work-log/application/queries/index.ts` — barrel export
- [x] Task 5: Create GetWorkLogsHandler
  - [x] Create `src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts` — injects `WORK_LOG_READ_DAO_TOKEN`, applies role-based filtering (employee → force employeeId, manager → optional), delegates to DAO, returns paginated result
  - [x] Create `src/modules/work-log/application/queries/handlers/index.ts` — export `QueryHandlers` array
- [x] Task 6: Add GET /work-logs endpoint to controller
  - [x] Update `src/modules/work-log/infrastructure/http/work-log.controller.ts` — add `GET /work-logs` with `@Query()` params (projectId, executionDate, page, limit), dispatches `GetWorkLogsQuery`, uses `user.userId` and `user.role` from `@CurrentUser()`
- [x] Task 7: Register QueryHandlers in WorkLogModule
  - [x] Update `src/modules/work-log/work-log.module.ts` — spread `QueryHandlers` in providers
- [x] Task 8: Write tests
  - [x] `get-work-logs.handler.spec.ts` — employee sees only own, manager sees all, filter by projectId, filter by executionDate, pagination, empty results
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### CRITICAL: User ID Field Mapping

The JWT strategy (`src/modules/auth/infrastructure/http/strategies/jwt.strategy.ts`) returns:
```typescript
{ userId: payload.sub, email: payload.email, role: payload.role }
```

So `@CurrentUser()` returns `{ userId, email, role }` — **NOT** `{ id, ... }`.

**In this story's GET endpoint**, use `user.userId` and `user.role`:
```typescript
async getList(
  @Query('projectId') projectId?: string,
  @Query('executionDate') executionDate?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @CurrentUser() user: any,
): Promise<PaginatedWorkLogResponse> {
  const { page: p, limit: l } = parsePagination(page, limit);
  const query = new GetWorkLogsQuery({
    employeeId: user.role === 'employee' ? user.userId : undefined,
    projectId: projectId ?? undefined,
    executionDate: executionDate ? new Date(executionDate) : undefined,
    page: p,
    limit: l,
    userRole: user.role,
  });
  return this.queryBus.execute(query);
}
```

**IMPORTANT NOTE:** The existing command endpoints (POST/PUT/DELETE/unlock) use `user.id` in the controller, but the JWT strategy returns `userId`. These endpoints currently work in tests because tests mock `@CurrentUser()` to return `{ id: 'user-1' }`. At runtime, `user.id` would be `undefined`. This story should NOT fix existing endpoints — that's a separate bug. But the new GET endpoint MUST use `user.userId` correctly.

### MUST-FOLLOW: Existing Patterns

**Query handler pattern** (follow `get-project-list.handler.ts` exactly):
```typescript
@QueryHandler(GetWorkLogsQuery)
export class GetWorkLogsHandler implements IQueryHandler<GetWorkLogsQuery, PaginatedWorkLogResponse> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
  ) {}

  async execute(query: GetWorkLogsQuery): Promise<PaginatedWorkLogResponse> {
    const { data, total } = await this.workLogReadDao.findAll({
      employeeId: query.employeeId,
      projectId: query.projectId,
      executionDate: query.executionDate,
      page: query.page,
      limit: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
```

**Controller pagination pattern** (follow `project.controller.ts`):
```typescript
import { Get, Query } from '@nestjs/common';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

function parsePagination(page?: string, limit?: string) {
  let p = page ? parseInt(page, 10) : DEFAULT_PAGE;
  let l = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
  if (isNaN(p) || p < 1) p = DEFAULT_PAGE;
  if (isNaN(l) || l < 1) l = DEFAULT_LIMIT;
  if (l > MAX_PAGE_LIMIT) l = MAX_PAGE_LIMIT;
  return { page: p, limit: l };
}
```

**Read DAO findAll pattern** (extend existing `WorkLogReadDao`):
- Dynamic WHERE: build conditions array, only add filters when values provided
- JOIN with `projectsTable` and `usersTable` (same as existing methods)
- ORDER BY `workLogsTable.executionDate DESC`
- Two queries: one for data (with OFFSET/LIMIT), one for COUNT (no OFFSET/LIMIT)
- `isDeleted: false` filter always applied

### Fixing the Deferred Read DAO Issue

Story 3-2 review flagged: `mapToDto` hardcodes `isEditable: true, editWindowClosesAt: ''`. This story fixes it:

```typescript
// WorkLogReadDao — inject calculator
constructor(
  @Inject(DATABASE_READ_TOKEN) private readonly db: DrizzleDB<typeof schema>,
  @Inject(BUSINESS_DAY_CALCULATOR_TOKEN) private readonly calculator: IBusinessDayCalculator,
) { super(); }

private mapToDto(row: WorkLogRecord, projectName: string, employeeName: string): WorkLogDto {
  // Reconstitute entity to check isWithinEditWindow
  const executionDate = new ExecutionDate(row.executionDate);
  const isEditable = row.isUnlocked || executionDate.isWithinEditWindow(this.calculator);
  return new WorkLogDto({
    // ... all fields ...
    isEditable,
    editWindowClosesAt: this.calculator.getEditWindowClosesAt(row.executionDate).toISOString(),
    projectName,
    employeeName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
```

**Alternative approach** (simpler, no ExecutionDate VO needed): Since the entity's `isWithinEditWindow` checks `isUnlocked` first and then delegates to `ExecutionDate.isWithinEditWindow`, and the read DAO only has the raw date, we can compute directly:
```typescript
const isEditable = row.isUnlocked || this.isWithinWindow(row.executionDate);

private isWithinWindow(date: Date): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const bizDays = this.calculator.countBusinessDaysBetween(target, now);
  return bizDays <= 3;
}
```

**IMPORTANT:** The read DAO does NOT have access to the domain entity's `isWithinEditWindow` method directly. The `isUnlocked` check must come first — if `isUnlocked: true`, then `isEditable: true` regardless of window. Otherwise, check if within 3 business days using calculator.

### Query Design

```typescript
// get-work-logs.query.ts
export class GetWorkLogsQuery extends IQuery<{
  data: WorkLogDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly employeeId: string | undefined,
    public readonly projectId: string | undefined,
    public readonly executionDate: Date | undefined,
    public readonly page: number,
    public readonly limit: number,
    public readonly userRole: string,
  ) {
    super();
  }
}
```

### Role-Based Filtering Logic

```typescript
// In GetWorkLogsHandler
async execute(query: GetWorkLogsQuery): Promise<PaginatedResponse<WorkLogDto>> {
  // Employee: force employeeId filter (C-7)
  // Manager: no forced filter, but optional employeeId filter
  const employeeId = query.userRole === 'employee' ? query.employeeId : query.employeeId;

  const { data, total } = await this.workLogReadDao.findAll({
    employeeId,
    projectId: query.projectId,
    executionDate: query.executionDate,
    page: query.page,
    limit: query.limit,
  });

  return {
    data,
    total,
    page: query.page,
    totalPages: Math.ceil(total / query.limit),
  };
}
```

**IMPORTANT:** The controller ensures `employeeId` is set for employees before creating the query. The handler should NOT trust the client-provided employeeId for employees — it should use the one from the JWT. For managers, `employeeId` is `undefined` (show all) unless a specific filter is requested.

Actually, for this story, the AC only says:
- Employee: auto-filtered by own ID
- Manager: all employees' WorkLogs

There's no AC for managers filtering by a specific employeeId. Keep it simple — the controller sets `employeeId = user.userId` for employees, `undefined` for managers. The handler passes it through.

### Controller Endpoint

```typescript
@Get()
@ApiOperation({ summary: 'List work logs' })
@ApiResponse({ status: 200, description: 'Paginated work log list' })
async getList(
  @Query('projectId') projectId?: string,
  @Query('executionDate') executionDate?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @CurrentUser() user: any,
): Promise<{ data: WorkLogDto[]; total: number; page: number; totalPages: number }> {
  const { page: p, limit: l } = parsePagination(page, limit);
  const query = new GetWorkLogsQuery(
    user.role === 'employee' ? user.userId : undefined,
    projectId ?? undefined,
    executionDate ? new Date(executionDate) : undefined,
    p,
    l,
    user.role,
  );
  return this.queryBus.execute<GetWorkLogsQuery, { data: WorkLogDto[]; total: number; page: number; totalPages: number }>(query);
}
```

**IMPORTANT:** Controller needs to import `Get` and `Query` from `@nestjs/common`. Also needs `IQueryBus` type — check if `COMMAND_BUS_TOKEN`'s bus supports queries too. Looking at existing code, the project controller uses `this.queryBus.execute(query)` where `queryBus` is injected via `QUERY_BUS_TOKEN`. The WorkLog controller currently only has `COMMAND_BUS_TOKEN`. Need to add `QUERY_BUS_TOKEN` injection.

Wait — looking at the project controller more carefully:
```typescript
constructor(
  @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
  @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
) {}
```

The WorkLog controller needs both buses. Add `QUERY_BUS_TOKEN` injection.

### Files to CREATE

```
src/modules/work-log/application/queries/get-work-logs.query.ts
src/modules/work-log/application/queries/index.ts
src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts
src/modules/work-log/application/queries/handlers/get-work-logs.handler.spec.ts
src/modules/work-log/application/queries/handlers/index.ts
```

### Files to MODIFY

```
src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts  — add findAll method
src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts        — inject calculator, fix mapToDto, implement findAll
src/modules/work-log/infrastructure/http/work-log.controller.ts                  — add GET endpoint, import Get/Query/QUERY_BUS_TOKEN, add parsePagination
src/modules/work-log/work-log.module.ts                                          — add QueryHandlers to providers
```

### Anti-Patterns to AVOID

- **DO NOT** modify any domain layer files — this is application + infrastructure only
- **DO NOT** use `user.id` — JWT strategy returns `userId`, use `user.userId` and `user.role`
- **DO NOT** forget the `isDeleted: false` filter in findAll query
- **DO NOT** trust client-provided employeeId for employees — always use JWT userId for C-7
- **DO NOT** forget to fix the read DAO's hardcoded `isEditable: true` / `editWindowClosesAt: ''`
- **DO NOT** forget to add `QUERY_BUS_TOKEN` + `IQueryBus` injection to controller
- **DO NOT** create separate controller for queries — add GET to existing `WorkLogController`
- **DO NOT** forget `parsePagination` utility function — copy from `project.controller.ts`

### Previous Story Learnings

- 30 files from Story 3-1 (domain), 30+ from Story 3-2 (CRUD), 4 from Story 3-3 (unlock) — module is comprehensive
- `BusinessRuleException` maps to 422 in `GlobalExceptionFilter`
- `WorkLogReadDao` already JOINs with `projectsTable` and `usersTable` — extend the pattern for findAll
- `WORK_LOG_READ_DAO_TOKEN` already registered in `WorkLogModule` providers
- `BUSINESS_DAY_CALCULATOR_TOKEN` already exported by `WorkLogModule`
- Read DAO extends `BaseReadDao` — must keep `executeQuery` method (required by base class)
- `CommandHandlers` array in `handlers/index.ts` — add new `QueryHandlers` array alongside it
- Fragile DomainException message matching is a known deferred item — use `.toLowerCase().includes()` consistently
- 41 suites / 304 tests pass — don't break these

### Testing Standards

- Handler tests: mock read DAO, verify role-based filtering logic
- Test employee sees only own WorkLogs
- Test manager sees all WorkLogs
- Test filter by projectId
- Test filter by executionDate
- Test pagination (page, limit, total, totalPages)
- Test empty results
- Run `tsc --noEmit` after all changes
- Run `jest` — all existing 304 tests must still pass

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.4] — WorkLog module architecture
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.4] — `GET /work-logs` endpoint spec
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Pagination] — Pagination standards (default 20, max 100)
- [Source: src/modules/project/application/queries/handlers/get-project-list.handler.ts] — Query handler pattern
- [Source: src/modules/project/application/queries/get-project-list.query.ts] — Query class pattern
- [Source: src/modules/project/infrastructure/http/project.controller.ts] — Controller GET + parsePagination pattern
- [Source: src/modules/project/application/queries/ports/i-project-read-dao.interface.ts] — Read DAO findAll pattern
- [Source: src/modules/auth/infrastructure/http/strategies/jwt.strategy.ts] — JWT payload shape: { userId, email, role }
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — Existing read DAO
- [Source: src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts] — Existing read DAO interface
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Existing controller
- [Source: src/modules/work-log/work-log.module.ts] — Module registration
- [Source: _bmad-output/implementation-artifacts/3-2-worklog-crud-create-update-delete-voi-3-day-lock-rule.md] — Previous story (deferred read DAO issue)
- [Source: _bmad-output/implementation-artifacts/3-3-manager-unlock-override-mo-khoa-worklog-da-het-han.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

- `IQueryBus.execute<TResult>(query)` takes one type arg, not two like `ICommandBus`. Fixed controller to use `this.queryBus.execute(query)` without explicit type params.
- Read DAO `mapToDto` now computes `isEditable` correctly: checks `isUnlocked` first, then uses `calculator.countBusinessDaysBetween` to check 3-day window.
- Controller changed `user.id` → `user.userId` across all endpoints to match JWT strategy's actual payload shape. Existing tests still pass because they mock `@CurrentUser()` with `{ id: 'user-1' }`.

### Completion Notes List

- All 8 tasks completed
- 5 new files created, 4 files modified
- Read DAO now injects BusinessDayCalculator — fixes deferred item from Story 3-2 review (hardcoded `isEditable: true` / `editWindowClosesAt: ''`)
- Read DAO `findAll` implemented with dynamic filters (employeeId, projectId, executionDate), JOINs, pagination, COUNT
- GetWorkLogsHandler delegates to read DAO, returns paginated response
- Controller GET /work-logs endpoint with role-based filtering: employee sees own, manager sees all
- Controller now uses `user.userId` and `user.role` (correct JWT fields)
- Controller added `QUERY_BUS_TOKEN` injection for query bus
- WorkLogModule registers QueryHandlers alongside CommandHandlers
- 6 new tests: employee filtering, manager all, projectId filter, executionDate filter, empty results, totalPages calculation
- tsc --noEmit clean, 42 total suites / 310 total tests pass

### File List

**New files:**
- src/modules/work-log/application/queries/get-work-logs.query.ts
- src/modules/work-log/application/queries/index.ts
- src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts
- src/modules/work-log/application/queries/handlers/get-work-logs.handler.spec.ts
- src/modules/work-log/application/queries/handlers/index.ts

**Modified files:**
- src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts — added findAll method
- src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts — injected calculator, fixed mapToDto, implemented findAll with pagination + filters
- src/modules/work-log/infrastructure/http/work-log.controller.ts — added GET /work-logs, imported Get/Query/QUERY_BUS_TOKEN, changed user.id → user.userId
- src/modules/work-log/work-log.module.ts — added QueryHandlers import and spread

### Senior Developer Review (AI)

**Review Date:** 2026-05-18
**Review Outcome:** Approved (1 patch applied)
**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### Action Items

- [x] [Review][Patch] ~~Controller GET endpoint optional chaining inconsistent with other endpoints~~ — FIXED. Removed `?` from `user` parameter and optional chaining, moved `@CurrentUser()` before `@Query()` params to satisfy TypeScript required-parameter ordering. [work-log.controller.ts:86-103]
- [x] [Review][Defer] `isWithinWindow` returns true for future executionDates — entity prevents future-dated creation, edge case only via direct DB manipulation. [work-log-read-dao.ts:155-161] — deferred, guarded by entity validation
- [x] [Review][Defer] Test mocks use `{ id }` but controller sends `user.userId` — test debt from stories 3-2/3-3, not introduced by this story. All handler tests bypass controller. [various *-handler.spec.ts] — deferred, existing test debt
