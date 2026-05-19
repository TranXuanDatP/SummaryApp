# Story 3.6: Calendar View API

Status: done

## Story

As an employee,
I want to see my work entries on a calendar layout,
so that I can quickly spot days I forgot to log.

## Acceptance Criteria

1. **Given** I am authenticated as an employee, **When** I send `GET /work-logs/calendar?month=5&year=2026`, **Then** returns array of day objects for entire month: `{ date, isBusinessDay, hasWorkLog, workLogId, isEditable, editWindowClosesAt }` (UX-DR5)
2. `isBusinessDay: false` for weekends and Vietnamese holidays
3. `isEditable` distinguishes editable gaps from locked gaps for frontend color-coding — if `isBusinessDay && !hasWorkLog && within 3-day window`, then `isEditable: true`; if `isBusinessDay && !hasWorkLog && past 3-day window`, then `isEditable: false`
4. Only my own WorkLogs shown (C-7) — employee auto-filtered by `employeeId = currentUser.userId`; manager can see any employee's calendar via optional `employeeId` query param
5. Month/year required — missing returns `400 VALIDATION_ERROR`
6. `editWindowClosesAt` is ISO 8601 datetime string for days with WorkLog, null for days without

## Tasks / Subtasks

- [x] Task 1: Create CalendarDayDto (AC: #1)
  - [x] Create `src/modules/work-log/application/dtos/calendar-day.dto.ts` — response DTO per day: `date: string`, `isBusinessDay: boolean`, `hasWorkLog: boolean`, `workLogId: string | null`, `isEditable: boolean`, `editWindowClosesAt: string | null`
  - [x] Update `src/modules/work-log/application/dtos/index.ts` — add export
- [x] Task 2: Create GetCalendarViewQuery (AC: #1)
  - [x] Create `src/modules/work-log/application/queries/get-calendar-view.query.ts` — carries `employeeId`, `month: number`, `year: number`
  - [x] Update `src/modules/work-log/application/queries/index.ts` — add export
- [x] Task 3: Add `findByEmployeeAndMonth` to Read DAO (AC: #1, #2, #4)
  - [x] Update `src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts` — add `findByEmployeeAndMonth(employeeId: string, month: number, year: number): Promise<WorkLogDto[]>`
  - [x] Update `src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts` — implement method querying all non-deleted WorkLogs for employee in given month
- [x] Task 4: Create GetCalendarViewHandler (AC: #1-#4, #6)
  - [x] Create `src/modules/work-log/application/queries/handlers/get-calendar-view.handler.ts` — generates full month array using BusinessDayCalculator + DAO results, computes `isEditable`/`editWindowClosesAt` per day
  - [x] Update `src/modules/work-log/application/queries/handlers/index.ts` — add to `QueryHandlers` array
- [x] Task 5: Add calendar endpoint to controller (AC: #4, #5)
  - [x] Update `src/modules/work-log/infrastructure/http/work-log.controller.ts` — add `GET /work-logs/calendar` with `@Query('month')`, `@Query('year')`, `@Query('employeeId')`, dispatches `GetCalendarViewQuery`
- [x] Task 6: Write tests (AC: all)
  - [x] `get-calendar-view.handler.spec.ts` — full month generation, business days vs weekends, WorkLog present/absent, isEditable within/past window, empty month, C-7 enforcement
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### MUST-FOLLOW: Existing Codebase Patterns

**This is a QUERY-ONLY story.** No commands, no mutations, no domain changes.

**Query handler pattern** (follow `get-work-logs.handler.ts` and `get-work-log-defaults.handler.ts`):
```typescript
@QueryHandler(GetCalendarViewQuery)
export class GetCalendarViewHandler implements IQueryHandler<GetCalendarViewQuery, CalendarDayDto[]> {
  constructor(
    @Inject(WORK_LOG_READ_DAO_TOKEN)
    private readonly workLogReadDao: IWorkLogReadDao,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN)
    private readonly calculator: IBusinessDayCalculator,
  ) {}
  async execute(query: GetCalendarViewQuery): Promise<CalendarDayDto[]> { ... }
}
```

**CRITICAL:** The handler needs `BUSINESS_DAY_CALCULATOR_TOKEN` injection (unlike `GetWorkLogDefaultsHandler` which doesn't need it). This is needed to compute `isBusinessDay` per day and `isEditable`/`editWindowClosesAt` for each WorkLog.

**Calendar Day DTO Design:**
```typescript
export class CalendarDayDto {
  date: string;             // YYYY-MM-DD
  isBusinessDay: boolean;
  hasWorkLog: boolean;
  workLogId: string | null;
  isEditable: boolean;
  editWindowClosesAt: string | null;

  constructor(params: { ... }) { ... }
}
```

**Controller pattern** — add `@Get('calendar')` BEFORE `@Get('defaults')` (both are specific routes before the generic `@Get()` list):
```typescript
@Get('calendar')
@ApiOperation({ summary: 'Get calendar view for a month' })
@ApiQuery({ name: 'month', required: true, description: 'Month (1-12)' })
@ApiQuery({ name: 'year', required: true, description: 'Year (e.g. 2026)' })
@ApiQuery({ name: 'employeeId', required: false, description: 'Manager only: view another employee' })
@ApiResponse({ status: 200, description: 'Calendar day array' })
@ApiResponse({ status: 400, description: 'Missing month/year' })
async getCalendar(
  @CurrentUser() user: any,
  @Query('month') month?: string,
  @Query('year') year?: string,
  @Query('employeeId') employeeId?: string,
): Promise<CalendarDayDto[]> {
  if (!month || !year) {
    throw new BadRequestException('month and year are required');
  }
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
    throw new BadRequestException('Invalid month or year');
  }
  // C-7: employee can only see own calendar; manager can specify employeeId
  const targetEmployeeId = user.role === 'manager' ? (employeeId || user.userId) : user.userId;
  const query = new GetCalendarViewQuery(targetEmployeeId, m, y);
  return this.queryBus.execute(query);
}
```

**Import `BadRequestException`** from `@nestjs/common` in the controller.

### Calendar View Handler Key Logic

The handler generates a COMPLETE month calendar (all days 1 through last day of month):

```typescript
async execute(query: GetCalendarViewQuery): Promise<CalendarDayDto[]> {
  // 1. Get all WorkLogs for this employee in this month
  const workLogs = await this.workLogReadDao.findByEmployeeAndMonth(
    query.employeeId, query.month, query.year,
  );

  // 2. Build a map: date string (YYYY-MM-DD) → WorkLogDto for O(1) lookup
  const workLogMap = new Map<string, WorkLogDto>();
  for (const wl of workLogs) {
    const dateKey = wl.executionDate.split('T')[0]; // normalize to date only
    workLogMap.set(dateKey, wl);
  }

  // 3. Generate full month
  const daysInMonth = new Date(query.year, query.month, 0).getDate();
  const result: CalendarDayDto[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(query.year, query.month - 1, day);
    const dateStr = `${query.year}-${String(query.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isBusinessDay = this.calculator.isBusinessDay(date);
    const workLog = workLogMap.get(dateStr);
    const hasWorkLog = !!workLog;

    let isEditable = false;
    let editWindowClosesAt: string | null = null;

    if (hasWorkLog && workLog) {
      // Day with WorkLog: editable if within 3-day window or unlocked
      isEditable = this.calculator.countBusinessDaysBetween(date, new Date()) <= 3
        || date > new Date(); // future dates (shouldn't happen but edge case)
      // Actually use the entity logic: if isUnlocked OR within window
      isEditable = workLog.isUnlocked || this.calculator.countBusinessDaysBetween(date, new Date()) <= 3;
      editWindowClosesAt = this.calculator.getEditWindowClosesAt(date).toISOString();
    } else if (isBusinessDay) {
      // Business day without WorkLog: editable if within 3-day lookback from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(date);
      target.setHours(0, 0, 0, 0);
      const bizDays = this.calculator.countBusinessDaysBetween(target, today);
      // Can create a WorkLog for dates within 3 business days lookback
      isEditable = target <= today && bizDays <= 3;
    }
    // Non-business days: isEditable stays false

    result.push(new CalendarDayDto({
      date: dateStr,
      isBusinessDay,
      hasWorkLog,
      workLogId: workLog?.id ?? null,
      isEditable,
      editWindowClosesAt,
    }));
  }

  return result;
}
```

**IMPORTANT isEditable logic:**
- **Day WITH WorkLog:** `isEditable` = `workLog.isUnlocked` OR `countBusinessDaysBetween(executionDate, today) <= 3`
- **Business day WITHOUT WorkLog (gap):** `isEditable` = `date <= today AND countBusinessDaysBetween(date, today) <= 3` (employee can still create a WorkLog for this date)
- **Non-business day:** `isEditable = false`
- **Future date:** `isEditable = false` (can't create WorkLog for future)

### Read DAO Method: findByEmployeeAndMonth

```typescript
// In IWorkLogReadDao interface:
findByEmployeeAndMonth(employeeId: string, month: number, year: number): Promise<WorkLogDto[]>;

// In WorkLogReadDao implementation:
async findByEmployeeAndMonth(employeeId: string, month: number, year: number): Promise<WorkLogDto[]> {
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(year, month, 1); // first day of next month
  endDate.setHours(0, 0, 0, 0);

  const result = await this.db
    .select({
      workLog: workLogsTable,
      projectName: projectsTable.name,
      employeeName: usersTable.fullName,
    })
    .from(workLogsTable)
    .leftJoin(projectsTable, eq(workLogsTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(workLogsTable.employeeId, usersTable.id))
    .where(
      and(
        eq(workLogsTable.employeeId, employeeId),
        gte(workLogsTable.executionDate, startDate),
        lt(workLogsTable.executionDate, endDate),
        eq(workLogsTable.isDeleted, false),
      ),
    )
    .orderBy(workLogsTable.executionDate);

  return result.map((row) =>
    this.mapToDto(row.workLog, row.projectName ?? '', row.employeeName ?? ''),
  );
}
```

**IMPORTANT:** Need to import `gte` and `lt` from `drizzle-orm` in the Read DAO file (currently only imports `eq, and, desc, count`).

### Route Ordering in Controller

Place `@Get('calendar')` BEFORE `@Get('defaults')` — both are specific named routes that must come before the generic `@Get()` list route. Current order should be:
1. `@Get('calendar')` — NEW
2. `@Get('defaults')` — existing
3. `@Get()` — list

### Import paths

- `src/libs/core/application` for `IQuery`, `IQueryHandler`
- `src/libs/shared/cqrs` for `QueryHandler`
- `../../dtos` for `CalendarDayDto` and `WorkLogDto`
- `../../../constants/tokens` for `WORK_LOG_READ_DAO_TOKEN` and `BUSINESS_DAY_CALCULATOR_TOKEN`
- `../ports` for `IWorkLogReadDao`
- `../../../domain/services` for `IBusinessDayCalculator`
- `@nestjs/common` for `BadRequestException` (controller only)

### Files to CREATE

```
src/modules/work-log/application/dtos/calendar-day.dto.ts
src/modules/work-log/application/queries/get-calendar-view.query.ts
src/modules/work-log/application/queries/handlers/get-calendar-view.handler.ts
src/modules/work-log/application/queries/handlers/get-calendar-view.handler.spec.ts
```

### Files to MODIFY

```
src/modules/work-log/application/dtos/index.ts                  — add CalendarDayDto export
src/modules/work-log/application/queries/index.ts               — add GetCalendarViewQuery export
src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts — add findByEmployeeAndMonth
src/modules/work-log/application/queries/handlers/index.ts      — add GetCalendarViewHandler to QueryHandlers
src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts — implement findByEmployeeAndMonth + import gte, lt
src/modules/work-log/infrastructure/http/work-log.controller.ts — add GET /work-logs/calendar endpoint
```

### Anti-Patterns to AVOID

- **DO NOT** add `@Roles()` to the calendar endpoint — both employees and managers can view (AC #4)
- **DO NOT** place `@Get('calendar')` after `@Get()` or `@Get('defaults')` — route ordering matters
- **DO NOT** modify the domain layer — this is purely read-side
- **DO NOT** forget to add `gte` and `lt` imports from `drizzle-orm` in the Read DAO
- **DO NOT** use `toISOString()` for date formatting in the handler — use local date formatting (fixed in Story 3.5 code review)
- **DO NOT** forget C-7 enforcement — employee always sees only their own calendar; manager can optionally specify employeeId
- **DO NOT** forget that `mapToDto` already computes `isEditable` and `editWindowClosesAt` correctly — reuse those from the returned WorkLogDto
- **DO NOT** generate calendar days beyond the actual month — use `new Date(year, month, 0).getDate()` for days in month
- **DO NOT** forget to validate month (1-12) and year in the controller

### Previous Story Learnings (Stories 3.1-3.5)

- Controller injects both `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`
- `user.userId` is the correct field for employee ID; `user.role` for role check
- `QueryHandlers` array in `handlers/index.ts` — currently `[GetWorkLogsHandler, GetWorkLogDefaultsHandler]`
- Read DAO already injects `BUSINESS_DAY_CALCULATOR_TOKEN` and computes `isEditable` via `isWithinWindow()`
- `mapToDto` in Read DAO correctly computes `isEditable` (considers `isUnlocked`) and `editWindowClosesAt`
- Use local date formatting, NOT `toISOString().split('T')[0]` (fixed in Story 3.5 review)
- Empty string `projectName` from DAO should be treated as `null` (use `||` not `??`)
- All existing 314 tests must pass — don't break them

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Handler tests: mock `IWorkLogReadDao` and `IBusinessDayCalculator`
- Key test cases:
  - Full month generation (correct number of days)
  - Weekend days: `isBusinessDay: false`, `isEditable: false`
  - Day with WorkLog within window: `hasWorkLog: true`, `isEditable: true`, `editWindowClosesAt` present
  - Day with WorkLog past window: `hasWorkLog: true`, `isEditable: false`
  - Day with unlocked WorkLog: `isEditable: true` regardless of window
  - Business day without WorkLog within window: `hasWorkLog: false`, `isEditable: true`
  - Business day without WorkLog past window: `hasWorkLog: false`, `isEditable: false`
  - Empty month (no WorkLogs): all days have `hasWorkLog: false`
- Use `StubBusinessDayCalculator` from existing tests (or create inline stub)
- Run `tsc --noEmit` and `jest`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.4] — `GET /work-logs/calendar` endpoint
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR5] — Calendar view spec with status indicators
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-08] — Calendar view requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#C-7] — Employee visibility constraint
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — Read DAO with calculator injection, mapToDto pattern
- [Source: src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts] — Query handler pattern
- [Source: src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.ts] — Simple query handler pattern
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Controller to extend
- [Source: src/modules/work-log/domain/services/business-day-calculator.interface.ts] — IBusinessDayCalculator interface

## Dev Agent Record

### Agent Model Used

glm-5[1m]

### Debug Log References

### Completion Notes List

- All 6 tasks implemented: CalendarDayDto, GetCalendarViewQuery, findByEmployeeAndMonth DAO method, GetCalendarViewHandler, calendar controller endpoint, 12 handler tests
- Query-only story — no domain mutations
- Handler uses BusinessDayCalculator for isBusinessDay, isEditable, and editWindowClosesAt computation
- C-7 enforced: employee auto-filtered by currentUser.userId; manager can specify employeeId param
- isEditable logic: WorkLog present → unlocked OR within 3-day window; gap on business day → within 3-day lookback; non-business day → false
- Fixed existing test mock (get-work-log-defaults.handler.spec.ts) to include new findByEmployeeAndMonth method
- tsc --noEmit clean, 326/326 tests pass (12 new)

### File List

**Created:**
- src/modules/work-log/application/dtos/calendar-day.dto.ts
- src/modules/work-log/application/queries/get-calendar-view.query.ts
- src/modules/work-log/application/queries/handlers/get-calendar-view.handler.ts
- src/modules/work-log/application/queries/handlers/get-calendar-view.handler.spec.ts

**Modified:**
- src/modules/work-log/application/dtos/index.ts
- src/modules/work-log/application/queries/index.ts
- src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts
- src/modules/work-log/application/queries/handlers/index.ts
- src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts
- src/modules/work-log/infrastructure/http/work-log.controller.ts
- src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.spec.ts

### Review Findings

- [x] [Review][Defer] Future business days without WorkLog are indistinguishable from locked gaps — both return isEditable: false. AC3 defines the gap cases but doesn't address future dates. Deferred: add a status field or isFuture flag in a future story.
- [x] [Review][Patch] AC5 violation: BadRequestException used instead of ValidationException — response will lack required VALIDATION_ERROR code [work-log.controller.ts:91,96]
- [x] [Review][Patch] Year parameter not range-validated — year=0, negative, or astronomically large values accepted [work-log.controller.ts:95]
- [x] [Review][Defer] Timezone-dependent Date construction patterns — pre-existing codebase issue, not introduced by this story
- [x] [Review][Defer] user typed as any — pre-existing pattern across all controllers
- [x] [Review][Defer] Multiple work logs on same day silently overwrite in Map — unique constraint deferred to future DB migration
- [x] [Review][Defer] Holidays hardcoded for 2026 only — already deferred from story 3-2 review
