# Story 4.5: Event-Triggered Notifications (N-7)

Status: done

## Story

As a manager,
I want employees to receive a notification immediately when I comment on their WorkLog,
so that feedback reaches them without delay.

## Acceptance Criteria

1. **Given** NotificationModule and CommentModule are active, **When** a manager creates a comment on a WorkLog (Story 4.2), **Then** `CommentCreatedEvent` handled by `OnCommentCreatedHandler` in NotificationModule
2. Notification created for the WorkLog's employee: type `comment_received`, title `"{managerName} đã nhận xét về công việc của bạn"`, content includes comment text, actionLink `/work-logs/{workLogId}`
3. Delivered via in-app (always) + email (if preference enabled for `comment_received` / `email`)
4. Email includes `managerName` and `workLogDate` — personal, not robotic
5. Handler uses `@EventsHandler` — decoupled from CommentModule (Architecture AD-7)
6. If WorkLog not found or employee not found, handler logs error and returns (no throw — event handlers must not crash)
7. If employee has `in_app` preference disabled for `comment_received`, skip in-app notification creation entirely
8. If employee has `email` preference enabled for `comment_received`, send email via `IEmailService`

## Tasks / Subtasks

- [x] Task 1: Create IEmailService interface (AC: #4, #8)
  - [x] Create `src/modules/notification/domain/services/i-email-service.interface.ts` — `send(to: string, subject: string, body: string): Promise<void>`
  - [x] Update `src/modules/notification/domain/services/index.ts` — barrel export
- [x] Task 2: Create ConsoleEmailService stub (AC: #8)
  - [x] Create `src/modules/notification/infrastructure/services/console-email.service.ts` — implements IEmailService, logs email to console via Logger (production-ready email is out of scope)
  - [x] Update `src/modules/notification/infrastructure/services/index.ts` — barrel export
- [x] Task 3: Create OnCommentCreatedHandler (AC: #1-#8)
  - [x] Create `src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.ts`
    - [x] `@Injectable()` + `@EventsHandler(CommentCreatedEvent)` + `implements IEventHandler<CommentCreatedEvent>`
    - [x] Inject: `NOTIFICATION_REPOSITORY_TOKEN`, `WORK_LOG_READ_DAO_TOKEN`, `USER_READ_DAO_TOKEN`, `NOTIFICATION_READ_DAO_TOKEN`, `EMAIL_SERVICE_TOKEN`
    - [x] `handle(event: CommentCreatedEvent)`: resolve WorkLog → get employeeId → get manager name → check preferences → create notification → send email if enabled
  - [x] Update `src/modules/notification/infrastructure/event-handlers/index.ts` — barrel export with `EventHandlers` array
- [x] Task 4: Wire handlers in NotificationModule (AC: #5)
  - [x] Update `src/modules/notification/notification.module.ts` — add `...EventHandlers` and `ConsoleEmailService` to providers, map `EMAIL_SERVICE_TOKEN`
- [x] Task 5: Write tests (AC: all)
  - [x] Create `src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.spec.ts` — test all scenarios
  - [x] Create `src/modules/notification/infrastructure/services/console-email.service.spec.ts` — test logging behavior
  - [x] Run `tsc --noEmit` and `jest` — all pass (499 existing + 14 new = 513)

## Dev Notes

### MUST-FOLLOW: Exact Code Patterns

**Event handler pattern:** Follow `CommentReadModelProjection` pattern EXACTLY:
```
src/modules/comment/infrastructure/projections/comment-read-model.projection.ts
```
- `@Injectable()` + `@EventsHandler(CommentCreatedEvent)`
- Implements `IEventHandler<CommentCreatedEvent>`
- Has `handle(event)` method
- Wraps everything in try/catch — event handlers must NEVER throw unhandled exceptions

**CRITICAL DIFFERENCE from projections:** This is NOT a projection (read-model sync). This is a **side-effect handler** — it creates new aggregates (Notifications) and sends emails. It must:
- Use `@Inject()` for dependencies (repository, read DAOs, email service)
- Generate UUID for new notification ID
- Directly call `INotificationRepository.save()` — NOT command bus

**Notification creation pattern:**
```typescript
import { Notification } from '../../domain/entities';
import { NotificationType } from '../../domain/value-objects';

const notification = Notification.create(
  generatedId,    // uuid
  {
    userId: employeeId,
    type: new NotificationType('comment_received'),
    title: `${managerName} đã nhận xét về công việc của bạn`,
    content: `${managerName} đã nhận xét về công việc ngày ${workLogDate}: "${commentContent}"`,
    actionLink: `/work-logs/${workLogId}`,
  },
);

await this.notificationRepository.save(notification);
```

**Preference check pattern:**
```typescript
const inAppPref = await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
  employeeId, 'comment_received', 'in_app',
);
const shouldSendInApp = inAppPref ? inAppPref.enabled : true; // default: enabled

const emailPref = await this.notificationReadDao.findPreferenceByUserAndTypeAndChannel(
  employeeId, 'comment_received', 'email',
);
const shouldSendEmail = emailPref ? emailPref.enabled : true; // N-7 email default: enabled
```

### Handler Flow (OnCommentCreatedHandler)

```
1. Receive CommentCreatedEvent { workLogId, authorId, content }
2. Lookup WorkLog by workLogId → get employeeId + executionDate
   - If not found → log.warn + return (no crash)
3. Lookup manager (author) by authorId → get fullName
   - If not found → log.warn + return (no crash)
4. Lookup employee by employeeId → get email (for email sending)
   - If not found → log.warn + return (no crash)
5. Check in_app preference for comment_received
   - If enabled (or default) → create Notification + save
   - If disabled → skip notification creation
6. Check email preference for comment_received
   - If enabled (or default) → send email via IEmailService
   - If disabled → skip email
```

### IEmailService Interface

```typescript
export interface IEmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}
```

### ConsoleEmailService

```typescript
@Injectable()
export class ConsoleEmailService implements IEmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[Email] To: ${to} | Subject: ${subject} | Body: ${body}`);
  }
}
```

### Anti-Patterns to AVOID

- **DO NOT** throw unhandled exceptions from the event handler — wrap entire handle() in try/catch, log errors, and return gracefully
- **DO NOT** use command bus to create notifications — directly use `INotificationRepository.save()` (no `SendNotificationCommand` exists or needed)
- **DO NOT** forget to check preferences BEFORE creating the notification — if `in_app` is disabled, don't create a Notification entity at all
- **DO NOT** forget to check preferences BEFORE sending email — if `email` is disabled, don't call IEmailService
- **DO NOT** forget default values for preferences — if no preference row exists in DB, `in_app` defaults to `enabled: true`, `email` defaults to `enabled: true` for `comment_received` (N-7 is in the email-enabled-by-default list)
- **DO NOT** create the notification entity if only email is enabled — the Notification entity IS the in-app notification. If only email is enabled, send email but don't create Notification
- **DO NOT** import CommentModule in NotificationModule — the handler imports `CommentCreatedEvent` class only (event class, not module). NotificationModule already imports `SharedCqrsModule` which provides the event bus
- **DO NOT** forget to generate a unique ID for the notification — use the project's ID generation pattern (check existing code for UUID generation)
- **DO NOT** use `@Cron()` or schedulers — those are Stories 4.6-4.7
- **DO NOT** implement real SMTP email sending — ConsoleEmailService (log-only) is sufficient for v1
- **DO NOT** forget to update barrel exports (index.ts) in every subfolder
- **DO NOT** forget to add EventHandlers array to NotificationModule providers

### ID Generation Pattern

Check the existing pattern in the project. Based on Story 4.4 learnings, IDs are generated using a helper. Look at how notification IDs are generated in existing tests or the notification repository test patterns.

### Files to CREATE

```
src/modules/notification/domain/services/i-email-service.interface.ts
src/modules/notification/infrastructure/services/console-email.service.ts
src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.ts
# Tests
src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.spec.ts
src/modules/notification/infrastructure/services/console-email.service.spec.ts
```

### Files to MODIFY

```
src/modules/notification/domain/services/index.ts         — export IEmailService
src/modules/notification/infrastructure/services/index.ts — export ConsoleEmailService
src/modules/notification/infrastructure/event-handlers/index.ts — export OnCommentCreatedHandler + EventHandlers array
src/modules/notification/notification.module.ts           — register EventHandlers + ConsoleEmailService + EMAIL_SERVICE_TOKEN mapping
```

### Previous Story Learnings (Stories 4.1-4.4)

- All string fields must be trimmed before validation and storage
- Package manager is `bun` — use `bun add` for dependencies (no new deps in this story — no nodemailer needed)
- Fastify is used (not Express) — `FastifyReply` for response manipulation
- `||` not `??` for string fallbacks where empty strings should be falsy
- 499 tests pass at end of Story 4.4 — don't break them
- Mock DAO/repository must include ALL methods in test setup
- `BaseAggregateRepository` constructor: `super(eventBus, outboxRepository, { useOutbox: false })`
  - NOTE: NotificationRepository does NOT extend BaseAggregateRepository — it's standalone with custom save()
- DomainErrorCode for notification already added in Story 4.3
- Drizzle schemas already registered in Story 4.3
- `@QueryHandler` and `@CommandHandler` decorators from `src/libs/shared/cqrs`
- `@EventsHandler` re-exported from `@nestjs/cqrs` via `src/libs/shared/cqrs`
- NotificationType.VALID_TYPES is public and includes `'comment_received'`
- NotificationChannel.VALID_CHANNELS is public and includes `'in_app'` and `'email'`
- `INotificationReadDao.findPreferenceByUserAndTypeAndChannel(userId, type, channel)` already exists and returns `NotificationPreferenceDto | null`
- `IWorkLogReadDao.findById(id)` returns `WorkLogDto | null` — `WorkLogDto` includes `employeeId`, `executionDate`
- `IUserReadDao.findById(id)` returns `UserDto | null` — `UserDto` includes `fullName`, `email`
- `EMAIL_SERVICE_TOKEN` already defined in `src/modules/notification/constants/tokens.ts`
- `NotificationModule` already imports `SharedCqrsModule`, `UserModule`, `WorkLogModule`, `ProjectModule`

### Testing Standards

- Test file naming: `*.spec.ts` colocated with source file
- **OnCommentCreatedHandler tests must cover:**
  - Success: comment created → notification created for employee + email sent
  - Success: comment created → notification created, email disabled → no email
  - Success: comment created → in_app disabled → no notification created
  - Success: both preferences disabled → no notification, no email
  - Error: WorkLog not found → logs warning, no notification
  - Error: User (manager) not found → logs warning, no notification
  - Error: User (employee) not found → logs warning, no notification
  - Notification title includes managerName in Vietnamese
  - Notification content includes workLogDate and comment content
  - Notification actionLink is `/work-logs/{workLogId}`
  - Email includes managerName and workLogDate (personal, not robotic)
  - Default preference behavior: enabled when no preference row exists
- **ConsoleEmailService tests:**
  - `send()` logs email to console without throwing
- Run `tsc --noEmit` and `jest` — all pass (499 existing + new)

### Notification Content Design

Based on PRD FR-07 N-7 and UX spec:
- **Title:** `{managerName} đã nhận xét về công việc của bạn`
- **Content:** `{managerName} đã nhận xét về công việc ngày {executionDate}: "{commentContent}"`
- **ActionLink:** `/work-logs/{workLogId}`
- **Email Subject:** `{managerName} đã nhận xét về công việc của bạn`
- **Email Body:** Must include `managerName` and `workLogDate` — personal, not robotic (UX spec)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.5] — Acceptance criteria, notification N-7 requirements
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.6] — Notification module folder structure, event-handlers, email service
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-7] — Notifications use domain events, @EventsHandler decoupled
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-07] — N-7 notification specification
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Notification content personal, not robotic
- [Source: _bmad-output/implementation-artifacts/4-4-notification-crud-preferences-api.md] — Previous story, repository, read DAO, preferences patterns
- [Source: src/modules/comment/infrastructure/projections/comment-read-model.projection.ts] — @EventsHandler pattern
- [Source: src/modules/comment/domain/events/comment-created.event.ts] — CommentCreatedEvent shape
- [Source: src/modules/notification/domain/entities/notification.entity.ts] — Notification.create() factory
- [Source: src/modules/notification/infrastructure/persistence/write/notification.repository.ts] — save() method
- [Source: src/modules/notification/constants/tokens.ts] — EMAIL_SERVICE_TOKEN already defined
- [Source: src/modules/notification/domain/value-objects/notification-type.value-object.ts] — 'comment_received' type
- [Source: src/modules/work-log/application/dtos/work-log.dto.ts] — WorkLogDto with employeeId
- [Source: src/modules/user/application/dtos/user.dto.ts] — UserDto with fullName, email

## Dev Agent Record

### Agent Model Used

GLM-5

### Debug Log References

### Completion Notes List

- All 5 tasks implemented: IEmailService interface, ConsoleEmailService stub, OnCommentCreatedHandler, NotificationModule wiring, tests
- OnCommentCreatedHandler uses `@EventsHandler(CommentCreatedEvent)` — fully decoupled from CommentModule, only imports event class
- Handler checks in_app and email preferences before creating notification/sending email; defaults to enabled for both
- Handler gracefully handles missing entities (WorkLog, manager, employee) with warn logs and early return — no unhandled exceptions
- ConsoleEmailService logs emails to console via NestJS Logger — production SMTP out of scope for v1
- 14 new tests: 11 handler tests (success, preferences, error handling) + 2 email service tests + 1 handler defined test
- 513 total tests pass, tsc --noEmit clean
- Code review: 6 patches applied (inactive user guard, self-notification prevention, content/title truncation, email validation, log level fix), 5 deferred, 5 dismissed
- 517 total tests pass after review patches (4 new tests for inactive users, self-notification, email validation)

### File List

**Created:**
- src/modules/notification/domain/services/i-email-service.interface.ts
- src/modules/notification/domain/services/index.ts
- src/modules/notification/infrastructure/services/console-email.service.ts
- src/modules/notification/infrastructure/services/console-email.service.spec.ts
- src/modules/notification/infrastructure/services/index.ts
- src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.ts
- src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.spec.ts
- src/modules/notification/infrastructure/event-handlers/index.ts

**Modified:**
- src/modules/notification/notification.module.ts — added EventHandlers, ConsoleEmailService, EMAIL_SERVICE_TOKEN provider

### Review Findings

- [x] [Review][Patch] Inactive users receive/trigger notifications — added `!manager.isActive` / `!employee.isActive` guards [on-comment-created.handler.ts:56,62]
- [x] [Review][Patch] Self-notification when authorId === employeeId — added guard: `if (employee.id === authorId) return` [on-comment-created.handler.ts:68]
- [x] [Review][Patch] Notification content can exceed 2000-char entity max — added truncation with `MAX_CONTENT_LENGTH` constant [on-comment-created.handler.ts:85-89]
- [x] [Review][Patch] Notification title can exceed 300-char entity max — added truncation with `MAX_TITLE_LENGTH` constant [on-comment-created.handler.ts:81-83]
- [x] [Review][Patch] No guard on employee.email before sending — added empty/null email check before calling emailService.send() [on-comment-created.handler.ts:108-110]
- [x] [Review][Patch] Log level warn vs error for missing entities (AC #6) — changed `this.logger.warn()` to `this.logger.error()` for missing entity cases [on-comment-created.handler.ts:48,57,63]
- [x] [Review][Defer] Silent error swallowing by design — try/catch is intentional per spec "event handlers must not crash"; retry/dead-letter queue is infrastructure concern [on-comment-created.handler.ts:117-122] — deferred, pre-existing pattern
- [x] [Review][Defer] Logging PII in ConsoleEmailService — dev stub logs email addresses and content; production SMTP out of scope for v1 [console-email.service.ts:10] — deferred, dev stub by design
- [x] [Review][Defer] Sequential awaits for independent lookups — manager + employee lookups could be parallelized; two preference DB queries could be one [on-comment-created.handler.ts:49-70] — deferred, performance optimization
- [x] [Review][Defer] No idempotency guard on notification creation — duplicate events could create duplicate notifications; event deduplication is infrastructure concern [on-comment-created.handler.ts] — deferred, pre-existing pattern
- [x] [Review][Defer] Inconsistent delivery on partial failure — email sent without in-app notification if DB save fails; would need outbox pattern [on-comment-created.handler.ts:99-115] — deferred, requires architectural change
