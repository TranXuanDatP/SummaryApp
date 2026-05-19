# Story 3.8: Monthly Report API

Status: done

## Story

As an employee or manager,
I want to view a monthly report table with filters,
so that I can review all work entries for a given period.

## Acceptance Criteria

1. **Given** I am authenticated, **When** I send `GET /reports/monthly?month=5&year=2026&employeeId=abc&projectId=xyz`, **Then** returns paginated report `{ data: [MonthlyReportEntryDto], total, page, totalPages }`
2. Each entry includes: `date` (YYYY-MM-DD), `projectName`, `content`, `employeeId`, `employeeName`, `comments` (manager name + content) — plus `id`, `isEditable`, `editWindowClosesAt`, `version` from WorkLogDto
3. Sorted by `executionDate asc`
4. As employee: `employeeId` forced to my own (`currentUser.userId`), can filter by `projectId`
5. As manager: can filter by both `employeeId` and `projectId`, or no filter = all employees (UX-DR10)
6. Month/year required — missing returns `400 VALIDATION_ERROR`
7. Empty result returns `{ data: [], total: 0 }` (UX-DR9)

## Tasks / Subtasks

- [x] Task 1: Create MonthlyReportEntryDto and CommentSummaryDto (AC: #1, #2)
  - [x] Create `src/modules/work-log/application/dtos/monthly-report.dto.ts` — `CommentSummaryDto` with `managerName: string, content: string`; `MonthlyReportEntryDto` with all WorkLogDto fields + `comments: CommentSummaryDto[]` + `date: string` (formatted YYYY-MM-DD from executionDate)
  - [x] Update `src/modules/work-log/application/dtos/index.ts` — add exports
- [x] Task 2: Create GetMonthlyReportQuery (AC: #1)
  - [x] Create `src/modules/work-log/application/queries/get-monthly-report.query.ts` — carries `month`, `year`, `employeeId?`, `projectId?`, `page`, `limit`, `userRole`
  - [x] Update `src/modules/work-log/application/queries/index.ts` — add export
- [x] Task 3: Add `findMonthlyReport` to Read DAO (AC: #1, #3, #4, #5)
  - [x] Update `src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts` — add `findMonthlyReport(params: { month: number; year: number; employeeId?: string; projectId?: string; page: number; limit: number }): Promise<{ data: WorkLogDto[]; total: number }>`
  - [x] Update `src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts` — implement method with date range filter (gte/lt), optional employeeId/projectId, sorted ASC, pagination
- [x] Task 4: Create GetMonthlyReportHandler (AC: #1-#5, #7)
  - [x] Create `src/modules/work-log/application/queries/handlers/get-monthly-report.handler.ts` — reuses `findMonthlyReport` DAO, maps WorkLogDto to MonthlyReportEntryDto, adds empty `comments: []`, computes totalPages
  - [x] Update `src/modules/work-log/application/queries/handlers/index.ts` — add to `QueryHandlers` array
- [x] Task 5: Create ReportController (AC: #4, #5, #6)
  - [x] Create `src/modules/work-log/infrastructure/http/report.controller.ts` — `@Controller('reports')` with `GET /monthly` endpoint, query params: month, year, employeeId, projectId, page, limit
  - [x] Update `src/modules/work-log/infrastructure/http/index.ts` — add export
  - [x] Update `src/modules/work-log/work-log.module.ts` — add `ReportController` to controllers array
- [x] Task 6: Write tests (AC: all)
  - [x] `get-monthly-report.handler.spec.ts` — pagination, employee filtered to own, manager sees all, projectId filter, empty result, sorted ASC, totalPages calculation
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### MUST-FOLLOW: Existing Codebase Patterns

**This is a QUERY-ONLY story.** No commands, no mutations, no domain changes.

**CRITICAL: New route prefix** — the report endpoint is `GET /reports/monthly`, NOT `GET /work-logs/monthly`. This requires a NEW controller with `@Controller('reports')`.

### MonthlyReportEntryDto Design

The report entry wraps WorkLogDto data plus a comments field. Since the Comment module (Epic 4) doesn't exist yet, `comments` is always `[]`.

```typescript
export class CommentSummaryDto {
  managerName: string;
  content: string;

  constructor(params: { managerName: string; content: string }) {
    this.managerName = params.managerName;
    this.content = params.content;
  }
}

export class MonthlyReportEntryDto {
  id: string;
  date: string;              // executionDate formatted as YYYY-MM-DD
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  content: string;
  isEditable: boolean;
  editWindowClosesAt: string;
  version: number;
  comments: CommentSummaryDto[];

  constructor(params: { ... }) { ... }
}
```

**Comments placeholder:** `comments` is always `[]` in this story. The Comment module (Epic 4, Story 4.1+) will provide the data to populate this field. The handler does NOT need to query any comment table.

### Handler Key Logic

The handler maps WorkLogDto → MonthlyReportEntryDto and computes pagination metadata:

```typescript
async execute(query: GetMonthlyReportQuery): Promise<{ data: MonthlyReportEntryDto[]; total: number; page: number; totalPages: number }> {
  const { data: workLogs, total } = await this.workLogReadDao.findMonthlyReport({
    month: query.month,
    year: query.year,
    employeeId: query.employeeId,
    projectId: query.projectId,
    page: query.page,
    limit: query.limit,
  });

  const entries = workLogs.map(wl => new MonthlyReportEntryDto({
    id: wl.id,
    date: wl.executionDate.split('T')[0],
    projectId: wl.projectId,
    projectName: wl.projectName,
    employeeId: wl.employeeId,
    employeeName: wl.employeeName,
    content: wl.content,
    isEditable: wl.isEditable,
    editWindowClosesAt: wl.editWindowClosesAt,
    version: wl.version,
    comments: [], // Populated when Comment module is implemented (Epic 4)
  }));

  const totalPages = Math.ceil(total / query.limit);

  return { data: entries, total, page: query.page, totalPages };
}
```

### DAO Method: findMonthlyReport

New method in Read DAO for monthly report queries:

```typescript
// Interface addition:
findMonthlyReport(params: {
  month: number;
  year: number;
  employeeId?: string;
  projectId?: string;
  page: number;
  limit: number;
}): Promise<{ data: WorkLogDto[]; total: number }>;

// Implementation:
async findMonthlyReport(params: { ... }): Promise<{ data: WorkLogDto[]; total: number }> {
  const { month, year, page, limit } = params;
  const offset = (page - 1) * limit;

  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month, 1);
  endDate.setHours(0, 0, 0, 0);

  const conditions = [
    gte(workLogsTable.executionDate, startDate),
    lt(workLogsTable.executionDate, endDate),
    eq(workLogsTable.isDeleted, false),
  ];

  if (params.employeeId) {
    conditions.push(eq(workLogsTable.employeeId, params.employeeId));
  }
  if (params.projectId) {
    conditions.push(eq(workLogsTable.projectId, params.projectId));
  }

  const whereClause = and(...conditions);

  const selectShape = {
    workLog: workLogsTable,
    projectName: projectsTable.name,
    employeeName: usersTable.fullName,
  };

  const [dataResult, countResult] = await Promise.all([
    this.db
      .select(selectShape)
      .from(workLogsTable)
      .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
      .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
      .where(whereClause)
      .orderBy(asc(workLogsTable.executionDate))  // ASC for reports
      .limit(limit)
      .offset(offset),
    this.db
      .select({ count: count() })
      .from(workLogsTable)
      .where(whereClause),
  ]);

  return {
    data: dataResult.map(row => this.mapToDto(row.workLog, row.projectName ?? '', row.employeeName ?? '')),
    total: Number(countResult[0]?.count ?? 0),
  };
}
```

**IMPORTANT:** Need to import `asc` from `drizzle-orm` (currently imports `eq, and, desc, count, gte, lt`).

### ReportController Design

New controller at `/reports` prefix, registered in WorkLogModule:

```typescript
@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportController {
  constructor(
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly report' })
  @ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
  @ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Monthly report data' })
  @ApiResponse({ status: 400, description: 'Missing month/year' })
  async getMonthlyReport(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: MonthlyReportEntryDto[]; total: number; page: number; totalPages: number }> {
    if (!month || !year) {
      throw new ValidationException('month and year are required');
    }
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
      throw new ValidationException('Invalid month or year');
    }

    const { page: p, limit: l } = parsePagination(page, limit);

    // C-7 enforcement
    const targetEmployeeId = user.role === 'manager' ? (employeeId || undefined) : user.userId;
    const targetProjectId = projectId || undefined;

    const query = new GetMonthlyReportQuery(m, y, targetEmployeeId, targetProjectId, p, l, user.role);
    return this.queryBus.execute(query);
  }
}
```

**CRITICAL C-7 differences from calendar/summary:**
- Employee: `employeeId` forced to `user.userId` (same as calendar/summary)
- Manager with `employeeId` specified: filter by that employee
- Manager with NO `employeeId`: `employeeId` is `undefined` → DAO returns ALL employees
- Manager with NO filters at all: returns ALL WorkLogs for ALL employees in the month

**Reuse `parsePagination` function** from WorkLogController — extract it to a shared utility or duplicate in ReportController. The simplest approach: define it in the ReportController file (same function).

### Module Registration

Update `work-log.module.ts`:

```typescript
import { WorkLogController } from './infrastructure/http';
import { ReportController } from './infrastructure/http';  // ADD

controllers: [WorkLogController, ReportController],  // ADD ReportController
```

Also update `src/modules/work-log/infrastructure/http/index.ts` to export ReportController.

### Import paths

- `src/libs/core/application` for `IQuery`, `IQueryHandler`
- `src/libs/shared/cqrs` for `QueryHandler`
- `../../dtos` for `MonthlyReportEntryDto` and `WorkLogDto`
- `../../../constants/tokens` for `WORK_LOG_READ_DAO_TOKEN`
- `../ports` for `IWorkLogReadDao`
- `src/libs/core/common` for `ValidationException` (controller)
- `@modules/auth/infrastructure/http/decorators` for `CurrentUser`
- `@nestjs/swagger` for Swagger decorators
- `drizzle-orm` for `asc` (new import in Read DAO)

### Files to CREATE

```
src/modules/work-log/application/dtos/monthly-report.dto.ts
src/modules/work-log/application/queries/get-monthly-report.query.ts
src/modules/work-log/application/queries/handlers/get-monthly-report.handler.ts
src/modules/work-log/application/queries/handlers/get-monthly-report.handler.spec.ts
src/modules/work-log/infrastructure/http/report.controller.ts
```

### Files to MODIFY

```
src/modules/work-log/application/dtos/index.ts                  — add MonthlyReportEntryDto, CommentSummaryDto exports
src/modules/work-log/application/queries/index.ts               — add GetMonthlyReportQuery export
src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts — add findMonthlyReport
src/modules/work-log/application/queries/handlers/index.ts      — add GetMonthlyReportHandler to QueryHandlers
src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts — implement findMonthlyReport + import asc
src/modules/work-log/infrastructure/http/index.ts               — add ReportController export
src/modules/work-log/work-log.module.ts                         — add ReportController to controllers
```

### Anti-Patterns to AVOID

- **DO NOT** create the report endpoint under `@Controller('work-logs')` — it must be `@Controller('reports')`
- **DO NOT** add `@Roles()` to the monthly report endpoint — both employees and managers can view
- **DO NOT** modify the domain layer — this is purely read-side
- **DO NOT** query any comment table — Comment module doesn't exist yet, return `comments: []`
- **DO NOT** use `BadRequestException` — use `ValidationException` for validation errors
- **DO NOT** forget C-7 enforcement — employee forced to `user.userId`; manager can see all or filter
- **DO NOT** forget to validate year range (2000-2100)
- **DO NOT** sort DESC — reports must be sorted by `executionDate ASC`
- **DO NOT** forget `asc` import from `drizzle-orm` in Read DAO
- **DO NOT** forget to register ReportController in WorkLogModule
- **DO NOT** forget that manager with NO employeeId filter sees ALL employees (different from calendar/summary where manager defaults to own)
- **DO NOT** use `??` for projectName from WorkLogDto — use `||` to catch empty strings

### Previous Story Learnings (Stories 3.1-3.7)

- Controller injects both `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN` — but ReportController only needs `QUERY_BUS_TOKEN` (no commands)
- `user.userId` is the correct field for employee ID; `user.role` for role check
- `QueryHandlers` array — currently `[GetWorkLogsHandler, GetWorkLogDefaultsHandler, GetCalendarViewHandler, GetSummaryViewHandler]`
- Read DAO already has `findByEmployeeAndMonth` — but that's for a single employee; the report needs multi-employee support for managers
- Read DAO already imports `gte, lt` for date range queries
- `mapToDto` in Read DAO correctly computes `isEditable` and `editWindowClosesAt`
- Use local date formatting, NOT `toISOString().split('T')[0]` for display
- Empty string `projectName` from DAO should be treated as `null` (use `||` not `??`)
- Use `ValidationException` for validation errors, NOT `BadRequestException`
- Validate year range: `y < 2000 || y > 2100`
- All existing 339 tests must pass — don't break them
- Mock DAO must include ALL methods in test setup including `findByEmployeeAndMonth`
- Pre-build a `Set` for work log date lookups instead of using `workLogs.some()` (learned from Story 3.7 review)
- `parsePagination` function exists in WorkLogController — can be reused or duplicated

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Handler tests: mock `IWorkLogReadDao` only (no calculator needed — the DAO already returns WorkLogDto with computed fields)
- Key test cases:
  - Returns paginated result with correct shape
  - Employee: `employeeId` forced to own userId
  - Manager with employeeId: filters by that employee
  - Manager without employeeId: sees all employees
  - Manager without any filter: sees all data
  - ProjectId filter works
  - Empty result: `{ data: [], total: 0, page: 1, totalPages: 0 }`
  - totalPages calculation (e.g., 25 total, limit 10 → totalPages: 3)
  - Results sorted by executionDate ASC
  - comments field is always empty array
  - DAO called with correct month/year range
- Mock DAO must include all methods: `findById`, `findByProjectAndEmployeeAndDate`, `findMostRecentByEmployee`, `findAll`, `findByEmployeeAndMonth`, `findMonthlyReport`
- Run `tsc --noEmit` and `jest`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.8] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.5] — Report endpoints
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#File structure] — report.controller.ts, monthly-report.dto.ts, get-monthly-report.query.ts
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-08] — Report requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#C-7] — Employee visibility constraint
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — Read DAO with mapToDto, findByEmployeeAndMonth pattern
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Controller pattern, parsePagination
- [Source: src/modules/work-log/work-log.module.ts] — Module registration (add ReportController)

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 6 tasks implemented: DTOs, Query, DAO method, Handler, Controller, Tests
- Query-only story — no domain mutations
- New `@Controller('reports')` route prefix for monthly report endpoint
- C-7 enforcement: employee forced to own userId; manager can see all or filter by employeeId
- `comments: []` placeholder — populated when Comment module (Epic 4) is implemented
- DAO uses `asc` ordering for reports (different from `desc` in list view)
- Fixed 3 existing test files that needed `findMonthlyReport` mock added to IWorkLogReadDao mock
- All 351 tests pass (12 new + 339 existing), tsc --noEmit clean

### Code Review Results

**Review Date:** 2026-05-19
**Review Outcome:** ✅ Clean review — all 3 layers passed
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Findings:** 0 decision-needed, 0 patch, 9 defer (all pre-existing patterns), 16 dismissed (false positives / correct spec behavior)
**Reviewer Note:** All findings trace to pre-existing codebase patterns (timezone handling, `any` typing, parseInt behavior) or correct spec implementation. No Story 3-8 specific issues.

### File List

**Created:**
- src/modules/work-log/application/dtos/monthly-report.dto.ts
- src/modules/work-log/application/queries/get-monthly-report.query.ts
- src/modules/work-log/application/queries/handlers/get-monthly-report.handler.ts
- src/modules/work-log/application/queries/handlers/get-monthly-report.handler.spec.ts
- src/modules/work-log/infrastructure/http/report.controller.ts

**Modified:**
- src/modules/work-log/application/dtos/index.ts
- src/modules/work-log/application/queries/index.ts
- src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts
- src/modules/work-log/application/queries/handlers/index.ts
- src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts
- src/modules/work-log/infrastructure/http/index.ts
- src/modules/work-log/work-log.module.ts
- src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.spec.ts
- src/modules/work-log/application/queries/handlers/get-summary-view.handler.spec.ts
- src/modules/work-log/application/queries/handlers/get-calendar-view.handler.spec.ts
