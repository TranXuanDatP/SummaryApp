# Story 3.7: Summary View API

Status: done

## Story

As an employee,
I want a quick overview of my work activity for a period,
so that I know my completion rate and which days I can still fill.

## Acceptance Criteria

1. **Given** I am authenticated as an employee, **When** I send `GET /work-logs/summary?month=5&year=2026`, **Then** returns `{ period, totalBusinessDays, loggedDays, completionRate, editableGaps, projectBreakdown }` (UX-DR6)
2. `completionRate` = loggedDays / totalBusinessDays (as decimal 0-1, e.g. 0.85)
3. `editableGaps` lists dates still within 3-day window with no WorkLog — array of date strings `YYYY-MM-DD` for business days where `date <= today && countBusinessDaysBetween(date, today) <= 3 && !hasWorkLog`
4. Only my own data (C-7) — employee auto-filtered by `employeeId = currentUser.userId`; manager can see any employee's summary via optional `employeeId` query param
5. Month/year required — missing returns `400 VALIDATION_ERROR`
6. `projectBreakdown` is array of `{ projectId, projectName, workLogCount }` sorted by workLogCount descending
7. `period` is `{ month: number, year: number }`

## Tasks / Subtasks

- [x] Task 1: Create SummaryViewDto and ProjectBreakdownItem (AC: #1, #6, #7)
  - [x] Create `src/modules/work-log/application/dtos/summary-view.dto.ts` — `ProjectBreakdownItem` class with `projectId`, `projectName`, `workLogCount`; `SummaryViewDto` class with `period: { month, year }`, `totalBusinessDays`, `loggedDays`, `completionRate`, `editableGaps: string[]`, `projectBreakdown: ProjectBreakdownItem[]`
  - [x] Update `src/modules/work-log/application/dtos/index.ts` — add exports
- [x] Task 2: Create GetSummaryViewQuery (AC: #1)
  - [x] Create `src/modules/work-log/application/queries/get-summary-view.query.ts` — carries `employeeId`, `month: number`, `year: number`
  - [x] Update `src/modules/work-log/application/queries/index.ts` — add export
- [x] Task 3: Create GetSummaryViewHandler (AC: #1-#4, #6, #7)
  - [x] Create `src/modules/work-log/application/queries/handlers/get-summary-view.handler.ts` — reuses `findByEmployeeAndMonth` DAO + `IBusinessDayCalculator`; computes totalBusinessDays, loggedDays, completionRate, editableGaps, projectBreakdown
  - [x] Update `src/modules/work-log/application/queries/handlers/index.ts` — add to `QueryHandlers` array
- [x] Task 4: Add summary endpoint to controller (AC: #4, #5)
  - [x] Update `src/modules/work-log/infrastructure/http/work-log.controller.ts` — add `GET /work-logs/summary` with `@Query('month')`, `@Query('year')`, `@Query('employeeId')`, dispatches `GetSummaryViewQuery`
- [x] Task 5: Write tests (AC: all)
  - [x] `get-summary-view.handler.spec.ts` — full month stats, completion rate calculation, editable gaps within/past window, project breakdown grouping, empty month (completionRate=0), multiple projects, C-7 enforcement
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### MUST-FOLLOW: Existing Codebase Patterns

**This is a QUERY-ONLY story.** No commands, no mutations, no domain changes.

**Query handler pattern** (follow `get-calendar-view.handler.ts` — same structure):
```typescript
@QueryHandler(GetSummaryViewQuery)
export class GetSummaryViewHandler implements IQueryHandler<GetSummaryViewQuery, SummaryViewDto> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}
  async execute(query: GetSummaryViewQuery): Promise<SummaryViewDto> { ... }
}
```

**REUSE: `findByEmployeeAndMonth` DAO method** — already implemented in Story 3.6. NO new DAO method needed.

### DTO Design

```typescript
export class ProjectBreakdownItem {
  projectId: string;
  projectName: string;
  workLogCount: number;

  constructor(params: { projectId: string; projectName: string; workLogCount: number }) {
    this.projectId = params.projectId;
    this.projectName = params.projectName;
    this.workLogCount = params.workLogCount;
  }
}

export class SummaryViewDto {
  period: { month: number; year: number };
  totalBusinessDays: number;
  loggedDays: number;
  completionRate: number;
  editableGaps: string[];
  projectBreakdown: ProjectBreakdownItem[];

  constructor(params: {
    period: { month: number; year: number };
    totalBusinessDays: number;
    loggedDays: number;
    completionRate: number;
    editableGaps: string[];
    projectBreakdown: ProjectBreakdownItem[];
  }) { ... }
}
```

### Handler Key Logic

The handler computes summary statistics for a month. It reuses the same `findByEmployeeAndMonth` DAO method from Story 3.6.

```typescript
async execute(query: GetSummaryViewQuery): Promise<SummaryViewDto> {
  const { employeeId, month, year } = query;

  // 1. Get all WorkLogs for this employee in this month
  const workLogs = await this.workLogReadDao.findByEmployeeAndMonth(employeeId, month, year);

  // 2. Compute totalBusinessDays — iterate all days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let totalBusinessDays = 0;
  const editableGaps: string[] = [];
  const loggedDateSet = new Set<string>();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const isBusinessDay = this.calculator.isBusinessDay(date);
    if (!isBusinessDay) continue;

    totalBusinessDays++;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Check if any WorkLog exists for this date
    const hasWorkLog = workLogs.some(wl => wl.executionDate.split('T')[0] === dateStr);
    if (hasWorkLog) {
      loggedDateSet.add(dateStr);
    } else {
      // Check if this gap is editable (within 3-day window, not future)
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      if (target <= today) {
        const bizDays = this.calculator.countBusinessDaysBetween(target, today);
        if (bizDays <= 3) {
          editableGaps.push(dateStr);
        }
      }
    }
  }

  const loggedDays = loggedDateSet.size;
  const completionRate = totalBusinessDays > 0 ? loggedDays / totalBusinessDays : 0;

  // 3. Compute projectBreakdown — group WorkLogs by projectId
  const projectMap = new Map<string, { projectName: string; count: number }>();
  for (const wl of workLogs) {
    const key = wl.projectId;
    const existing = projectMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      projectMap.set(key, { projectName: wl.projectName || 'Unknown', count: 1 });
    }
  }
  const projectBreakdown = Array.from(projectMap.entries())
    .map(([projectId, data]) => new ProjectBreakdownItem({
      projectId,
      projectName: data.projectName,
      workLogCount: data.count,
    }))
    .sort((a, b) => b.workLogCount - a.workLogCount);

  return new SummaryViewDto({
    period: { month, year },
    totalBusinessDays,
    loggedDays,
    completionRate,
    editableGaps,
    projectBreakdown,
  });
}
```

**IMPORTANT editableGaps logic:**
- Only BUSINESS DAYS without WorkLog
- Must be `date <= today` (not future)
- Must be within 3-business-day lookback: `countBusinessDaysBetween(date, today) <= 3`
- This is the SAME logic as the calendar view's "gap isEditable" branch

### Controller Pattern

Place `@Get('summary')` AFTER `@Get('calendar')` but BEFORE `@Get('defaults')`:

```typescript
@Get('summary')
@ApiOperation({ summary: 'Get summary view for a month' })
@ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
@ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
@ApiQuery({ name: 'employeeId', required: false, description: 'Manager only: view another employee' })
@ApiResponse({ status: 200, description: 'Summary statistics' })
@ApiResponse({ status: 400, description: 'Missing month/year' })
async getSummary(
  @CurrentUser() user: any,
  @Query('month') month?: string,
  @Query('year') year?: string,
  @Query('employeeId') employeeId?: string,
): Promise<SummaryViewDto> {
  if (!month || !year) {
    throw new ValidationException('month and year are required');
  }
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000 || y > 2100) {
    throw new ValidationException('Invalid month or year');
  }
  const targetEmployeeId = user.role === 'manager' ? (employeeId || user.userId) : user.userId;
  const query = new GetSummaryViewQuery(targetEmployeeId, m, y);
  return this.queryBus.execute(query);
}
```

**CRITICAL:** Use `ValidationException` (NOT `BadRequestException`) — learned from Story 3.6 code review. Import from `src/libs/core/common`.

### Route Ordering in Controller

Current order (after Story 3.6):
1. `@Get('calendar')` — existing
2. `@Get('defaults')` — existing
3. `@Get()` — list

New order:
1. `@Get('calendar')` — existing
2. `@Get('summary')` — NEW
3. `@Get('defaults')` — existing
4. `@Get()` — list

### Import paths

- `src/libs/core/application` for `IQuery`, `IQueryHandler`
- `src/libs/shared/cqrs` for `QueryHandler`
- `../../dtos` for `SummaryViewDto` and `WorkLogDto`
- `../../../constants/tokens` for `WORK_LOG_READ_DAO_TOKEN` and `BUSINESS_DAY_CALCULATOR_TOKEN`
- `../ports` for `IWorkLogReadDao`
- `../../../domain/services` for `IBusinessDayCalculator`
- `src/libs/core/common` for `ValidationException` (controller)

### Files to CREATE

```
src/modules/work-log/application/dtos/summary-view.dto.ts
src/modules/work-log/application/queries/get-summary-view.query.ts
src/modules/work-log/application/queries/handlers/get-summary-view.handler.ts
src/modules/work-log/application/queries/handlers/get-summary-view.handler.spec.ts
```

### Files to MODIFY

```
src/modules/work-log/application/dtos/index.ts                  — add SummaryViewDto, ProjectBreakdownItem exports
src/modules/work-log/application/queries/index.ts               — add GetSummaryViewQuery export
src/modules/work-log/application/queries/handlers/index.ts      — add GetSummaryViewHandler to QueryHandlers
src/modules/work-log/infrastructure/http/work-log.controller.ts — add GET /work-logs/summary endpoint
```

### Anti-Patterns to AVOID

- **DO NOT** add `@Roles()` to the summary endpoint — both employees and managers can view
- **DO NOT** place `@Get('summary')` after `@Get()` — route ordering matters
- **DO NOT** modify the domain layer — this is purely read-side
- **DO NOT** create new DAO methods — reuse `findByEmployeeAndMonth` from Story 3.6
- **DO NOT** use `BadRequestException` — use `ValidationException` for validation errors (learned from Story 3.6 review)
- **DO NOT** forget C-7 enforcement — employee always sees only their own data; manager can optionally specify employeeId
- **DO NOT** forget to validate year range (2000-2100) — learned from Story 3.6 review
- **DO NOT** use `toISOString()` for date formatting — use local date string formatting
- **DO NOT** include non-business days in `editableGaps` — only business days count
- **DO NOT** include future dates in `editableGaps` — only past dates within 3-day window
- **DO NOT** forget `completionRate` edge case: `totalBusinessDays = 0` → `completionRate = 0` (avoid division by zero)
- **DO NOT** use `??` for projectName from WorkLogDto — use `||` to catch empty strings (learned from Story 3.5)

### Previous Story Learnings (Stories 3.1-3.6)

- Controller injects both `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`
- `user.userId` is the correct field for employee ID; `user.role` for role check
- `QueryHandlers` array in `handlers/index.ts` — currently `[GetWorkLogsHandler, GetWorkLogDefaultsHandler, GetCalendarViewHandler]`
- Read DAO already has `findByEmployeeAndMonth` method — reuse it directly
- `mapToDto` in Read DAO correctly computes `isEditable` (considers `isUnlocked`) and `editWindowClosesAt`
- Use local date formatting, NOT `toISOString().split('T')[0]` for display (fixed in Story 3.5 review)
- Empty string `projectName` from DAO should be treated as `null` (use `||` not `??`)
- Use `ValidationException` for validation errors, NOT `BadRequestException` (fixed in Story 3.6 review)
- Validate year range: `y < 2000 || y > 2100` (added in Story 3.6 review)
- All existing 326 tests must pass — don't break them
- Mock DAO must include `findByEmployeeAndMonth` in test setup (learned from Story 3.6)

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Handler tests: mock `IWorkLogReadDao` and `IBusinessDayCalculator`
- Key test cases:
  - Full month: correct totalBusinessDays, loggedDays, completionRate
  - Completion rate = loggedDays / totalBusinessDays (e.g., 20 business days, 15 logged → 0.75)
  - Empty month (no WorkLogs): completionRate = 0, editableGaps contains business days within window
  - editableGaps: business day without WorkLog within 3-day window → included
  - editableGaps: business day without WorkLog past 3-day window → NOT included
  - editableGaps: future business day without WorkLog → NOT included
  - editableGaps: non-business day → NOT included
  - projectBreakdown: multiple projects, sorted by workLogCount descending
  - projectBreakdown: single project
  - projectBreakdown: empty (no WorkLogs) → empty array
  - C-7 enforcement: DAO called with correct employeeId
  - Division by zero guard: month with 0 business days → completionRate = 0
- Mock DAO must include all methods: `findById`, `findByProjectAndEmployeeAndDate`, `findMostRecentByEmployee`, `findAll`, `findByEmployeeAndMonth`
- Run `tsc --noEmit` and `jest`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.4] — `GET /work-logs/summary` endpoint
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR6] — Summary view spec with completionRate, editableGaps, projectBreakdown
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-08] — Summary view requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#C-7] — Employee visibility constraint
- [Source: src/modules/work-log/application/queries/handlers/get-calendar-view.handler.ts] — Calendar handler pattern to follow
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — Read DAO with findByEmployeeAndMonth (reuse)
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Controller to extend
- [Source: src/modules/work-log/domain/services/business-day-calculator.interface.ts] — IBusinessDayCalculator interface

## Dev Agent Record

### Agent Model Used

glm-5[1m]

### Debug Log References

### Completion Notes List

- All 5 tasks implemented: SummaryViewDto + ProjectBreakdownItem, GetSummaryViewQuery, GetSummaryViewHandler, summary controller endpoint, 13 handler tests
- Query-only story — no domain mutations, no new DAO methods (reused findByEmployeeAndMonth from Story 3.6)
- Handler uses BusinessDayCalculator for isBusinessDay and editableGaps computation
- C-7 enforced: employee auto-filtered by currentUser.userId; manager can specify employeeId param
- completionRate = loggedDays / totalBusinessDays with division-by-zero guard
- editableGaps: business days without WorkLog, past, within 3-day lookback only
- projectBreakdown: grouped by projectId, sorted descending by workLogCount
- ValidationException used (not BadRequestException) — applied Story 3.6 review fix
- Year range validation 2000-2100 — applied Story 3.6 review fix
- tsc --noEmit clean, 339/339 tests pass (13 new)

### File List

**Created:**
- src/modules/work-log/application/dtos/summary-view.dto.ts
- src/modules/work-log/application/queries/get-summary-view.query.ts
- src/modules/work-log/application/queries/handlers/get-summary-view.handler.ts
- src/modules/work-log/application/queries/handlers/get-summary-view.handler.spec.ts

**Modified:**
- src/modules/work-log/application/dtos/index.ts
- src/modules/work-log/application/queries/index.ts
- src/modules/work-log/application/queries/handlers/index.ts
- src/modules/work-log/infrastructure/http/work-log.controller.ts

### Review Findings

- [x] [Review][Patch] O(n*m) workLogs.some() lookup inside day loop — pre-build a Set<string> of work log dates for O(1) lookup [get-summary-view.handler.ts:39]
- [x] [Review][Defer] Timezone-dependent Date construction patterns — pre-existing codebase issue, not introduced by this story
- [x] [Review][Defer] Holidays hardcoded for 2026 only — already deferred from story 3-2 review
