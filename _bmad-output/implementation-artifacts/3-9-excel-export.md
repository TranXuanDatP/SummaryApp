# Story 3.9: Excel Export

Status: review

## Story

As an employee or manager,
I want to export the monthly report as an Excel file with one click,
so that I can submit or archive the report.

## Acceptance Criteria

1. **Given** I am viewing a monthly report with filters applied, **When** I send `GET /reports/monthly/export?month=5&year=2026&employeeId=abc&projectId=xyz`, **Then** returns `.xlsx` binary with correct `Content-Type` and `Content-Disposition` headers
2. Filename: `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`
3. Excel columns: `STT | TÊN SP/DỰ ÁN | THỜI GIAN (TUẦN) | KẾ HOẠCH | THỰC HIỆN | KẾT QUẢ % | Ý KIẾN | GHI CHÚ`
4. Styling: green header (#C6E0B4), green section rows (#A9D08E), Times New Roman font, thin borders, wrap text, grouped by project+week
5. Same filters as report view applied (C-7 enforcement: employee forced to own userId; manager can filter or see all)
6. Empty data produces Excel with header row only
7. Export completes <5 seconds (NFR-2)
8. Uses `exceljs` library

## Tasks / Subtasks

- [x] Task 1: Install exceljs and add DI token (AC: #8)
  - [x] Run `bun add exceljs` to install the library
  - [x] Update `src/modules/work-log/constants/tokens.ts` — add `EXCEL_EXPORT_SERVICE_TOKEN = Symbol('IExcelExportService')`
- [x] Task 2: Create ExcelExportService (AC: #3, #4, #6)
  - [x] Create `src/modules/work-log/infrastructure/services/excel-export.service.ts` — implements `IExcelExportService` with `generateMonthlyReport(workLogs: WorkLogDto[], options: { employeeName: string; month: number; year: number }): Promise<Buffer>`
  - [x] Implement data grouping: group WorkLogDto[] by projectId + weekOfMonth, aggregate content into bullet points per group
  - [x] Implement week calculation: `Math.floor((day - 1) / 7) + 1` from executionDate
  - [x] Implement Excel layout matching reference tool: Row 4 "Bộ phận: IT" merged C4:H4 centered, Row 6 = 8-column header, section rows for each project, data rows for each project+week group
  - [x] Implement styling: HEADER_FILL=#C6E0B4, SECTION_FILL=#A9D08E, HEADER_FONT=bold Times New Roman 11, NORMAL_FONT=Times New Roman 11, thin borders on all cells, wrap text on content columns, center-align STT/THỜI GIAN/KẾT QUẢ columns
  - [x] Implement column widths: A=6, B=25, C=18, F=15, G=20, D/E/H auto-width with min/max
  - [x] Handle empty data: write header row only, return valid .xlsx
  - [x] Update `src/modules/work-log/infrastructure/services/index.ts` — export `ExcelExportService`
- [x] Task 3: Add export endpoint to ReportController (AC: #1, #2, #5)
  - [x] Update `src/modules/work-log/infrastructure/http/report.controller.ts` — add `WORK_LOG_READ_DAO_TOKEN` and `EXCEL_EXPORT_SERVICE_TOKEN` injections to constructor
  - [x] Add `@Get('monthly/export')` endpoint with same query params as monthly report (month, year, employeeId, projectId)
  - [x] Validate month/year (reuse existing pattern), apply C-7 enforcement (reuse existing `targetEmployeeId` logic)
  - [x] Call `workLogReadDao.findMonthlyReport({ month, year, employeeId, projectId, page: 1, limit: 100000 })` to get all data
  - [x] Determine employeeName for filename: from first workLog's `employeeName` if filtered, else `'All'`
  - [x] Call `excelExportService.generateMonthlyReport(workLogs, { employeeName, month, year })`
  - [x] Return binary response via `@Res() res: FastifyReply`: set `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="..."`, send buffer
  - [x] Add Swagger decorators: `@ApiOperation`, `@ApiResponse({ status: 200 })`
- [x] Task 4: Register ExcelExportService in WorkLogModule (AC: #1)
  - [x] Update `src/modules/work-log/work-log.module.ts` — import `ExcelExportService` from services, add to providers array with `{ provide: EXCEL_EXPORT_SERVICE_TOKEN, useExisting: ExcelExportService }`
- [x] Task 5: Write tests (AC: all)
  - [x] Create `src/modules/work-log/infrastructure/services/excel-export.service.spec.ts` — test grouping by project+week, content aggregation into bullet points, week calculation, empty data returns valid buffer, section headers for each project, correct column count and headers, styling applied
  - [x] Update existing mock DAOs if needed (3 spec files that mock IWorkLogReadDao)
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### MUST-FOLLOW: Reference Tool Excel Layout

The user has an existing Python/Streamlit tool at `F:\Workspace\Tool_Bao_Cao_IT\report_logic.py`. The Excel output must match this format exactly. Key elements from the reference:

**Sheet layout:**
- Sheet name: `"Báo cáo tháng"`
- Row 4: `"Bộ phận: IT"` — merged cells C4:H4, centered, NORMAL_FONT
- Row 6: Header row with 8 columns, HEADER_FILL (#C6E0B4), HEADER_FONT (bold), CENTER_ALIGN, THIN_BORDER
- Section rows: SECTION_FILL (#A9D08E), SECTION_FONT (bold), merged from column B to end, STT column shows project number
- Data rows: NORMAL_FONT, THIN_BORDER, center-align columns A/C/F, wrap-align columns D/E/G/H
- Column widths: A=6, B=25, C=18, F=15, G=20, D/E/H auto-width

**Header labels (Row 6):**
```
["STT", "TÊN SẢN PHẨM/ DỰ ÁN", "THỜI GIAN (TUẦN)", "KẾ HOẠCH ĐẶT RA", "THỰC HIỆN", "KẾT QUẢ : %", "Ý KIẾN ĐỀ XUẤT", "GHI CHÚ"]
```

**Data grouping (from reference tool's aggregate_for_report):**
```
1. Add weekOfMonth to each log: Math.floor((day - 1) / 7) + 1
2. Group by: (projectId, weekOfMonth)
3. Sort groups by: projectName ASC, weekOfMonth ASC
4. Within each group, sort logs by executionDate ASC
5. Aggregate: content → bullet points ("- content1\n- content2"), deduplicated
6. One Excel row per (project + week) group
7. Section row for each new project (green fill, project name merged across columns B-H)
```

**Section row pattern:**
```typescript
// Section STT: sequential number (1, 2, 3...)
// Section name: projectName, merged from column B to column H, left-aligned, SECTION_FILL
```

**Data row pattern:**
```typescript
row_data = ["", projectName, `Tuần ${week}`, "", bulletContent, "", "", ""]
// STT: empty for data rows
// KẾ HOẠCH: empty (no plan field on project)
// KẾT QUẢ: empty (no progress tracking)
// Ý KIẾN: empty (comments module not built)
// GHI CHÚ: empty (no notes field)
```

### ExcelExportService Interface Design

```typescript
export interface IExcelExportService {
  generateMonthlyReport(
    workLogs: WorkLogDto[],
    options: { employeeName: string; month: number; year: number },
  ): Promise<Buffer>;
}
```

The service is purely infrastructure — no domain logic, no CQRS. It takes raw data and produces a Buffer.

### Controller Injection Changes

ReportController currently injects only `QUERY_BUS_TOKEN`. For export, add two more injections:

```typescript
constructor(
  @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  @Inject(WORK_LOG_READ_DAO_TOKEN) private readonly workLogReadDao: IWorkLogReadDao,
  @Inject(EXCEL_EXPORT_SERVICE_TOKEN) private readonly excelExportService: IExcelExportService,
) {}
```

This follows the architecture specification: "Read DAO -> ExcelExportService" for the export flow.

### Data Retrieval Strategy

Reuse the existing `findMonthlyReport` DAO method with `page: 1, limit: 100000` to get all data without practical pagination. This avoids adding a new DAO method. The DAO already handles:
- Date range filtering (gte startOfMonth, lt startOfNextMonth)
- Optional employeeId/projectId filtering
- Joining with projects and users tables for names
- Sorting by executionDate ASC
- Soft-delete exclusion

### Binary Response Pattern (Fastify)

```typescript
import type { FastifyReply } from 'fastify';

@Get('monthly/export')
async exportMonthlyReport(
  @CurrentUser() user: any,
  @Query('month') month?: string,
  // ... other params
  @Res() res: FastifyReply,  // Note: @Res() WITHOUT passthrough
) {
  // ... validation, data retrieval, Excel generation ...
  const filename = `BaoCao_Thang${String(m).padStart(2, '0')}_${y}_${employeeName}.xlsx`;
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.header('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}
```

**IMPORTANT:** Use `@Res()` (without `passthrough: true`) to fully control the response. The existing create endpoint uses `@Res({ passthrough: true })` for Location headers — export does NOT use passthrough.

### Filename Logic

- Employee: `BaoCao_Thang05_2026_{user.employeeName}.xlsx` — forced to own data
- Manager with employeeId filter: `BaoCao_Thang05_2026_{targetEmployeeName}.xlsx` — use filtered employee's name from first workLog
- Manager with no employeeId (all employees): `BaoCao_Thang05_2026_All.xlsx`

Get employeeName from the returned workLogs data: `workLogs[0]?.employeeName ?? 'All'`. For employee role, this is always the user's own name. For manager with no filter, if no data exists, use `'All'`.

### Styling Constants (from reference tool)

```typescript
import { Font, PatternFill, Alignment, Border, Side } from 'exceljs';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } }; // #C6E0B4
const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } }; // #A9D08E
const HEADER_FONT = { bold: true, size: 11, name: 'Times New Roman' };
const NORMAL_FONT = { size: 11, name: 'Times New Roman' };
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};
const CENTER_ALIGN = { horizontal: 'center', vertical: 'middle', wrapText: true };
const WRAP_ALIGN = { horizontal: 'left', vertical: 'middle', wrapText: true };
```

### exceljs API Patterns

```typescript
import { Workbook } from 'exceljs';

const wb = new Workbook();
const ws = wb.addWorksheet('Báo cáo tháng');

// Set row 4: merged "Bộ phận: IT"
ws.getCell('C4').value = 'Bộ phận: IT';
ws.getCell('C4').alignment = { horizontal: 'center' };
ws.mergeCells('C4:H4');

// Header row (row 6)
const headers = ['STT', 'TÊN SẢN PHẨM/ DỰ ÁN', 'THỜI GIAN (TUẦN)', 'KẾ HOẠCH ĐẶT RA', 'THỰC HIỆN', 'KẾT QUẢ : %', 'Ý KIẾN ĐỀ XUẤT', 'GHI CHÚ'];
headers.forEach((h, i) => {
  const cell = ws.getCell(6, i + 1);
  cell.value = h;
  cell.fill = HEADER_FILL;
  cell.font = HEADER_FONT;
  cell.alignment = CENTER_ALIGN;
  cell.border = THIN_BORDER;
});

// Section row
ws.mergeCells(startRow, 2, startRow, 8); // merge B to H
ws.getCell(startRow, 1).value = sectionNumber; // STT
ws.getCell(startRow, 2).value = projectName;   // section name

// Column widths
ws.getColumn(1).width = 6;
ws.getColumn(2).width = 25;
ws.getColumn(3).width = 18;

// Write to buffer
const buffer = await wb.xlsx.writeBuffer() as Buffer;
```

### Anti-Patterns to AVOID

- **DO NOT** use `xlsx` or `sheetjs` — AC #8 explicitly requires `exceljs`
- **DO NOT** use `@Res({ passthrough: true })` for the export endpoint — must use `@Res()` to control binary response
- **DO NOT** create a new CQRS query/handler for the export — inject DAO directly per architecture spec
- **DO NOT** add pagination to the export — return ALL data for the given month
- **DO NOT** modify the domain layer — this is purely infrastructure (file I/O)
- **DO NOT** forget to register ExcelExportService in WorkLogModule providers
- **DO NOT** forget `EXCEL_EXPORT_SERVICE_TOKEN` in tokens.ts
- **DO NOT** sort DESC — Excel data must be sorted ASC by executionDate (same as monthly report)
- **DO NOT** include `@Roles()` decorator — both employees and managers can export
- **DO NOT** forget C-7 enforcement — employee forced to `user.userId`; manager can see all or filter
- **DO NOT** use `BadRequestException` — use `ValidationException` for validation errors
- **DO NOT** hardcode `"Times New Roman"` as a magic string — define as constant
- **DO NOT** forget to update `infrastructure/services/index.ts` to export ExcelExportService
- **DO NOT** create Excel export under `@Controller('work-logs')` — must be on existing `@Controller('reports')`

### Files to CREATE

```
src/modules/work-log/infrastructure/services/excel-export.service.ts
src/modules/work-log/infrastructure/services/excel-export.service.spec.ts
```

### Files to MODIFY

```
src/modules/work-log/constants/tokens.ts                  — add EXCEL_EXPORT_SERVICE_TOKEN
src/modules/work-log/infrastructure/http/report.controller.ts — add export endpoint + injections
src/modules/work-log/infrastructure/services/index.ts     — export ExcelExportService
src/modules/work-log/work-log.module.ts                   — register ExcelExportService provider
package.json                                              — add exceljs dependency (via bun add)
```

### Previous Story Learnings (Stories 3.1-3.8)

- Controller injects `QUERY_BUS_TOKEN` — export will also inject DAO and ExcelExportService
- `user.userId` is the correct field for employee ID; `user.role` for role check
- C-7 enforcement: `user.role === 'manager' ? (employeeId || undefined) : user.userId`
- Manager with NO employeeId filter sees ALL employees (different from calendar/summary)
- Use `ValidationException` for validation errors, NOT `BadRequestException`
- Validate year range: `y < 2000 || y > 2100`
- `parsePagination` function exists in ReportController — reuse for consistency
- All existing 351 tests must pass — don't break them
- Mock DAO must include ALL methods in test setup: `findById`, `findByProjectAndEmployeeAndDate`, `findMostRecentByEmployee`, `findAll`, `findByEmployeeAndMonth`, `findMonthlyReport`
- Use `||` not `??` for projectName/employeeName fallback — empty strings should be treated as falsy
- `findMonthlyReport` DAO returns `{ data: WorkLogDto[], total: number }` with joined projectName/employeeName
- Reports sorted by executionDate ASC (import `asc` from drizzle-orm)
- Fastify is used (not Express) — import `FastifyReply` from `fastify`, not `@nestjs/common`
- Package manager is `bun` — use `bun add exceljs` to install
- QueryHandlers array currently: `[GetWorkLogsHandler, GetWorkLogDefaultsHandler, GetCalendarViewHandler, GetSummaryViewHandler, GetMonthlyReportHandler]`

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- ExcelExportService tests: test grouping logic, aggregation, week calculation, empty data, buffer generation
- Key test cases for ExcelExportService:
  - Groups work logs by project + week correctly
  - Aggregates content into bullet points within each group
  - Calculates week of month correctly (day 1-7 → week 1, 8-14 → week 2, etc.)
  - Produces valid Buffer (non-null, non-empty)
  - Empty input produces Excel with header row only
  - Section rows created for each distinct project
  - Single project, single log works correctly
  - Multiple projects, multiple weeks handled correctly
  - Content deduplication within groups
- Mock WorkLogDto factory: reuse the `makeWorkLog` pattern from 3-8 handler spec
- For controller endpoint: integration test with mocked DAO and ExcelExportService
- Run `tsc --noEmit` and `jest` — all pass (351 existing + new tests)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.9] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.5] — Report endpoints
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.4] — ExcelExportService, tokens
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 5.3] — FR-03 Excel Export requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 6.2] — NFR-2 Performance (<5s)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 3] — UJ-03 Employee Excel Export
- [Source: F:\Workspace\Tool_Bao_Cao_IT\report_logic.py] — Reference Excel format (STYLES, aggregate_for_report, _write_sheet_tong_hop)
- [Source: src/modules/work-log/infrastructure/http/report.controller.ts] — Existing ReportController to extend
- [Source: src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts] — DAO with findMonthlyReport
- [Source: src/modules/work-log/work-log.module.ts] — Module registration
- [Source: src/modules/work-log/constants/tokens.ts] — DI tokens

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 5 tasks implemented: dependency + token, ExcelExportService, controller endpoint, module registration, tests
- exceljs installed as new dependency
- ExcelExportService groups work logs by project + week, aggregates content into bullet points
- Excel styling matches reference tool (Tool_Bao_Cao_IT/report_logic.py): green header (#C6E0B4), green sections (#A9D08E), Times New Roman, thin borders, wrap text, auto-width columns
- Week calculation: `Math.floor((day - 1) / 7) + 1` — matches reference tool's `calc_tuan`
- Controller reuses existing findMonthlyReport DAO with high limit (100000) for export
- C-7 enforcement reused from monthly report endpoint
- Binary response via FastifyReply with proper Content-Type and Content-Disposition headers
- Filename format: `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`
- Fixed existing test file type error in get-monthly-report.handler.spec.ts (makeWorkLog conditional type)
- All 361 tests pass (10 new + 351 existing), tsc --noEmit clean

### File List

**Created:**
- src/modules/work-log/infrastructure/services/excel-export.service.ts
- src/modules/work-log/infrastructure/services/excel-export.service.spec.ts

**Modified:**
- src/modules/work-log/constants/tokens.ts
- src/modules/work-log/infrastructure/http/report.controller.ts
- src/modules/work-log/infrastructure/services/index.ts
- src/modules/work-log/work-log.module.ts
- src/modules/work-log/application/queries/handlers/get-monthly-report.handler.spec.ts
- package.json (added exceljs dependency)
- package-lock.json (added exceljs dependency)
