# Story 3.2: WorkLog CRUD — Create, Update, Delete với 3-day Lock Rule

Status: done

## Story

As an employee,
I want to create, update, and delete my WorkLog entries within the 3-day window,
so that I can record my daily work and correct mistakes before the lock kicks in.

## Acceptance Criteria

1. **Given** I am authenticated as an employee, **When** I send `POST /work-logs` with `{ content, projectId?, executionDate? }`, **Then** WorkLog created — `projectId` defaults to my most recent project, `executionDate` defaults to today, returns 201 + full WorkLog DTO with `isEditable: true`, `editWindowClosesAt`, `projectName`, `employeeName`
2. `PUT /work-logs/:id` with `{ content }` updates only `content`, only within 3-day window — returns 200 + full WorkLog DTO
3. `DELETE /work-logs/:id` soft-deletes within 3-day window — returns 200 `{ deleted: true, id }`
4. Future `executionDate` → `422 WORKLOG_FUTURE_DATE`
5. `executionDate` beyond 3 business days → `422 WORKLOG_EDIT_WINDOW_EXPIRED`
6. Update/delete on locked WorkLog → `422 WORKLOG_LOCKED` with suggestion "Liên hệ quản lý để mở khóa"
7. Duplicate (same projectId + employeeId + executionDate) → `409 WORKLOG_DUPLICATE`
8. I can only access my own WorkLogs — others return `404 WORKLOG_NOT_FOUND` (C-7)
9. Manager can view any WorkLog (C-7) — but only employees create/update/delete their own
10. All error responses follow format `{ statusCode, code, message, suggestion, details? }`

## Tasks / Subtasks

- [x] Task 1: Create BusinessRuleException for 422 status (AC: #4, #5, #6)
  - [x] Create `src/libs/core/common/exceptions/business-rule.exception.ts` — extends `BaseException`, maps to 422 in GlobalExceptionFilter
  - [x] Update `src/libs/core/common/exceptions/index.ts` — export new exception
  - [x] Update `src/libs/shared/http/filters/global-exception.filter.ts` — add BusinessRuleException → 422 mapping
- [x] Task 2: Create WorkLog DTOs (AC: #1, #10)
  - [x] Create `src/modules/work-log/application/dtos/work-log.dto.ts` — response DTO with id, projectId, employeeId, executionDate, content, isUnlocked, unlockedBy, unlockedAt, unlockReason, version, isEditable, editWindowClosesAt, projectName, employeeName, createdAt, updatedAt
  - [x] Create `src/modules/work-log/application/dtos/create-work-log.dto.ts` — request validation with class-validator (content required, projectId optional, executionDate optional ISO date string)
  - [x] Create `src/modules/work-log/application/dtos/update-work-log.dto.ts` — request validation (content required)
  - [x] Create `src/modules/work-log/application/dtos/index.ts` — barrel export
- [x] Task 3: Create Commands (AC: #1, #2, #3)
  - [x] Create `src/modules/work-log/application/commands/create-work-log.command.ts` — carries content, projectId, employeeId, executionDate
  - [x] Create `src/modules/work-log/application/commands/update-work-log.command.ts` — carries id, content, employeeId (for C-7 check)
  - [x] Create `src/modules/work-log/application/commands/delete-work-log.command.ts` — carries id, employeeId (for C-7 check)
  - [x] Create `src/modules/work-log/application/commands/index.ts` — barrel export
- [x] Task 4: Create BusinessDayCalculator concrete implementation (AC: #4, #5, #6)
  - [x] Create `src/modules/work-log/infrastructure/services/business-day-calculator.service.ts` — implements IBusinessDayCalculator, Injectable, hardcoded Vietnamese holidays 2026
  - [x] Create `src/modules/work-log/infrastructure/services/index.ts` — barrel export
- [x] Task 5: Create Read DAO interface + implementation (AC: #7, #8)
  - [x] Create `src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts` — findById, findByProjectAndEmployeeAndDate, findMostRecentByEmployee
  - [x] Create `src/modules/work-log/application/queries/ports/index.ts`
  - [x] Create `src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts` — Drizzle implementation with project/user joins for display names
  - [x] Create `src/modules/work-log/infrastructure/persistence/read/index.ts`
- [x] Task 6: Create Write Repository implementation (AC: #1, #2, #3)
  - [x] Create `src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts` — extends BaseAggregateRepository<WorkLog>, toPersistence/toDomain mapping
  - [x] Create `src/modules/work-log/infrastructure/persistence/write/index.ts`
- [x] Task 7: Create Command Handlers (AC: all)
  - [x] Create `src/modules/work-log/application/commands/handlers/create-work-log.handler.ts` — validates project existence, duplicate check (C-3), creates WorkLog entity via factory, saves, returns DTO with display names
  - [x] Create `src/modules/work-log/application/commands/handlers/update-work-log.handler.ts` — loads aggregate, C-7 ownership check, catches DomainException → BusinessRuleException, calls updateContent, saves, returns DTO
  - [x] Create `src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts` — loads aggregate, C-7 ownership check, catches DomainException → BusinessRuleException, calls delete, saves, returns { deleted, id }
  - [x] Create `src/modules/work-log/application/commands/handlers/index.ts` — CommandHandlers array
- [x] Task 8: Create Controller (AC: all)
  - [x] Create `src/modules/work-log/infrastructure/http/work-log.controller.ts` — POST /work-logs, PUT /work-logs/:id, DELETE /work-logs/:id
  - [x] Create `src/modules/work-log/infrastructure/http/index.ts`
- [x] Task 9: Create WorkLog Module + register in AppModule (AC: all)
  - [x] Create `src/modules/work-log/work-log.module.ts` — wires all providers, imports SharedCqrsModule + ProjectModule + UserModule
  - [x] Create `src/modules/work-log/index.ts`
  - [x] Update `src/app.module.ts` — add WorkLogModule to imports
- [x] Task 10: Create barrel exports and infrastructure index files (AC: all)
  - [x] Create `src/modules/work-log/application/index.ts`
  - [x] Create `src/modules/work-log/infrastructure/index.ts`
  - [x] Create `src/modules/work-log/infrastructure/persistence/index.ts`
  - [x] Create `src/modules/work-log/infrastructure/projections/work-log-read-model.projection.ts`
  - [x] Create `src/modules/work-log/infrastructure/projections/index.ts`
- [x] Task 11: Write tests (AC: all)
  - [x] `create-work-log.handler.spec.ts` — success with defaults, success with all fields, duplicate rejection, future date rejection, beyond lookback rejection, project not found
  - [x] `update-work-log.handler.spec.ts` — success within window, locked rejection, wrong employee (C-7), not found
  - [x] `delete-work-log.handler.spec.ts` — success within window, locked rejection, wrong employee (C-7), not found
  - [x] `business-day-calculator.service.spec.ts` — business day calculations, weekends, holidays
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### CRITICAL: DomainException → HTTP Status Mapping Gap

The existing `GlobalExceptionFilter` maps `DomainException` → 400 BAD_REQUEST. However, the AC requires:
- 422 for business rule violations (locked, future date, edit window expired)
- 409 for duplicates
- 404 for not found

**Solution:** Create a `BusinessRuleException` extending `BaseException` with code convention `WORKLOG_*`. Add it to `GlobalExceptionFilter` mapping → 422 UNPROCESSABLE_ENTITY. Handlers catch `DomainException` from entity methods and re-throw as the correct application-level exception:

```typescript
// In handlers — catch domain errors and map to HTTP-appropriate exceptions
try {
  workLog.updateContent(command.content, calculator, metadata);
} catch (error) {
  if (error instanceof DomainException) {
    if (error.message.includes('locked')) {
      throw new BusinessRuleException(
        error.message,
        'WORKLOG_LOCKED',
        { suggestion: 'Liên hệ quản lý để mở khóa' },
      );
    }
  }
  throw error;
}
```

### MUST-FOLLOW: Existing Codebase Patterns

**Command pattern** (follow `create-project.handler.ts` exactly):
```typescript
@CommandHandler(CreateWorkLogCommand)
export class CreateWorkLogHandler implements ICommandHandler<CreateWorkLogCommand, WorkLogDto> {
  constructor(
    @Inject(WORK_LOG_REPOSITORY_TOKEN) private readonly repo: IWorkLogRepository,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN) private readonly calculator: IBusinessDayCalculator,
    @Inject(PROJECT_READ_DAO_TOKEN) private readonly projectReadDao: IProjectReadDao,
    @Optional() @Inject(REQUEST_CONTEXT_TOKEN) private readonly requestContext?: IRequestContextProvider,
  ) {}
  async execute(command: CreateWorkLogCommand): Promise<WorkLogDto> { ... }
}
```

**Controller pattern** (follow `project.controller.ts` exactly):
```typescript
@ApiTags('work-logs')
@ApiBearerAuth('JWT-auth')
@Controller('work-logs')
export class WorkLogController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateWorkLogDto, @CurrentUser() user: any, @Res({ passthrough: true }) res: FastifyReply): Promise<WorkLogDto> {
    const command = new CreateWorkLogCommand({ ...dto, employeeId: user.id });
    const result = await this.commandBus.execute<CreateWorkLogCommand, WorkLogDto>(command);
    res.header('Location', `/work-logs/${result.id}`);
    return result;
  }
  // PUT, DELETE follow same pattern
}
```

**Import paths:**
- Core: `import { AggregateRoot, DomainException, ICommandHandler, IQueryHandler } from 'src/libs/core/...'`
- CQRS: `import { CommandHandler, QueryHandler } from 'src/libs/shared/cqrs'`
- Cross-module: `import { PROJECT_READ_DAO_TOKEN, IProjectReadDao } from '@modules/project/...'`
- Cross-module: `import { USER_READ_DAO_TOKEN, IUserReadDao } from '@modules/user/...'`

**Repository pattern** (follow `project.repository.ts`):
- Extends `BaseAggregateRepository<WorkLog>`
- Constructor injects `DATABASE_WRITE_TOKEN`, `EVENT_BUS_TOKEN`, optionally `OUTBOX_REPOSITORY_TOKEN`
- `super(eventBus, outboxRepository, { useOutbox: false })`
- `persist()` method handles insert (version=0) vs update (optimistic lock)
- `toPersistence()` maps entity → Drizzle record
- `toDomain()` maps Drizzle record → entity via `WorkLog.reconstitute()`

**Read DAO pattern** (follow `project-read-dao.ts`):
- Extends `BaseReadDao`
- Injects `DATABASE_READ_TOKEN`
- Uses Drizzle query builder with schema
- Returns DTOs, never entities
- `isDeleted: false` filter on all queries

**Module pattern** (follow `project.module.ts`):
```typescript
@Module({
  imports: [SharedCqrsModule, ProjectModule, UserModule],
  controllers: [WorkLogController],
  providers: [
    WorkLogRepository, { provide: WORK_LOG_REPOSITORY_TOKEN, useExisting: WorkLogRepository },
    WorkLogReadDao, { provide: WORK_LOG_READ_DAO_TOKEN, useExisting: WorkLogReadDao },
    BusinessDayCalculatorService, { provide: BUSINESS_DAY_CALCULATOR_TOKEN, useExisting: BusinessDayCalculatorService },
    ...CommandHandlers,
    ...QueryHandlers,
    WorkLogReadModelProjection,
  ],
  exports: [WORK_LOG_REPOSITORY_TOKEN, WORK_LOG_READ_DAO_TOKEN, BUSINESS_DAY_CALCULATOR_TOKEN],
})
export class WorkLogModule {}
```

### WorkLog DTO Design

**WorkLogDto (response):**
```typescript
export class WorkLogDto {
  id: string;
  projectId: string;
  employeeId: string;
  executionDate: string;        // ISO 8601
  content: string;
  isUnlocked: boolean;
  unlockedBy: string | null;
  unlockedAt: string | null;    // ISO 8601
  unlockReason: string | null;
  version: number;
  isEditable: boolean;          // computed from edit window
  editWindowClosesAt: string;   // computed from executionDate + 3 biz days
  projectName: string;          // joined from project
  employeeName: string;         // joined from user
  createdAt: Date;
  updatedAt: Date;
}
```

**CreateWorkLogDto (request validation):**
```typescript
export class CreateWorkLogDto {
  @IsString() @MinLength(1) @MaxLength(5000)
  content: string;

  @IsOptional() @IsString() @MaxLength(50)
  projectId?: string;

  @IsOptional() @IsDateString()
  executionDate?: string;       // ISO 8601, defaults to today
}
```

**UpdateWorkLogDto (request validation):**
```typescript
export class UpdateWorkLogDto {
  @IsString() @MinLength(1) @MaxLength(5000)
  content: string;
}
```

### Command Design

```typescript
// create-work-log.command.ts
export class CreateWorkLogCommand implements ICommand {
  constructor(
    public readonly content: string,
    public readonly projectId: string | null,   // null = use smart default
    public readonly employeeId: string,
    public readonly executionDate: Date | null, // null = today
  ) {}
}

// update-work-log.command.ts
export class UpdateWorkLogCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly employeeId: string,  // for C-7 ownership check
  ) {}
}

// delete-work-log.command.ts
export class DeleteWorkLogCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly employeeId: string,  // for C-7 ownership check
  ) {}
}
```

### CreateWorkLogHandler Key Logic

```typescript
async execute(command: CreateWorkLogCommand): Promise<WorkLogDto> {
  // 1. Resolve defaults
  let projectId = command.projectId;
  if (!projectId) {
    const recent = await this.workLogReadDao.findMostRecentByEmployee(command.employeeId);
    if (!recent) {
      throw new BusinessRuleException(
        'Project ID is required for first WorkLog',
        'WORKLOG_PROJECT_REQUIRED',
        { suggestion: 'Vui lòng chọn dự án cho WorkLog đầu tiên' },
      );
    }
    projectId = recent.projectId;
  }

  const executionDate = command.executionDate ?? new Date();

  // 2. Validate project exists
  const project = await this.projectReadDao.findById(projectId);
  if (!project) {
    throw NotFoundException.entity('Project', projectId, { code: 'PROJECT_NOT_FOUND' });
  }

  // 3. Duplicate check (C-3)
  const existing = await this.workLogReadDao.findByProjectAndEmployeeAndDate(
    projectId, command.employeeId, executionDate,
  );
  if (existing) {
    throw ConflictException.duplicate('WorkLog', 'project+employee+date', `${projectId}/${command.employeeId}/${executionDate.toISOString()}`, {
      code: 'WORKLOG_DUPLICATE',
      suggestion: 'Bạn đã ghi nhận công việc cho dự án này trong ngày này rồi',
    });
  }

  // 4. Create domain entity (validates future date + lookback via ExecutionDate VO)
  const workLog = WorkLog.create(
    new WorkLogId(randomUUID()),
    { projectId, employeeId: command.employeeId, executionDate, content: command.content },
    this.calculator,
    eventMetadata,
  );

  // 5. Save
  try {
    await this.repository.save(workLog);
  } catch (error: any) {
    if (error?.code === '23505') {
      throw ConflictException.duplicate('WorkLog', 'project+employee+date', '', {
        code: 'WORKLOG_DUPLICATE',
        suggestion: 'Bạn đã ghi nhận công việc cho dự án này trong ngày này rồi',
      });
    }
    throw error;
  }

  // 6. Build response DTO with display names
  return new WorkLogDto({
    ...entityFields,
    isEditable: workLog.isWithinEditWindow(this.calculator),
    editWindowClosesAt: this.calculator.getEditWindowClosesAt(workLog.executionDate).toISOString(),
    projectName: project.name,
    employeeName: await this.getEmployeeName(command.employeeId),
  });
}
```

**IMPORTANT:** The `WorkLog.create()` factory throws `DomainException` for:
- Future execution date → handler should catch and re-throw as `BusinessRuleException('WORKLOG_FUTURE_DATE')`
- Beyond 3 business days lookback → `BusinessRuleException('WORKLOG_EDIT_WINDOW_EXPIRED')`

### UpdateWorkLogHandler Key Logic

```typescript
async execute(command: UpdateWorkLogCommand): Promise<WorkLogDto> {
  const workLog = await this.repository.getById(command.id);
  if (!workLog) {
    throw NotFoundException.entity('WorkLog', command.id, { code: 'WORKLOG_NOT_FOUND' });
  }

  // C-7: Employee ownership check
  if (workLog.employeeId !== command.employeeId) {
    throw NotFoundException.entity('WorkLog', command.id, { code: 'WORKLOG_NOT_FOUND' });
    // Return 404, NOT 403 — to avoid leaking existence of other employees' WorkLogs
  }

  try {
    workLog.updateContent(command.content, this.calculator, eventMetadata);
  } catch (error) {
    if (error instanceof DomainException && error.message.includes('locked')) {
      throw new BusinessRuleException(
        'WorkLog is locked and cannot be edited',
        'WORKLOG_LOCKED',
        { suggestion: 'Liên hệ quản lý để mở khóa' },
      );
    }
    throw error;
  }

  await this.repository.save(workLog);

  return this.buildDto(workLog);
}
```

### DeleteWorkLogHandler Key Logic

```typescript
async execute(command: DeleteWorkLogCommand): Promise<{ deleted: boolean; id: string }> {
  const workLog = await this.repository.getById(command.id);
  if (!workLog) {
    throw NotFoundException.entity('WorkLog', command.id, { code: 'WORKLOG_NOT_FOUND' });
  }

  // C-7: Employee ownership check
  if (workLog.employeeId !== command.employeeId) {
    throw NotFoundException.entity('WorkLog', command.id, { code: 'WORKLOG_NOT_FOUND' });
  }

  try {
    workLog.delete(this.calculator, eventMetadata);
  } catch (error) {
    if (error instanceof DomainException && error.message.includes('locked')) {
      throw new BusinessRuleException(
        'WorkLog is locked and cannot be deleted',
        'WORKLOG_LOCKED',
        { suggestion: 'Liên hệ quản lý để mở khóa' },
      );
    }
    throw error;
  }

  await this.repository.save(workLog);
  return { deleted: true, id: command.id };
}
```

### BusinessRuleException Design

```typescript
// src/libs/core/common/exceptions/business-rule.exception.ts
export class BusinessRuleException extends BaseException {
  constructor(
    message: string,
    code: string,
    details?: Record<string, any>,
  ) {
    super(message, code, details);
  }
}
```

In `GlobalExceptionFilter.getHttpStatus()`, add BEFORE the DomainException check:
```typescript
if (exception instanceof BusinessRuleException) {
  return HttpStatus.UNPROCESSABLE_ENTITY; // 422
}
```

### BusinessDayCalculator Concrete Implementation

```typescript
// src/modules/work-log/infrastructure/services/business-day-calculator.service.ts
@Injectable()
export class BusinessDayCalculatorService implements IBusinessDayCalculator {
  // Vietnamese holidays 2026
  private readonly holidays: Date[] = [
    new Date('2026-01-01'), // New Year
    new Date('2026-01-29'), new Date('2026-01-30'), new Date('2026-01-31'), // Tet
    new Date('2026-02-01'), new Date('2026-02-02'), // Tet holiday
    new Date('2026-04-30'), // Reunification Day
    new Date('2026-05-01'), // Labor Day
    new Date('2026-09-02'), // National Day
  ];

  isBusinessDay(date: Date): boolean {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    if (day === 0 || day === 6) return false; // weekend
    return !this.holidays.some(h => h.getTime() === d.getTime());
  }

  countBusinessDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (current < endDate) {
      current.setDate(current.getDate() + 1);
      if (this.isBusinessDay(current)) count++;
    }
    return count;
  }

  addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) added++;
    }
    return result;
  }

  getEditWindowClosesAt(executionDate: Date): Date {
    return this.addBusinessDays(executionDate, 3);
  }
}
```

### Read DAO Interface for This Story

```typescript
// src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts
export interface IWorkLogReadDao {
  findById(id: string): Promise<WorkLogDto | null>;
  findByProjectAndEmployeeAndDate(projectId: string, employeeId: string, executionDate: Date): Promise<WorkLogDto | null>;
  findMostRecentByEmployee(employeeId: string): Promise<WorkLogDto | null>;
}
```

The `WorkLogReadDao` implementation needs to JOIN with `projectsTable` and `usersTable` to populate `projectName` and `employeeName` in the DTO. Use the relations defined in `workLogsRelations` or manual joins.

### WorkLog Write Repository Key Methods

Follow `project.repository.ts` exactly. Additional methods needed:
- `getById(id: string)` — loads aggregate from DB, filters `isDeleted = false`
- `save(workLog)` — inherited from `BaseAggregateRepository` via `persist()`
- `findByProjectEmployeeDate(projectId, employeeId, date)` — for duplicate check

The `toDomain()` method must use `WorkLog.reconstitute()` (no validation, no events). The `toPersistence()` method maps all WorkLogProps fields plus version/isDeleted/deletedAt.

### Controller Endpoints

| Method | Endpoint | Guard | Returns |
|--------|----------|-------|---------|
| POST | `/work-logs` | `JwtAuthGuard` | 201 + WorkLogDto + Location header |
| PUT | `/work-logs/:id` | `JwtAuthGuard` | 200 + WorkLogDto |
| DELETE | `/work-logs/:id` | `JwtAuthGuard` | 200 + `{ deleted: true, id }` |

Note: `@Roles('employee')` is NOT applied — both employees and managers can create/update/delete (but handlers enforce employeeId ownership for C-7). This matches the architecture where managers might need to create entries too. If stricter control is needed, add `@Roles('employee')` to POST/PUT/DELETE.

### C-7 Enforcement Strategy

For employee role: handlers extract `employeeId` from `@CurrentUser()` and:
- Create: set `employeeId = currentUser.id` (ignore any client-provided value)
- Update/Delete: check `workLog.employeeId === currentUser.id`, if mismatch → 404 (not 403, to avoid leaking existence)

For manager role: can view any WorkLog (handled in query handlers — Story 3.4). For this story, managers use the same endpoints but their own employeeId is used. If a manager needs to edit someone else's WorkLog, they unlock it (Story 3.3) and the employee edits.

### Files to CREATE

```
src/libs/core/common/exceptions/business-rule.exception.ts
src/modules/work-log/application/index.ts
src/modules/work-log/application/dtos/work-log.dto.ts
src/modules/work-log/application/dtos/create-work-log.dto.ts
src/modules/work-log/application/dtos/update-work-log.dto.ts
src/modules/work-log/application/dtos/index.ts
src/modules/work-log/application/commands/create-work-log.command.ts
src/modules/work-log/application/commands/update-work-log.command.ts
src/modules/work-log/application/commands/delete-work-log.command.ts
src/modules/work-log/application/commands/index.ts
src/modules/work-log/application/commands/handlers/create-work-log.handler.ts
src/modules/work-log/application/commands/handlers/update-work-log.handler.ts
src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts
src/modules/work-log/application/commands/handlers/index.ts
src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts
src/modules/work-log/application/queries/ports/index.ts
src/modules/work-log/infrastructure/index.ts
src/modules/work-log/infrastructure/http/work-log.controller.ts
src/modules/work-log/infrastructure/http/index.ts
src/modules/work-log/infrastructure/persistence/index.ts
src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts
src/modules/work-log/infrastructure/persistence/read/index.ts
src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts
src/modules/work-log/infrastructure/persistence/write/index.ts
src/modules/work-log/infrastructure/services/business-day-calculator.service.ts
src/modules/work-log/infrastructure/services/index.ts
src/modules/work-log/infrastructure/projections/work-log-read-model.projection.ts
src/modules/work-log/infrastructure/projections/index.ts
src/modules/work-log/work-log.module.ts
src/modules/work-log/index.ts
```

**Files to MODIFY:**
```
src/libs/core/common/exceptions/index.ts — export BusinessRuleException
src/libs/shared/http/filters/global-exception.filter.ts — add BusinessRuleException → 422 mapping
src/app.module.ts — add WorkLogModule import
```

### Anti-Patterns to AVOID

- **DO NOT** create query handlers for list/calendar/summary/defaults — those are Stories 3.4-3.7
- **DO NOT** create the unlock endpoint or handler — that's Story 3.3
- **DO NOT** create report endpoints — that's Story 3.8
- **DO NOT** import anything from `@nestjs/common` in domain layer files — domain is pure TypeScript
- **DO NOT** forget to catch `DomainException` from entity methods and re-throw as application-level exceptions with correct HTTP status
- **DO NOT** return 403 for C-7 violations — return 404 to avoid leaking existence of other employees' WorkLogs
- **DO NOT** forget smart default for projectId — the create handler must resolve `null` projectId to most recent project
- **DO NOT** forget the `isEditable` and `editWindowClosesAt` computed fields in every WorkLogDto response
- **DO NOT** forget that `WorkLog.create()` validates executionDate via ExecutionDate VO — the handler catches these DomainExceptions
- **DO NOT** forget `isDeleted: false` filter on ALL read queries in repository and read DAO
- **DO NOT** forget the soft delete pattern — `DELETE` sets `_deletedAt`, not hard delete
- **DO NOT** forget to register WorkLogModule in `app.module.ts`
- **DO NOT** forget that the work-log schema and domain layer are already created in Story 3.1 — only add application/infrastructure layers

### Previous Story Learnings (Story 3.1)

- WorkLog entity uses `delete(calculator, metadata)` (renamed from `deleteWithCheck` per review decision 1C — ISoftDeletable was removed)
- `lock()` clears all unlock audit fields (unlockedBy, unlockedAt, unlockReason) per review decision 2A
- Content max length = 5000 chars, validated in both `create()` and `updateContent()`
- `unlock()` is idempotent — early return if already unlocked
- Date mutation: entity stores defensive copies, getter returns copies
- `projectId` and `employeeId` validated for emptiness and max 50 chars
- No `ISoftDeletable` interface — entity tracks `_deletedAt` directly with `isDeleted` getter
- WorkLog does NOT extend `ISoftDeletable` — uses its own `_deletedAt` field
- Drizzle schema registered in shared schema registry already
- 4 domain events already exist: Created, Updated, Deleted, Unlocked
- 36/36 tests pass, 259/259 tests pass — don't break these

### From Epic 2 Learnings

- Use `SharedCqrsModule` for CQRS bus infrastructure
- `CommandHandlers` array spread in module — add handler to array is sufficient
- All handlers follow same pattern: `@CommandHandler(CommandClass)`, inject token, execute, return DTO
- Import paths use `@modules/` and `@shared/` aliases — Jest moduleNameMapper only maps these
- `@CommandHandler` decorator from `src/libs/shared/cqrs` (re-export of @nestjs/cqrs)
- `BaseAggregateRepository` handles event publishing + optimistic concurrency
- Schema registration done in Story 3.1 — no need to re-register
- Repository interface extends `IAggregateRepository<T>` which provides `save()`, `getById()`
- Entity uses `ensureNotDeleted()` guard before mutations

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Handler tests: mock repository, calculator, and read DAOs
- Use `StubBusinessDayCalculator` from Story 3.1 tests
- Controller tests: mock command/query bus
- Run `tsc --noEmit` after all changes
- Run `jest` — all existing tests must still pass (especially Story 3.1's 36 suites)

### Project Structure Notes

- Module name: `work-log` (kebab-case, matching architecture doc)
- Domain layer already exists from Story 3.1 — this story adds application + infrastructure + module
- Follow folder structure: `application/`, `infrastructure/`, `constants/`
- Each folder has `index.ts` barrel export
- Cross-module imports: `@modules/project/...` and `@modules/user/...`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.4] — WorkLog module architecture
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.4] — API endpoint definitions
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-01] — WorkLog management requirements
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 4.5] — Business constraints C-1 through C-7
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Error Code Table] — WORKLOG_* error codes
- [Source: src/modules/project/infrastructure/http/project.controller.ts] — Controller pattern
- [Source: src/modules/project/application/commands/handlers/create-project.handler.ts] — Create handler pattern
- [Source: src/modules/project/application/commands/handlers/update-project.handler.ts] — Update handler pattern
- [Source: src/modules/project/infrastructure/persistence/write/project.repository.ts] — Repository pattern
- [Source: src/modules/project/infrastructure/persistence/read/project-read-dao.ts] — Read DAO pattern
- [Source: src/modules/project/project.module.ts] — Module registration pattern
- [Source: src/libs/shared/http/filters/global-exception.filter.ts] — Exception → HTTP status mapping
- [Source: _bmad-output/implementation-artifacts/3-1-worklog-module-aggregate-value-objects-domain-services.md] — Previous story (domain layer)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

- BusinessRuleException already existed but extended DomainException (400). Changed to extend BaseException directly and added 422 mapping in GlobalExceptionFilter.
- WorkLogRepository needed `delete()` method — BaseAggregateRepository requires it as abstract.
- WorkLogReadModelProjection needed IEventHandler from `src/libs/core/application`, not from `src/libs/shared/cqrs`.

### Completion Notes List

- All 11 tasks completed
- 30 new files created, 3 files modified
- BusinessRuleException now maps to 422 UNPROCESSABLE_ENTITY
- 3 command handlers: Create, Update, Delete with full business rule enforcement
- BusinessDayCalculatorService with 2026 Vietnamese holidays
- WorkLogReadDao with project/user JOINs for display names (projectName, employeeName)
- WorkLogRepository with optimistic concurrency via version field
- WorkLogController: POST /work-logs, PUT /work-logs/:id, DELETE /work-logs/:id
- WorkLogModule registered in AppModule
- C-7 enforcement: handlers return 404 (not 403) for wrong-employee access
- DomainException → BusinessRuleException mapping for locked/future/lookback errors
- 4 new test suites (29 tests), tsc --noEmit clean, 40 total suites / 298 total tests pass

### File List

**New files:**
- src/modules/work-log/application/dtos/work-log.dto.ts
- src/modules/work-log/application/dtos/create-work-log.dto.ts
- src/modules/work-log/application/dtos/update-work-log.dto.ts
- src/modules/work-log/application/dtos/index.ts
- src/modules/work-log/application/commands/create-work-log.command.ts
- src/modules/work-log/application/commands/update-work-log.command.ts
- src/modules/work-log/application/commands/delete-work-log.command.ts
- src/modules/work-log/application/commands/index.ts
- src/modules/work-log/application/commands/handlers/create-work-log.handler.ts
- src/modules/work-log/application/commands/handlers/update-work-log.handler.ts
- src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts
- src/modules/work-log/application/commands/handlers/index.ts
- src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts
- src/modules/work-log/application/queries/ports/index.ts
- src/modules/work-log/application/index.ts
- src/modules/work-log/infrastructure/services/business-day-calculator.service.ts
- src/modules/work-log/infrastructure/services/index.ts
- src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts
- src/modules/work-log/infrastructure/persistence/read/index.ts
- src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts
- src/modules/work-log/infrastructure/persistence/write/index.ts
- src/modules/work-log/infrastructure/persistence/index.ts
- src/modules/work-log/infrastructure/http/work-log.controller.ts
- src/modules/work-log/infrastructure/http/index.ts
- src/modules/work-log/infrastructure/projections/work-log-read-model.projection.ts
- src/modules/work-log/infrastructure/projections/index.ts
- src/modules/work-log/infrastructure/index.ts
- src/modules/work-log/work-log.module.ts
- src/modules/work-log/index.ts
- src/modules/work-log/infrastructure/services/business-day-calculator.service.spec.ts
- src/modules/work-log/application/commands/handlers/create-work-log.handler.spec.ts
- src/modules/work-log/application/commands/handlers/update-work-log.handler.spec.ts
- src/modules/work-log/application/commands/handlers/delete-work-log.handler.spec.ts

**Modified files:**
- src/libs/core/common/exceptions/business-rule.exception.ts — changed to extend BaseException (422 mapping)
- src/libs/shared/http/filters/global-exception.filter.ts — added BusinessRuleException → 422 mapping
- src/app.module.ts — added WorkLogModule import

### Senior Developer Review (AI)

**Review Date:** 2026-05-18 (Pass 1), 2026-05-18 (Pass 2)
**Review Outcome:** Changes Requested (2 patch items remaining)
**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### Action Items

- [x] [Review][Patch] ~~Duplicate check date comparison bug~~ — FIXED. `executionDate.setHours(0, 0, 0, 0)` added at create-work-log.handler.ts:60.
- [x] [Review][Patch] ~~`buildDto` parameter typed as `any`~~ — FIXED. Now typed as `WorkLog`. [update-work-log.handler.ts:71]
- [x] [Review][Patch] ~~Unused imports in controller~~ — FIXED. No `Get`, `IQueryBus`, or `QUERY_BUS_TOKEN` present. [work-log.controller.ts]
- [x] [Review][Patch] ~~Dead import `count` in read DAO~~ — FIXED. Only `eq, and, desc` imported. [work-log-read-dao.ts]
- [x] [Review][Patch] ~~Dead import `WorkLogId` in repository~~ — FIXED. Not imported. [work-log.repository.ts]
- [x] [Review][Patch] ~~Two separate import lines from same module~~ — FIXED. Imports are from different modules. [create-work-log.handler.ts]
- [x] [Review][Defer] Fragile DomainException message matching — handlers use `.toLowerCase().includes('locked')` / `.includes('future')` to catch and re-throw domain errors. If entity error messages change, these silently stop working. Consider error codes or custom exception subtypes. [create-work-log.handler.ts:94-108, update-work-log.handler.ts:56, delete-work-log.handler.ts:47] — deferred, functional but fragile

#### Review Pass 2 (2026-05-18)

- [x] [Review][Patch] ~~Controller `user?.id ?? 'unknown'` fallback~~ — FIXED. Removed fallback, now uses `user.id` directly. Auth guard guarantees user is set. [work-log.controller.ts:59,76,89]
- [x] [Review][Defer] Repository `delete()` method bypasses domain logic — standalone delete(id) does direct DB soft-delete without entity's delete(calculator, metadata). Bypasses 3-day lock check, WorkLogDeletedEvent publication, domain validation. Follows existing ProjectRepository pattern — pre-existing architectural issue. [work-log.repository.ts:84-87] — deferred, pre-existing pattern
- [x] [Review][Defer] Read DAO hardcodes `isEditable: true, editWindowClosesAt: ''` — mapToDto returns incorrect computed fields. Acceptable for this story (read DAO used for lookups only). Stories 3.4+ using read DAO for query responses must inject calculator and compute correctly. [work-log-read-dao.ts:119-120] — deferred, not in this story's scope
- [x] [Review][Defer] Holidays hardcoded to 2026 only — after Dec 31 2026 no Vietnamese holidays recognized. [business-day-calculator.service.ts:10-18] — deferred, needs annual update process or external data source
- [x] [Review][Defer] TOCTOU race in duplicate check — concurrent requests could pass app-level check before DB constraint catches it. DB 23505 catch provides safety net with slightly less detail in error response. [create-work-log.handler.ts:80-86,116-123] — deferred, DB constraint sufficient for current scale
- [x] [Review][Defer] Projection `processedEvents` Set grows indefinitely — memory leak. Set is unused for idempotency check. [work-log-read-model.projection.ts:31] — deferred, stub projection to be rewritten for stories 3.4+
