# Story 3.3: Manager Unlock Override — Mở khóa WorkLog đã Hết hạn

Status: done

## Story

As a manager,
I want to unlock a locked WorkLog with a mandatory reason,
so that employees can fix entries missed due to illness or emergencies.

## Acceptance Criteria

1. **Given** a WorkLog is locked (past 3-day window), **When** I send `POST /work-logs/:id/unlock` with `{ reason: "Nhân viên ốm 2 ngày" }`, **Then** `isUnlocked` = true, `unlockedBy` = my manager ID, `unlockedAt` = now, `unlockReason` = provided reason, response includes full WorkLog DTO with `isEditable: true`
2. `reason` is mandatory — missing/empty returns `400 VALIDATION_ERROR` with details `{ field: "reason", message: "reason must not be empty" }`
3. Endpoint protected by `@Roles('manager')` — employee returns `403 AUTH_FORBIDDEN_ROLE`
4. WorkLog must exist — `404 WORKLOG_NOT_FOUND` with suggestion if not found
5. Already-deleted WorkLog → `422 WORKLOG_LOCKED` (entity throws DomainException "Cannot modify deleted WorkLog")
6. WorkLogUnlockedEvent emitted with full audit data (`unlockedBy`, `unlockedAt`, `unlockReason`)
7. **After employee saves update on unlocked WorkLog**, WorkLog auto-locks — `isUnlocked: false`, `unlockedBy: null`, `unlockedAt: null`, `unlockReason: null`
8. **After employee deletes unlocked WorkLog**, same auto-lock before soft-delete (entity handles via `ensureNotDeleted`)

## Tasks / Subtasks

- [x] Task 1: Create UnlockWorkLogDto (AC: #2)
  - [x] Create `src/modules/work-log/application/dtos/unlock-work-log.dto.ts` — class-validator DTO with `reason` field (`@IsString`, `@MinLength(1)`, `@MaxLength(1000)`)
  - [x] Update `src/modules/work-log/application/dtos/index.ts` — add export
- [x] Task 2: Create UnlockWorkLogCommand (AC: #1, #3)
  - [x] Create `src/modules/work-log/application/commands/unlock-work-log.command.ts` — carries `id` (WorkLog ID) and `managerId`
  - [x] Update `src/modules/work-log/application/commands/index.ts` — add export
- [x] Task 3: Create UnlockWorkLogHandler (AC: #1, #4, #5, #6)
  - [x] Create `src/modules/work-log/application/commands/handlers/unlock-work-log.handler.ts` — loads WorkLog, calls `workLog.unlock(managerId, reason, metadata)`, saves, returns full DTO with `isEditable: true`
  - [x] Update `src/modules/work-log/application/commands/handlers/index.ts` — add `UnlockWorkLogHandler` to `CommandHandlers` array
- [x] Task 4: Add unlock endpoint to controller (AC: #2, #3)
  - [x] Update `src/modules/work-log/infrastructure/http/work-log.controller.ts` — add `POST /work-logs/:id/unlock` with `@Roles('manager')`, `@Body() dto: UnlockWorkLogDto`, dispatches `UnlockWorkLogCommand`
- [x] Task 5: Implement auto-lock after employee edit (AC: #7)
  - [x] Update `src/modules/work-log/application/commands/handlers/update-work-log.handler.ts` — after `workLog.updateContent()`, call `workLog.lock()` if `workLog.isUnlocked` was true before update
- [x] Task 6: Implement auto-lock after employee delete (AC: #8)
  - [x] Update `src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts` — after `workLog.delete()`, call `workLog.lock()` if `workLog.isUnlocked` was true before delete
- [x] Task 7: Fix outstanding review issue from Story 3.2
  - [x] Update `src/modules/work-log/infrastructure/http/work-log.controller.ts` — remove `user?.id ?? 'unknown'` fallback on all methods; replace with `user.id` (auth guard guarantees user object)
- [x] Task 8: Write tests (AC: all)
  - [x] `unlock-work-log.handler.spec.ts` — success unlock, already unlocked (idempotent), not found, deleted WorkLog, reason validation
  - [x] Update `update-work-log.handler.spec.ts` — add test for auto-lock after update on unlocked WorkLog
  - [x] Update `delete-work-log.handler.spec.ts` — add test for auto-lock after delete on unlocked WorkLog
  - [x] Run `tsc --noEmit` and `jest` — all pass

## Dev Notes

### MUST-FOLLOW: Existing Codebase Patterns

**The domain layer is COMPLETE.** Entity `unlock()`, `lock()`, and `WorkLogUnlockedEvent` were built in Story 3.1. Do NOT modify domain layer files. This story only adds application + infrastructure layers.

**Handler pattern** (follow `update-work-log.handler.ts` exactly):
```typescript
@CommandHandler(UnlockWorkLogCommand)
export class UnlockWorkLogHandler implements ICommandHandler<UnlockWorkLogCommand, WorkLogDto> {
  constructor(
    @Inject(WORK_LOG_REPOSITORY_TOKEN) private readonly repository: IWorkLogRepository,
    @Inject(BUSINESS_DAY_CALCULATOR_TOKEN) private readonly calculator: IBusinessDayCalculator,
    @Inject(PROJECT_READ_DAO_TOKEN) private readonly projectReadDao: IProjectReadDao,
    @Inject(USER_READ_DAO_TOKEN) private readonly userReadDao: IUserReadDao,
    @Optional() @Inject(REQUEST_CONTEXT_TOKEN) private readonly requestContext?: IRequestContextProvider,
  ) {}
  async execute(command: UnlockWorkLogCommand): Promise<WorkLogDto> { ... }
}
```

**Controller pattern** (follow existing endpoints + add `@Roles`):
```typescript
@Post(':id/unlock')
@HttpCode(HttpStatus.OK)
@Roles('manager')
@ApiOperation({ summary: 'Unlock a locked work log (manager only)' })
@ApiParam({ name: 'id', description: 'WorkLog ID' })
async unlock(
  @Param('id') id: string,
  @Body() dto: UnlockWorkLogDto,
  @CurrentUser() user: any,
): Promise<WorkLogDto> {
  const command = new UnlockWorkLogCommand(id, dto.reason, user.id);
  return this.commandBus.execute<UnlockWorkLogCommand, WorkLogDto>(command);
}
```

**Import `@Roles` from:** `@modules/auth/infrastructure/http/decorators` (defined as `const Roles = (...roles: string[]) => SetMetadata('roles', roles)`).

**Import paths:**
- `@modules/project/constants/tokens` for `PROJECT_READ_DAO_TOKEN`
- `@modules/user/constants/tokens` for `USER_READ_DAO_TOKEN`
- `@modules/auth/infrastructure/http/decorators` for `Roles` and `CurrentUser`
- `src/libs/core/common` for `NotFoundException, BusinessRuleException, DomainException`
- `src/libs/shared/cqrs` for `CommandHandler`

### CRITICAL: Auto-Lock Behavior (AC #7, #8)

The entity's `lock()` method clears ALL unlock audit fields:
```typescript
lock(): void {
  if (!this._props.isUnlocked) return;  // idempotent
  this._props.isUnlocked = false;
  this._props.unlockedBy = null;
  this._props.unlockedAt = null;
  this._props.unlockReason = null;
  this.markAsModified();
}
```

**In UpdateWorkLogHandler**, add auto-lock AFTER successful `updateContent()`:
```typescript
// Before updateContent, capture unlock state
const wasUnlocked = workLog.isUnlocked;

workLog.updateContent(command.content, this.calculator, eventMetadata);

// Auto-lock after employee saves edit on unlocked WorkLog
if (wasUnlocked) {
  workLog.lock();
}
```

**In DeleteWorkLogHandler**, same pattern — capture `wasUnlocked` before `delete()`, call `lock()` after if needed. Note: since `delete()` sets `_deletedAt`, the `lock()` call will still work because it only checks `isUnlocked`, not `isDeleted`.

### UnlockWorkLogHandler Key Logic

```typescript
async execute(command: UnlockWorkLogCommand): Promise<WorkLogDto> {
  const context = this.requestContext?.current();
  const eventMetadata = context
    ? { correlationId: context.correlationId, causationId: context.causationId, userId: context.userId }
    : undefined;

  const workLog = await this.repository.getById(command.id);
  if (!workLog) {
    throw NotFoundException.entity('WorkLog', command.id, {
      code: 'WORKLOG_NOT_FOUND',
      suggestion: 'Kiểm tra lại ID WorkLog',
    });
  }

  try {
    workLog.unlock(command.managerId, command.reason, eventMetadata);
  } catch (error) {
    if (error instanceof DomainException) {
      const msg = error.message.toLowerCase();
      if (msg.includes('deleted')) {
        throw new BusinessRuleException(
          'Cannot unlock a deleted WorkLog',
          'WORKLOG_LOCKED',
          { suggestion: 'WorkLog đã bị xóa, không thể mở khóa' },
        );
      }
    }
    throw error;
  }

  await this.repository.save(workLog);

  // Build DTO — same pattern as UpdateWorkLogHandler.buildDto()
  const [project, employee] = await Promise.all([
    this.projectReadDao.findById(workLog.projectId),
    this.userReadDao.findById(workLog.employeeId),
  ]);

  return new WorkLogDto({
    id: workLog.id,
    projectId: workLog.projectId,
    employeeId: workLog.employeeId,
    executionDate: workLog.executionDate.toISOString(),
    content: workLog.content,
    isUnlocked: workLog.isUnlocked,            // true after unlock
    unlockedBy: workLog.unlockedBy,             // manager ID
    unlockedAt: workLog.unlockedAt?.toISOString() ?? null,
    unlockReason: workLog.unlockReason,
    version: workLog.version,
    isEditable: workLog.isWithinEditWindow(this.calculator),  // true because isUnlocked
    editWindowClosesAt: this.calculator.getEditWindowClosesAt(workLog.executionDate).toISOString(),
    projectName: project?.name ?? '',
    employeeName: employee?.fullName ?? '',
    createdAt: workLog.createdAt,
    updatedAt: workLog.updatedAt,
  });
}
```

**IMPORTANT:** `workLog.unlock()` is idempotent — early return if already unlocked. No error thrown. The handler should just proceed normally.

### Controller Fix: Remove `user?.id ?? 'unknown'` Fallback

Story 3.2 review identified silent data corruption risk: if `@CurrentUser()` returns null/undefined, `employeeId` becomes literal `'unknown'`, causing WorkLog permanently stored with `employeeId='unknown'`.

**Fix in ALL controller methods:**
```typescript
// BEFORE (Story 3.2 — has bug):
user?.id ?? 'unknown'

// AFTER (this story — fix):
user.id
```

The global `JwtAuthGuard` guarantees `user` is populated. If auth is misconfigured, the guard itself should throw, not the handler. Apply this fix to `create()`, `update()`, `delete()`, and the new `unlock()` method.

### Files to CREATE

```
src/modules/work-log/application/dtos/unlock-work-log.dto.ts
src/modules/work-log/application/commands/unlock-work-log.command.ts
src/modules/work-log/application/commands/handlers/unlock-work-log.handler.ts
src/modules/work-log/application/commands/handlers/unlock-work-log.handler.spec.ts
```

### Files to MODIFY

```
src/modules/work-log/application/dtos/index.ts                            — add UnlockWorkLogDto export
src/modules/work-log/application/commands/index.ts                        — add UnlockWorkLogCommand export
src/modules/work-log/application/commands/handlers/index.ts               — add UnlockWorkLogHandler to array
src/modules/work-log/infrastructure/http/work-log.controller.ts           — add unlock endpoint + fix user.id fallback
src/modules/work-log/application/commands/handlers/update-work-log.handler.ts — add auto-lock after update
src/modules/work-log/application/commands/handlers/update-work-log.handler.spec.ts — add auto-lock test
src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts — add auto-lock after delete
src/modules/work-log/application/commands/handlers/delete-work-log.handler.spec.ts — add auto-lock test
```

### Anti-Patterns to AVOID

- **DO NOT** modify any domain layer files — `unlock()`, `lock()`, `WorkLogUnlockedEvent` all exist from Story 3.1
- **DO NOT** check the edit window in the unlock handler — managers can unlock ANY locked WorkLog, regardless of how long ago it was locked
- **DO NOT** skip the auto-lock in UpdateWorkLogHandler — this is critical for AC #7
- **DO NOT** forget `@Roles('manager')` on the unlock endpoint — this is the ONLY endpoint restricted to managers in WorkLog module
- **DO NOT** forget the `reason` validation in DTO — `@IsString`, `@MinLength(1)`, `@MaxLength(1000)`
- **DO NOT** forget to import `Roles` from `@modules/auth/infrastructure/http/decorators`
- **DO NOT** return 404 for wrong-role access — `@Roles('manager')` returns `403 AUTH_FORBIDDEN_ROLE` automatically via `RolesGuard`
- **DO NOT** forget the `WorkLogDto` import in the controller — already imported from `../../application/dtos`
- **DO NOT** forget to add `UnlockWorkLogCommand` import in the controller

### Previous Story Learnings (Story 3.2)

- 30 new files created, 3 files modified — module is fully operational
- `BusinessRuleException` maps to 422 UNPROCESSABLE_ENTITY in `GlobalExceptionFilter`
- Handler pattern: inject tokens, use `@Optional() @Inject(REQUEST_CONTEXT_TOKEN)` for event metadata
- `buildDto()` in handlers uses `Promise.all([projectReadDao.findById(), userReadDao.findById()])` for display names
- `DomainException` message matching is fragile (deferred from review) — use `.toLowerCase().includes('...')` consistently
- C-7 enforcement: handlers return 404 (not 403) for wrong-employee access
- 40 total suites / 298 total tests pass — don't break these
- WorkLogReadDao hardcodes `isEditable: true, editWindowClosesAt: ''` — handlers compute correctly via calculator
- Repository `delete()` method bypasses domain logic — dead code but don't call it

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source
- Handler tests: mock repository, calculator, and read DAOs
- Use `StubBusinessDayCalculator` from existing test files (or create inline stub)
- Mock `@Inject(REQUEST_CONTEXT_TOKEN)` as `undefined` in tests
- Run `tsc --noEmit` after all changes
- Run `jest` — all existing 298+ tests must still pass

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.4] — WorkLog module architecture, unlock endpoint
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.4] — `POST /work-logs/:id/unlock` endpoint spec
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-01] — WorkLog management, C-6 audit trail
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#UJ-08] — Manager unlock override user journey
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Error Code Table] — `WORKLOG_LOCKED` error code
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 4.5] — Business constraints C-6 (audit trail)
- [Source: src/modules/work-log/domain/entities/work-log.entity.ts] — `unlock()`, `lock()`, `isWithinEditWindow()` methods
- [Source: src/modules/work-log/domain/events/work-log-unlocked.event.ts] — Event structure
- [Source: src/modules/work-log/application/commands/handlers/update-work-log.handler.ts] — Handler pattern to follow
- [Source: src/modules/work-log/infrastructure/http/work-log.controller.ts] — Controller pattern to extend
- [Source: src/modules/auth/infrastructure/http/decorators/roles.decorator.ts] — `@Roles()` decorator
- [Source: _bmad-output/implementation-artifacts/3-2-worklog-crud-create-update-delete-voi-3-day-lock-rule.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

- NotFoundException.entity() does not accept `code` in details — only `suggestion`. Removed code field from unlock handler.

### Completion Notes List

- All 8 tasks completed
- 4 new files created, 7 files modified
- UnlockWorkLogHandler: loads WorkLog, calls unlock(managerId, reason), catches DomainException for deleted → WORKLOG_LOCKED, saves, returns full DTO
- Controller: POST /work-logs/:id/unlock with @Roles('manager'), UnlockWorkLogDto validation (reason required)
- Auto-lock implemented in UpdateWorkLogHandler and DeleteWorkLogHandler — captures wasUnlocked before mutation, calls lock() after
- Task 7 (user.id fallback) was already fixed during Story 3-2 code review
- 6 new tests: 4 unlock handler tests + 1 auto-lock update test + 1 auto-lock delete test
- tsc --noEmit clean, 41 total suites / 304 total tests pass

### File List

**New files:**
- src/modules/work-log/application/dtos/unlock-work-log.dto.ts
- src/modules/work-log/application/commands/unlock-work-log.command.ts
- src/modules/work-log/application/commands/handlers/unlock-work-log.handler.ts
- src/modules/work-log/application/commands/handlers/unlock-work-log.handler.spec.ts

**Modified files:**
- src/modules/work-log/application/dtos/index.ts — added UnlockWorkLogDto export
- src/modules/work-log/application/commands/index.ts — added UnlockWorkLogCommand export
- src/modules/work-log/application/commands/handlers/index.ts — added UnlockWorkLogHandler to CommandHandlers
- src/modules/work-log/infrastructure/http/work-log.controller.ts — added unlock endpoint with @Roles('manager'), imported Roles + UnlockWorkLogCommand + UnlockWorkLogDto
- src/modules/work-log/application/commands/handlers/update-work-log.handler.ts — added auto-lock after update
- src/modules/work-log/application/commands/handlers/update-work-log.handler.spec.ts — added auto-lock test
- src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts — added auto-lock after delete
- src/modules/work-log/application/commands/handlers/delete-work-log.handler.spec.ts — added auto-lock test

### Senior Developer Review (AI)

**Review Date:** 2026-05-18
**Review Outcome:** Approved (1 patch applied)
**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor

#### Action Items

- [x] [Review][Patch] ~~Auto-lock inside try block — lock() errors could be misattributed as "locked"~~ — FIXED. Moved `wasUnlocked` capture and `lock()` call outside the try/catch block in both update and delete handlers. [update-work-log.handler.ts:54-62, delete-work-log.handler.ts:44-52]
- [x] [Review][Defer] Fragile `msg.includes('deleted')` string matching in unlock handler — same deferred pattern from Story 3-2. [unlock-work-log.handler.ts:52] — deferred, consistent with existing codebase pattern
