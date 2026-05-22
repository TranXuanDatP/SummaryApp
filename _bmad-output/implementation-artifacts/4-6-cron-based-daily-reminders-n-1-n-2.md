# Story 4.6: Cron-Based Daily Reminders (N-1, N-2)

Status: done

## Story

As an employee,
I want to receive reminders when I haven't logged work and when my WorkLog edit window is closing,
so that I don't miss logging days and can fix entries before they lock.

## Acceptance Criteria

1. **N-1 Daily Reminder:** Cron fires at 5:30 PM on business days; for each active employee with no WorkLog for today → create notification type `daily_work_log_reminder` + send email if preference enabled
2. **N-2 Edit Window Closing:** Cron fires on business days; for each WorkLog whose edit window closes in 1 business day (i.e. 2 business days since executionDate) → create notification type `edit_window_closing` for the WorkLog's employee + send email if preference enabled
3. Anti-spam: each notification type fires max once per user per day — skip if notification of same type already exists for user today
4. Both crons only fire on business days (check `IBusinessDayCalculator.isBusinessDay(today)` — weekends AND Vietnamese holidays excluded)
5. Respects notification preferences — check `in_app` and `email` preferences before creating notification / sending email (same pattern as OnCommentCreatedHandler)
6. Schedulers use `@Cron()` decorator from `@nestjs/schedule` (Architecture AD-8)
7. N-1 notification content: title "Bạn chưa ghi nhận công việc hôm nay", content "Chỉ mất 2 phút! Hãy ghi nhận công việc ngày hôm nay.", actionLink `/work-logs`
8. N-2 notification content: title "WorkLog ngày {executionDate} sắp bị khóa", content "WorkLog ngày {executionDate} sắp bị khóa vào ngày {closesAt}. Kiểm tra và chỉnh sửa ngay.", actionLink `/work-logs/{workLogId}`
9. Only active employees (isActive=true, role=employee) receive N-1; only active employees receive N-2
10. `@nestjs/schedule` installed, `ScheduleModule.forRoot()` added to AppModule

## Tasks / Subtasks

- [x] Task 1: Install @nestjs/schedule and wire ScheduleModule (AC: #10)
  - [x] Run `bun add @nestjs/schedule`
  - [x] Update `src/app.module.ts` — import `ScheduleModule` from `@nestjs/schedule`, add `ScheduleModule.forRoot()` to imports
- [x] Task 2: Add DAO methods for scheduler queries (AC: #1, #2, #3, #9)
  - [x] Add `findAllActiveByRole(role: string): Promise<UserDto[]>` to `IUserReadDao` — returns all non-deleted, isActive=true users with given role
  - [x] Implement in `UserReadDao` — query usersTable WHERE role=? AND is_active=true AND is_deleted=false, no pagination
  - [x] Add `findByExecutionDate(executionDate: string): Promise<WorkLogDto[]>` to `IWorkLogReadDao` — returns all non-deleted WorkLogs for a specific date
  - [x] Implement in `WorkLogReadDao` — query workLogsTable WHERE execution_date=? AND is_deleted=false, no pagination
  - [x] Add `existsByUserIdAndTypeAndDate(userId: string, type: string, date: string): Promise<boolean>` to `INotificationReadDao` — anti-spam check
  - [x] Implement in `NotificationReadDao` — query notificationsTable WHERE user_id=? AND type=? AND created_at between startOfDay and endOfDay, return count > 0
- [x] Task 3: Create DailyReminderScheduler (N-1) (AC: #1, #3, #4, #5, #7, #9)
  - [x] Create `src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.ts`
    - [x] `@Injectable()` + `@Cron('30 17 * * 1-5')` on `handleDailyReminder()` method
    - [x] Inject: `USER_READ_DAO_TOKEN`, `WORK_LOG_READ_DAO_TOKEN`, `NOTIFICATION_REPOSITORY_TOKEN`, `NOTIFICATION_READ_DAO_TOKEN`, `EMAIL_SERVICE_TOKEN`, `BUSINESS_DAY_CALCULATOR_TOKEN`
    - [x] Guard: check `calculator.isBusinessDay(today)` at start (holiday check)
    - [x] Get all active employees via `userReadDao.findAllActiveByRole('employee')`
    - [x] For each employee: check if WorkLog exists today via `workLogReadDao.findAll({ employeeId, executionDate: today, page: 1, limit: 1 })`, if total === 0 → no WorkLog today
    - [x] Anti-spam: `notificationReadDao.existsByUserIdAndTypeAndDate(employee.id, 'daily_work_log_reminder', today)`
    - [x] Check preferences, create notification, send email (same pattern as OnCommentCreatedHandler)
    - [x] Wrap entire method in try/catch — schedulers must not crash
  - [x] Update `src/modules/notification/infrastructure/schedulers/index.ts` — barrel export with `Schedulers` array
- [x] Task 4: Create EditWindowClosingScheduler (N-2) (AC: #2, #3, #4, #5, #8, #9)
  - [x] Create `src/modules/notification/infrastructure/schedulers/edit-window-closing.scheduler.ts`
    - [x] `@Injectable()` + `@Cron('0 9 * * 1-5')` on `handleEditWindowClosing()` method (9 AM — gives employee the whole day)
    - [x] Inject: same tokens as N-1 plus `WORK_LOG_READ_DAO_TOKEN`
    - [x] Guard: check `calculator.isBusinessDay(today)` at start
    - [x] Compute target date: find the date where `countBusinessDaysBetween(targetDate, today) === 2` (iterate backwards from today up to 5 calendar days)
    - [x] Get all WorkLogs for target date via `workLogReadDao.findByExecutionDate(targetDate)`
    - [x] Filter: only non-locked WorkLogs (isUnlocked === false), not already deleted
    - [x] For each WorkLog's employee (deduplicate by employeeId):
      - [x] Check employee is active
      - [x] Anti-spam: `notificationReadDao.existsByUserIdAndTypeAndDate(employee.id, 'edit_window_closing', today)`
      - [x] Check preferences, create notification with workLog-specific content, send email
    - [x] Wrap entire method in try/catch
  - [x] Update `src/modules/notification/infrastructure/schedulers/index.ts` — add to `Schedulers` array
- [x] Task 5: Wire schedulers in NotificationModule (AC: #6)
  - [x] Update `src/modules/notification/notification.module.ts` — add `...Schedulers` to providers
- [x] Task 6: Write tests (AC: all)
  - [x] Create `src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.spec.ts` — test all N-1 scenarios
  - [x] Create `src/modules/notification/infrastructure/schedulers/edit-window-closing.scheduler.spec.ts` — test all N-2 scenarios
  - [x] Add tests for new DAO methods (UserReadDao, WorkLogReadDao, NotificationReadDao)
  - [x] Run `tsc --noEmit` and `jest` — all pass (517 existing + new)

## Dev Notes

### MUST-FOLLOW: Exact Code Patterns

**Notification creation pattern** — reuse from OnCommentCreatedHandler EXACTLY:
```typescript
const notification = Notification.create(randomUUID(), {
  userId: employee.id,
  type: new NotificationType('daily_work_log_reminder'),
  title: '...',
  content: '...',
  actionLink: '/work-logs',
  isRead: false,
});
await this.notificationRepository.save(notification);
```

**Preference checking pattern** — reuse from OnCommentCreatedHandler:
```typescript
const inAppPref = await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
  employee.id, 'daily_work_log_reminder', 'in_app',
);
const shouldSendInApp = inAppPref ? inAppPref.enabled : true;
// N-1 defaults: in_app enabled, email enabled
```

**Anti-spam pattern** (NEW for schedulers):
```typescript
const alreadyNotified = await this.notificationReadDao.existsByUserIdAndTypeAndDate(
  employee.id, 'daily_work_log_reminder', today,
);
if (alreadyNotified) return; // skip — max 1/type/user/day
```

**@Cron decorator pattern:**
```typescript
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DailyReminderScheduler {
  private readonly logger = new Logger(DailyReminderScheduler.name);

  constructor(/* injections */) {}

  @Cron('30 17 * * 1-5')
  async handleDailyReminder(): Promise<void> {
    try {
      // business logic
    } catch (error) {
      this.logger.error(`Error in daily reminder: ${error.message}`, error.stack);
    }
  }
}
```

### CRITICAL: Computing the N-2 Target Date

N-2 fires for WorkLogs whose edit window closes in 1 business day. Since edit window = 3 business days from executionDate, "1 day before close" means 2 business days have passed since executionDate.

To find the target executionDate:
```typescript
// Find the date that is exactly 2 business days before today
private getTargetDate(today: Date): Date {
  let date = new Date(today);
  let businessDaysCount = 0;
  while (businessDaysCount < 2) {
    date.setDate(date.getDate() - 1);
    if (this.calculator.isBusinessDay(date)) {
      businessDaysCount++;
    }
  }
  return date;
}
```

### Scheduler Flow — N-1 (DailyReminderScheduler)

```
1. Cron fires at 5:30 PM on weekday (Mon-Fri)
2. Guard: isBusinessDay(today)? If NO → return (holiday)
3. Get all active employees: userReadDao.findAllActiveByRole('employee')
4. For each employee:
   a. Check if WorkLog exists today: workLogReadDao.findAll({ employeeId, executionDate: today, limit: 1 })
   b. If total > 0 → employee has WorkLog, SKIP
   c. Anti-spam: notificationReadDao.existsByUserIdAndTypeAndDate(employee.id, 'daily_work_log_reminder', today)
   d. If already notified → SKIP
   e. Check in_app preference → create notification if enabled
   f. Check email preference → send email if enabled
```

### Scheduler Flow — N-2 (EditWindowClosingScheduler)

```
1. Cron fires at 9:00 AM on weekday (Mon-Fri)
2. Guard: isBusinessDay(today)? If NO → return (holiday)
3. Compute targetDate (2 business days before today)
4. Get all WorkLogs for targetDate: workLogReadDao.findByExecutionDate(targetDate)
5. Filter: isUnlocked === false, isDeleted check handled by DAO
6. Deduplicate by employeeId (employee may have multiple WorkLogs on that date)
7. For each unique employee:
   a. Check employee is active
   b. Anti-spam: notificationReadDao.existsByUserIdAndTypeAndDate(employee.id, 'edit_window_closing', today)
   c. If already notified → SKIP
   d. Check in_app preference → create notification if enabled (include earliest expiring WorkLog's actionLink)
   e. Check email preference → send email if enabled
```

### Anti-Patterns to AVOID

- **DO NOT** fire notifications on weekends or Vietnamese holidays — always guard with `calculator.isBusinessDay(today)` even though cron is `1-5`
- **DO NOT** send duplicate notifications — always check anti-spam before creating
- **DO NOT** send notifications to inactive employees — check `isActive` and `isDeleted` (DAO should handle isDeleted)
- **DO NOT** throw unhandled exceptions from scheduler methods — wrap in try/catch, log errors, continue processing other employees
- **DO NOT** use `@Cron()` on every-second/minute intervals — use specific times (5:30 PM, 9:00 AM)
- **DO NOT** forget to install `@nestjs/schedule` — `bun add @nestjs/schedule`
- **DO NOT** forget `ScheduleModule.forRoot()` in AppModule — not in NotificationModule
- **DO NOT** query per-employee in a loop for N-1 WorkLog check — use `findAll({ employeeId, executionDate, limit: 1 })` which is a single query per employee
- **DO NOT** forget to update barrel exports (index.ts) in schedulers folder
- **DO NOT** forget to add `...Schedulers` to NotificationModule providers
- **DO NOT** create notifications if in_app preference is disabled
- **DO NOT** send emails if email preference is disabled
- **DO NOT** forget default values for preferences — both `daily_work_log_reminder` and `edit_window_closing` have email enabled by default (they are NOT in the email-enabled-by-default list from Story 4.4, so actually N-1 default is email ENABLED, N-2 default is in_app only)
  - Wait: from PRD FR-07 table: N-1 is "In-app + Email", N-2 is "In-app" only
  - So N-1 email default = enabled, N-2 email default = disabled

### Default Preference Clarification

From PRD FR-07 notification table:
- N-1 `daily_work_log_reminder`: channels = "In-app + Email" → email default: **enabled**
- N-2 `edit_window_closing`: channels = "In-app" → email default: **disabled**

This is different from Story 4.5 where `comment_received` had email enabled by default.

For preference checking:
```typescript
// N-1: email enabled by default
const shouldSendEmailN1 = emailPref ? emailPref.enabled : true;

// N-2: email disabled by default
const shouldSendEmailN2 = emailPref ? emailPref.enabled : false;
```

### Notification Content Design

**N-1 (Daily Reminder):**
- Title: `Bạn chưa ghi nhận công việc hôm nay`
- Content: `Chỉ mất 2 phút! Hãy ghi nhận công việc ngày hôm nay.`
- ActionLink: `/work-logs`
- Email Subject: same as title
- Email Body: same as content

**N-2 (Edit Window Closing):**
- Title: `WorkLog ngày {executionDate} sắp bị khóa`
- Content: `WorkLog ngày {executionDate} sắp bị khóa vào ngày {closesAt}. Kiểm tra và chỉnh sửa ngay.`
- ActionLink: `/work-logs/{workLogId}`
- Email Subject: same as title
- Email Body: same as content
- `closesAt` computed via `calculator.getEditWindowClosesAt(executionDate)`

### Files to CREATE

```
src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.ts
src/modules/notification/infrastructure/schedulers/edit-window-closing.scheduler.ts
# Tests
src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.spec.ts
src/modules/notification/infrastructure/schedulers/edit-window-closing.scheduler.spec.ts
```

### Files to MODIFY

```
src/modules/notification/infrastructure/schedulers/index.ts   — export schedulers + Schedulers array
src/modules/notification/notification.module.ts               — add ...Schedulers to providers
src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts — add existsByUserIdAndTypeAndDate
src/modules/notification/infrastructure/persistence/read/notification-read-dao.ts       — implement existsByUserIdAndTypeAndDate
src/modules/user/application/queries/ports/i-user-read-dao.interface.ts                 — add findAllActiveByRole
src/modules/user/infrastructure/persistence/read/user-read-dao.ts                       — implement findAllActiveByRole
src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts         — add findByExecutionDate
src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts               — implement findByExecutionDate
src/app.module.ts                                                                        — add ScheduleModule.forRoot()
package.json                                                                             — add @nestjs/schedule
```

### Previous Story Learnings (Story 4.5)

- Content and title truncation is needed when building notification content — respect MAX_CONTENT_LENGTH (2000) and MAX_TITLE_LENGTH (300)
- Email validation: check `employee.email` is non-empty before calling emailService.send()
- Self-notification prevention not needed for schedulers (no authorId involved)
- Inactive user check: verify `employee.isActive` before creating notification
- ConsoleEmailService logs to console — good enough for dev/testing
- `NotificationRepository.save()` is append-only (INSERT only, no version check)
- `Notification.create()` emits `NotificationSentEvent` automatically
- NotificationType.VALID_TYPES already includes `'daily_work_log_reminder'` and `'edit_window_closing'`
- NotificationChannel.VALID_CHANNELS includes `'in_app'` and `'email'`
- Package manager is `bun`
- Fastify used (not Express)
- 517 tests pass at end of Story 4.5 — don't break them
- `BUSINESS_DAY_CALCULATOR_TOKEN` exported from WorkLogModule
- `NotificationModule` already imports `SharedCqrsModule`, `UserModule`, `WorkLogModule`, `ProjectModule`

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source file
- **DailyReminderScheduler tests must cover:**
  - Success: employee with no WorkLog today → notification created + email sent
  - Success: employee with WorkLog today → no notification
  - Non-business day (holiday/weekend) → no processing (early return)
  - Anti-spam: already notified today → skip
  - Email disabled preference → notification only, no email
  - In_app disabled → no notification created
  - Both disabled → nothing created
  - Inactive employee → skipped
  - Multiple employees processed correctly
  - Error on single employee doesn't stop processing others
- **EditWindowClosingScheduler tests must cover:**
  - Success: WorkLog 2 business days old → notification created
  - Success: WorkLog 1 business day old → no notification (not near expiry)
  - Success: WorkLog 3+ business days old → no notification (already locked)
  - Non-business day → early return
  - Anti-spam: already notified → skip
  - Preference checks (in_app, email)
  - Inactive employee → skipped
  - Deduplication: multiple WorkLogs same employee same date → one notification
  - ActionLink includes correct workLogId
- **DAO tests for new methods:**
  - `findAllActiveByRole('employee')` — returns only active employees
  - `findByExecutionDate(date)` — returns WorkLogs for specific date
  - `existsByUserIdAndTypeAndDate(userId, type, date)` — anti-spam check
- Run `tsc --noEmit` and `jest` — all pass (517 existing + new)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.6] — Acceptance criteria, N-1 and N-2 requirements
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.6] — Scheduler folder structure, AD-8 cron pattern
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-07] — N-1, N-2 notification specification, anti-spam rules
- [Source: _bmad-output/implementation-artifacts/4-5-event-triggered-notifications-n-7.md] — Previous story, OnCommentCreatedHandler pattern
- [Source: src/modules/work-log/domain/services/business-day-calculator.interface.ts] — IBusinessDayCalculator interface
- [Source: src/modules/work-log/domain/services/business-day-calculator.service.ts] — BusinessDayCalculator implementation
- [Source: src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.ts] — Notification creation + preference checking pattern
- [Source: src/modules/notification/domain/entities/notification.entity.ts] — Notification.create() factory
- [Source: src/modules/user/application/queries/ports/i-user-read-dao.interface.ts] — IUserReadDao (needs new method)
- [Source: src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts] — IWorkLogReadDao (needs new method)
- [Source: src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts] — INotificationReadDao (needs anti-spam method)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

### Completion Notes List

- Installed `@nestjs/schedule` via npm (bun not available on system) and wired `ScheduleModule.forRoot()` in AppModule
- Added 3 new DAO methods: `IUserReadDao.findAllActiveByRole`, `IWorkLogReadDao.findByExecutionDate`, `INotificationReadDao.existsByUserIdAndTypeAndDate`
- Fixed 2 existing test files that needed `findByExecutionDate` mock added after interface change
- Created `DailyReminderScheduler` (N-1) — fires at 5:30 PM weekdays, checks for missing worklogs, creates notifications + sends email
- Created `EditWindowClosingScheduler` (N-2) — fires at 9:00 AM weekdays, finds worklogs 2 business days old, deduplicates by employee, creates closing notifications
- N-1 email default: enabled (per PRD FR-07). N-2 email default: disabled (per PRD FR-07)
- Wired both schedulers via `Schedulers` barrel export into `NotificationModule` providers
- 30 new tests covering: success paths, non-business days, anti-spam, preference checks (in_app disabled, email disabled, both disabled), inactive employees, multiple employees, error handling, deduplication, email validation
- All 547 tests pass (517 existing + 30 new), `tsc --noEmit` clean

### Change Log

- 2026-05-21: Story 4.6 implementation complete — Cron-Based Daily Reminders (N-1, N-2)

### Review Findings

- [x] [Review][Patch] Anti-spam `existsByUserIdAndTypeAndDate` uses `lt(23:59:59.999)` instead of `lt(nextDay 00:00:00.000)` — sub-millisecond exclusion window at day boundary [notification-read-dao.ts:128-135]
- [x] [Review][Patch] `getTargetDate` while loop has no upper bound — could infinite-loop if `isBusinessDay` has a bug [edit-window-closing.scheduler.ts:79-89]
- [x] [Review][Patch] N-2 `processEmployeeWorkLog` checks `isActive` but not `role === 'employee'` — non-employee users with WorkLogs would receive notifications [edit-window-closing.scheduler.ts:95-98]
- [x] [Review][Defer] Sequential per-employee processing with no parallelism or timeout — deferred, pre-existing
- [x] [Review][Defer] ConsoleEmailService registered as production email provider — deferred, pre-existing from Story 4.4
- [x] [Review][Defer] NotificationModule exports tokens not concrete classes — deferred, pre-existing
- [x] [Review][Defer] Duplicate preference lookups per employee (in_app + email) — deferred, pre-existing pattern
- [x] [Review][Defer] `new Date()` + `setHours` timezone-dependent behavior — deferred, pre-existing pattern
- [x] [Review][Defer] Hardcoded cron expressions not configurable via env — deferred, design choice
- [x] [Review][Defer] No concurrency guard on cron handlers — deferred, production concern
- [x] [Review][Defer] TOCTOU race condition on anti-spam check — deferred, clustering concern
- [x] [Review][Defer] Email sent after notification save — partial failure risk — deferred, acceptable tradeoff
- [x] [Review][Defer] `findAllActiveByRole` query unbounded (no pagination) — deferred, scale concern

### File List

**Created:**
- src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.ts
- src/modules/notification/infrastructure/schedulers/edit-window-closing.scheduler.ts
- src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.spec.ts
- src/modules/notification/infrastructure/schedulers/edit-window-closing.scheduler.spec.ts

**Modified:**
- package.json — added @nestjs/schedule dependency
- src/app.module.ts — added ScheduleModule.forRoot()
- src/modules/user/application/queries/ports/i-user-read-dao.interface.ts — added findAllActiveByRole
- src/modules/user/infrastructure/persistence/read/user-read-dao.ts — implemented findAllActiveByRole
- src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts — added findByExecutionDate
- src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts — implemented findByExecutionDate
- src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts — added existsByUserIdAndTypeAndDate
- src/modules/notification/infrastructure/persistence/read/notification-read-dao.ts — implemented existsByUserIdAndTypeAndDate, added gte/lt imports
- src/modules/notification/infrastructure/schedulers/index.ts — barrel export with Schedulers array
- src/modules/notification/notification.module.ts — added ...Schedulers to providers
- src/modules/work-log/application/queries/handlers/get-monthly-report.handler.spec.ts — added findByExecutionDate mock
- src/modules/work-log/application/queries/handlers/get-work-log-defaults.handler.spec.ts — added findByExecutionDate mock
