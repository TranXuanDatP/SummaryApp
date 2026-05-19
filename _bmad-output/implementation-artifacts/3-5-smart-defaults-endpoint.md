# Story 3.5: Smart Defaults Endpoint

Status: done

## Story

As an employee,
I want the API to suggest my most recent project and today's date,
so that I can create a WorkLog by typing only the content.

## Acceptance Criteria

1. **Given** I am authenticated as an employee and have created WorkLogs before, **When** I send `GET /work-logs/defaults`, **Then** returns `{ suggestedProjectId, suggestedProjectName, todayDate }`
2. `suggestedProjectId` is from my most recent WorkLog's project
3. No previous WorkLogs → `suggestedProjectId` is `null`, `suggestedProjectName` is `null`
4. `todayDate` in ISO 8601 format (YYYY-MM-DD)
5. Endpoint protected by `JwtAuthGuard` — both employees and managers can access (UX-DR4)

## Tasks / Subtasks

- [x] Task 1: Create WorkLogDefaultsDto (AC: #1)
  - [x] Create `src/modules/work-log/application/dtos/work-log-defaults.dto.ts` — response DTO with `suggestedProjectId: string | null`, `suggestedProjectName: string | null`, `todayDate: string`
  - [x] Update `src/modules/work-log/application/dtos/index.ts` — add export
- [x] Task 2: Create GetWorkLogDefaultsQuery (AC: #1)
  - [x] Create `src/modules/work-log/application/queries/get-work-log-defaults.query.ts` — carries `employeeId`
  - [x] Update `src/modules/work-log/application/queries/index.ts` — add export
- [x] Task 3: Create GetWorkLogDefaultsHandler (AC: #1-#4)
  - [x] Create `src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.ts` — uses `IWorkLogReadDao.findMostRecentByEmployee()`, returns `WorkLogDefaultsDto`
  - [x] Update `src/modules/work-log/application/queries/handlers/index.ts` — add `GetWorkLogDefaultsHandler` to `QueryHandlers` array
- [x] Task 4: Add defaults endpoint to controller (AC: #5)
  - [x] Update `src/modules/work-log/infrastructure/http/work-log.controller.ts` — add `GET /work-logs/defaults` with `@CurrentUser()`, dispatches `GetWorkLogDefaultsQuery`
- [x] Task 5: Write tests (AC: all)
  - [x] `get-work-log-defaults.handler.spec.ts` — success with recent WorkLog, success with no WorkLogs (null fields), verify ISO date format
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### MUST-FOLLOW: Existing Codebase Patterns

**This is a QUERY-ONLY story.** No commands, no mutations, no domain changes. Only read-side (query + DTO + controller GET endpoint).

**Query pattern** (follow `get-work-logs.handler.ts` exactly):
```typescript
import { IQuery } from 'src/libs/core/application';

export class GetWorkLogDefaultsQuery extends IQuery<WorkLogDefaultsDto> {
  constructor(public readonly employeeId: string) {
    super();
  }
}
```

**Query handler pattern** (follow `get-work-logs.handler.ts` exactly):
```typescript
@QueryHandler(GetWorkLogDefaultsQuery)
export class GetWorkLogDefaultsHandler implements IQueryHandler<GetWorkLogDefaultsQuery, WorkLogDefaultsDto> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
  ) {}

  async execute(query: GetWorkLogDefaultsQuery): Promise<WorkLogDefaultsDto> {
    const recent = await this.workLogReadDao.findMostRecentByEmployee(query.employeeId);

    return new WorkLogDefaultsDto({
      suggestedProjectId: recent?.projectId ?? null,
      suggestedProjectName: recent?.projectName ?? null,
      todayDate: new Date().toISOString().split('T')[0],
    });
  }
}
```

**Controller pattern** — add `GET /work-logs/defaults` BEFORE the parameterized `GET :id` route. NestJS evaluates routes top-to-bottom; if `defaults` is placed after `:id`, it will be captured as an ID parameter.

```typescript
@Get('defaults')
@ApiOperation({ summary: 'Get smart defaults for creating a work log' })
@ApiResponse({ status: 200, description: 'Default values returned' })
async getDefaults(@CurrentUser() user: any): Promise<WorkLogDefaultsDto> {
  const query = new GetWorkLogDefaultsQuery(user.userId);
  return this.queryBus.execute(query);
}
```

**CRITICAL: Route ordering.** Place `@Get('defaults')` BEFORE `@Get() :id` in the controller. Currently the controller has `@Get()` at line 74 (list) and no `@Get(':id')` yet. Place the new `@Get('defaults')` route BEFORE the `@Get()` list route.

**Import paths:**
- `src/libs/core/application` for `IQuery`, `IQueryHandler`
- `src/libs/shared/cqrs` for `QueryHandler`
- `../../dtos` for `WorkLogDefaultsDto` (relative from queries/)
- `../../../constants/tokens` for `WORK_LOG_READ_DAO_TOKEN`
- `../ports` for `IWorkLogReadDao`

### WorkLogDefaultsDto Design

```typescript
export class WorkLogDefaultsDto {
  suggestedProjectId: string | null;
  suggestedProjectName: string | null;
  todayDate: string; // ISO 8601 date (YYYY-MM-DD)

  constructor(params: {
    suggestedProjectId: string | null;
    suggestedProjectName: string | null;
    todayDate: string;
  }) {
    this.suggestedProjectId = params.suggestedProjectId;
    this.suggestedProjectName = params.suggestedProjectName;
    this.todayDate = params.todayDate;
  }
}
```

### Key Implementation Details

**`findMostRecentByEmployee()` already exists** in `IWorkLogReadDao` and `WorkLogReadDao`. It returns `WorkLogDto | null` with `projectId` and `projectName` populated via JOIN. The handler just calls this method and maps the result.

**`todayDate` format:** ISO 8601 date only — `new Date().toISOString().split('T')[0]` gives `YYYY-MM-DD`. This matches the UX design requirement (UX-DR4) and the `executionDate` format in `CreateWorkLogDto`.

**No role restriction:** Both employees and managers can access. The `suggestedProjectId` is based on the authenticated user's own most recent WorkLog. The `JwtAuthGuard` (global) is sufficient — no `@Roles()` needed.

**No `@Roles()` decorator needed** — this endpoint is for any authenticated user.

### Files to CREATE

```
src/modules/work-log/application/dtos/work-log-defaults.dto.ts
src/modules/work-log/application/queries/get-work-log-defaults.query.ts
src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.ts
src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.spec.ts
```

### Files to MODIFY

```
src/modules/work-log/application/dtos/index.ts                  — add WorkLogDefaultsDto export
src/modules/work-log/application/queries/index.ts               — add GetWorkLogDefaultsQuery export
src/modules/work-log/application/queries/handlers/index.ts      — add GetWorkLogDefaultsHandler to QueryHandlers array
src/modules/work-log/infrastructure/http/work-log.controller.ts — add GET /work-logs/defaults endpoint
```

### Anti-Patterns to AVOID

- **DO NOT** add `@Roles()` to this endpoint — both employees and managers can get defaults
- **DO NOT** place `@Get('defaults')` after the list `@Get()` or any parameterized route — NestJS route ordering will catch `defaults` as an `:id` param
- **DO NOT** modify the domain layer — this is purely read-side
- **DO NOT** modify `IWorkLogReadDao` or `WorkLogReadDao` — `findMostRecentByEmployee()` already exists and returns what we need
- **DO NOT** compute `isEditable` or `editWindowClosesAt` — the defaults DTO only needs `suggestedProjectId`, `suggestedProjectName`, `todayDate`
- **DO NOT** forget to update the `QueryHandlers` array in `handlers/index.ts`
- **DO NOT** forget to import `GetWorkLogDefaultsQuery` in the controller (alongside existing `GetWorkLogsQuery`)
- **DO NOT** forget to import `WorkLogDefaultsDto` in the controller

### Previous Story Learnings (Stories 3.1-3.4)

- Controller now injects both `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`
- `user.userId` is the correct field (not `user.id`) — fixed in Story 3.3
- `QueryHandlers` array already exists in `handlers/index.ts` — currently only `GetWorkLogsHandler`
- Module already spreads `QueryHandlers` in providers
- `WorkLogReadDao.findMostRecentByEmployee()` returns full `WorkLogDto` with `projectName` via JOIN
- `WorkLogReadDto.mapToDto()` hardcodes `isEditable: true, editWindowClosesAt: ''` — acceptable for lookups, not for this story's response (we return a different DTO)
- All existing tests must pass — don't break them

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Handler tests: mock `IWorkLogReadDao`
- Mock `findMostRecentByEmployee()` to return `WorkLogDto` or `null`
- Verify `todayDate` format is `YYYY-MM-DD`
- Run `tsc --noEmit` and `jest`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.4] — WorkLog endpoints
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR4] — Smart defaults endpoint spec
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#UJ-01] — Smart default project in daily flow
- [Source: src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts] — Query handler pattern to follow
- [Source: src/modules/work-log/application/queries/get-work-logs.query.ts] — Query pattern to follow
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — `findMostRecentByEmployee()` implementation
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Controller to extend
- [Source: src/modules/project/infrastructure/http/project.controller.ts] — Reference for query bus dispatch pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7

### Debug Log References

### Completion Notes List

- All 5 tasks completed
- 4 new files created, 4 files modified
- Query-only story — no domain or command layer changes
- `GET /work-logs/defaults` placed before `@Get()` list route to avoid route ordering issues
- Reuses existing `findMostRecentByEmployee()` from WorkLogReadDao — no DAO changes needed
- `todayDate` formatted as YYYY-MM-DD using local time (consistent with CreateWorkLogHandler)
- Code review: fixed UTC timezone issue (todayDate now uses local date), fixed empty string projectName edge case (|| instead of ??)
- 43 suites / 314 tests pass, tsc --noEmit clean

### File List

**New files:**
- src/modules/work-log/application/dtos/work-log-defaults.dto.ts
- src/modules/work-log/application/queries/get-work-log-defaults.query.ts
- src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.ts
- src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.spec.ts

**Modified files:**
- src/modules/work-log/application/dtos/index.ts — added WorkLogDefaultsDto export
- src/modules/work-log/application/queries/index.ts — added GetWorkLogDefaultsQuery export
- src/modules/work-log/application/queries/handlers/index.ts — added GetWorkLogDefaultsHandler to QueryHandlers array
- src/modules/work-log/infrastructure/http/work-log.controller.ts — added GET /work-logs/defaults endpoint + imports

### Senior Developer Review (AI)

**Review Date:** 2026-05-19
**Review Outcome:** Approved (all patches applied)
**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### Action Items

- [x] [Review][Patch] ~~`todayDate` uses UTC via `toISOString()`, inconsistent with CreateWorkLogHandler~~ — FIXED. Now uses local date formatting.
- [x] [Review][Patch] ~~Empty string `projectName` not caught by `??` null coalescing~~ — FIXED. Changed to `||` operator.
- [x] [Review][Defer] `user.userId` undefined propagation — deferred, pre-existing pattern across all handlers
- [x] [Review][Defer] `user: any` no type safety — deferred, pre-existing pattern
- [x] [Review][Defer] DTO fields mutable — deferred, pre-existing pattern
- [x] [Review][Defer] No DAO error path test — deferred, pre-existing
- [x] [Review][Defer] Archived project could be suggested — deferred, design enhancement not in AC
- [x] [Review][Defer] Mock drift from interface — deferred, pre-existing
