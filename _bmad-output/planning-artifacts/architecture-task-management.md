# Architecture Decision Document — Task Management

**Project:** nestjs-project-example
**Author:** Winston (Architect Agent)
**Date:** 2026-05-10
**Status:** Draft
**PRD Reference:** _bmad-output/planning-artifacts/prd-task-management.md
**Rules Reference:** docs/PROJECT_PATTERNS.md

---

## 1. Architectural Overview

### 1.1 Module Map

The Task Management feature introduces **5 new DDD modules** into the existing NestJS project. Each module follows the invariant structure defined in `docs/PROJECT_PATTERNS.md`.

```
src/modules/
├── product/              ← existing
├── order/                ← existing
├── auth/                 ← NEW: Authentication (JWT + bcrypt)
├── user/                 ← NEW: User aggregate (identity)
├── project/              ← NEW: Project aggregate
├── work-log/             ← NEW: WorkLog aggregate (core — Nhật ký hành động)
├── comment/              ← NEW: Comment entity (WorkLog context)
└── notification/         ← NEW: Notification system
```

### 1.2 Module Dependency Graph

```
AppModule (Global)
├── ConfigModule (global)
├── LoggingModule (Pino)
├── ContextModule (Correlation ID)
├── SharedCqrsModule (Command/Query/Event buses)
├── DrizzleDatabaseModule (PostgreSQL)
├── OutboxModule (Transactional Outbox)
├── HealthModule
├── ProductModule                  ← existing, standalone
├── OrderModule                    ← existing, imports ProductModule
├── AuthModule                     ← imports UserModule
├── UserModule                     ← standalone
├── ProjectModule                  ← standalone
├── WorkLogModule                  ← imports ProjectModule, UserModule, CommentModule
├── CommentModule                  ← imports WorkLogModule, UserModule
└── NotificationModule             ← imports UserModule, WorkLogModule, ProjectModule
```

### 1.3 Cross-Module Dependencies

| Module | Imports From | Reason |
|--------|-------------|--------|
| AuthModule | UserModule | Access `IUserRepository` for credential validation |
| WorkLogModule | ProjectModule, UserModule, CommentModule | Validate project exists; enforce employee ownership; comment belongs to work-log |
| CommentModule | WorkLogModule, UserModule | Validate work-log exists; identify manager author |
| NotificationModule | UserModule, WorkLogModule, ProjectModule | Resolve recipients; subscribe to domain events |

---

## 2. Domain Design

### 2.1 Aggregate Roots & Bounded Contexts

| Aggregate Root | Module | Consistency Boundary |
|---------------|--------|---------------------|
| `User` | user | User identity, role, active status |
| `Project` | project | Project lifecycle, status transitions |
| `WorkLog` | work-log | Work entry (nhật ký hành động), 3-day lock rule, execution date — directly linked to Project |
| `Comment` | comment | Manager feedback on a WorkLog |

### 2.2 Entity Relationships

```
User (1) ──< (M) WorkLog      (employee who logged)
User (1) ──< (M) Comment      (manager who commented)

Project (1) ──< (M) WorkLog
WorkLog (1) ──< (M) Comment
```

### 2.3 Value Objects

| Value Object | Module | Purpose |
|-------------|--------|---------|
| `UserId` | user | Typed identity for User aggregate |
| `UserEmail` | user | Email validation invariant |
| `UserRole` | user | Enum: `employee`, `manager` |
| `ProjectId` | project | Typed identity for Project aggregate |
| `ProjectStatus` | project | Enum: `active`, `completed`, `archived` |

| `WorkLogId` | work-log | Typed identity for WorkLog aggregate |
| `ExecutionDate` | work-log | Business-day-aware date with validation (no future, 3-day lookback) |
| `CommentId` | comment | Typed identity for Comment entity |

---

## 3. Module-by-Module Architecture

### 3.1 Auth Module — `src/modules/auth/`

**Responsibility:** JWT authentication, login, token refresh.

```
src/modules/auth/
├── application/
│   ├── commands/
│   │   ├── login.command.ts
│   │   ├── refresh-token.command.ts
│   │   └── handlers/
│   │       ├── login.handler.ts
│   │       └── refresh-token.handler.ts
│   ├── dtos/
│   │   ├── login-request.dto.ts
│   │   ├── login-response.dto.ts
│   │   ├── refresh-token-request.dto.ts
│   │   ├── refresh-token-response.dto.ts
│   │   └── index.ts
│   └── queries/
│       └── ports/
│           └── i-token-read-dao.interface.ts
├── constants/
│   └── tokens.ts
├── domain/
│   ├── value-objects/
│   │   ├── token-pair.value-object.ts
│   │   └── index.ts
│   └── services/
│       └── index.ts
├── infrastructure/
│   ├── http/
│   │   ├── auth.controller.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       └── refresh-token.schema.ts
│   │   ├── read/
│   │   │   └── token-read-dao.ts
│   │   └── write/
│   │       └── refresh-token.repository.ts
│   └── services/
│       ├── jwt-token.service.ts
│       ├── bcrypt-hash.service.ts
│       └── index.ts
└── auth.module.ts
```

**Key Design Decisions:**
- `AuthModule` imports `UserModule` to access `IUserRepository` for credential validation
- `JwtTokenService` is infrastructure — wraps `@nestjs/jwt`, NOT a domain service
- `BcryptHashService` is infrastructure — wraps `bcrypt` library
- Guards (`JwtAuthGuard`, `RolesGuard`) registered globally via `APP_GUARD` providers
- `@CurrentUser()` decorator extracts user from JWT payload
- `@Roles('employee' | 'manager')` decorator for role-based access

**tokens.ts:**
```typescript
export const AUTH_JWT_SERVICE_TOKEN = Symbol('IJwtTokenService');
export const AUTH_HASH_SERVICE_TOKEN = Symbol('IHashService');
export const AUTH_REFRESH_TOKEN_REPO_TOKEN = Symbol('IRefreshTokenRepository');
export const AUTH_TOKEN_READ_DAO_TOKEN = Symbol('ITokenReadDao');
```

---

### 3.2 User Module — `src/modules/user/`

**Responsibility:** User aggregate root (identity, role management).

```
src/modules/user/
├── application/
│   ├── commands/
│   │   ├── create-user.command.ts
│   │   ├── deactivate-user.command.ts
│   │   └── handlers/
│   │       ├── create-user.handler.ts
│   │       └── deactivate-user.handler.ts
│   ├── dtos/
│   │   ├── create-user.dto.ts
│   │   ├── user.dto.ts
│   │   └── index.ts
│   └── queries/
│       ├── get-user.query.ts
│       ├── get-user-list.query.ts
│       ├── handlers/
│       │   ├── get-user.handler.ts
│       │   └── get-user-list.handler.ts
│       └── ports/
│           └── i-user-read-dao.interface.ts
├── constants/
│   └── tokens.ts
├── domain/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── user-id.value-object.ts
│   │   ├── user-email.value-object.ts
│   │   ├── user-role.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── user-created.event.ts
│   │   ├── user-deactivated.event.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-user-repository.interface.ts
│   │   └── index.ts
│   └── services/
│       └── index.ts
├── infrastructure/
│   ├── http/
│   │   ├── user.controller.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       └── user.schema.ts
│   │   ├── read/
│   │   │   └── user-read-dao.ts
│   │   └── write/
│   │       └── user.repository.ts
│   └── projections/
│       └── user-read-model.projection.ts
└── user.module.ts
```

**User Entity Key Behaviors:**
```typescript
class User extends AggregateRoot implements ISoftDeletable {
  static create(id, props, metadata?): User        // factory — emits UserCreatedEvent
  static reconstitute(...): User                    // hydration — no events
  deactivate(metadata?): void                       // isActive = false
  reactivate(): void                                // isActive = true
  changeRole(newRole: UserRole): void               // role transition
}
```

**User Schema (Drizzle):**
```typescript
export const usersTable = pgTable('users', {
  id: varchar('id', { length: 50 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'employee' | 'manager'
  isActive: boolean('is_active').notNull().default(true),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**tokens.ts:**
```typescript
export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');
export const USER_READ_DAO_TOKEN = Symbol('IUserReadDao');
```

---

### 3.3 Project Module — `src/modules/project/`

**Responsibility:** Project aggregate (CRUD, status lifecycle).

```
src/modules/project/
├── application/
│   ├── commands/
│   │   ├── create-project.command.ts
│   │   ├── update-project.command.ts
│   │   ├── merge-projects.command.ts              # Manager merge duplicate projects
│   │   └── handlers/
│   │       ├── create-project.handler.ts
│   │       ├── update-project.handler.ts
│   │       └── merge-projects.handler.ts
│   ├── dtos/
│   │   ├── create-project.dto.ts
│   │   ├── update-project.dto.ts
│   │   ├── project.dto.ts
│   │   └── index.ts
│   └── queries/
│       ├── get-project.query.ts
│       ├── get-project-list.query.ts
│       ├── search-projects.query.ts            # C-5: fuzzy search
│       ├── handlers/
│       │   ├── get-project.handler.ts
│   │   │   └── get-project-list.handler.ts
│       └── ports/
│           └── i-project-read-dao.interface.ts
├── constants/
│   └── tokens.ts
├── domain/
│   ├── entities/
│   │   ├── project.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── project-id.value-object.ts
│   │   ├── project-status.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── project-created.event.ts
│   │   ├── project-updated.event.ts
│   │   ├── project-completed.event.ts
│   │   ├── project-archived.event.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-project-repository.interface.ts
│   │   └── index.ts
│   └── services/
│       └── index.ts
├── infrastructure/
│   ├── http/
│   │   ├── project.controller.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       └── project.schema.ts
│   │   ├── read/
│   │   │   └── project-read-dao.ts
│   │   └── write/
│   │       └── project.repository.ts
│   └── projections/
│       └── project-read-model.projection.ts
└── project.module.ts
```

**Project Entity Key Behaviors:**
```typescript
class Project extends AggregateRoot implements ISoftDeletable {
  static create(id, props, metadata?): Project
  static reconstitute(...): Project
  updateDetails(params: { name?, description? }, metadata?): void
  activate(): void          // status -> active
  complete(): void          // status -> completed
  archive(): void           // status -> archived
}
```

**Merge Projects (Manager action):**
```typescript
// In ProjectModule application layer:
class MergeProjectsCommand {
  sourceProjectIds: string[]  // projects to merge FROM
  targetProjectId: string     // project to merge INTO
  performedBy: string         // manager ID
}
// Handler: reassigns all WorkLog.projectId from sources to target, archives sources
// Emits: ProjectsMergedEvent
```

**Project Schema (Drizzle):**
```typescript
export const projectsTable = pgTable('projects', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**tokens.ts:**
```typescript
export const PROJECT_REPOSITORY_TOKEN = Symbol('IProjectRepository');
export const PROJECT_READ_DAO_TOKEN = Symbol('IProjectReadDao');
```

---

### 3.4 WorkLog Module — `src/modules/work-log/` (Core)

**Responsibility:** WorkLog aggregate (Nhật ký hành động) — the heart of the system. Directly linked to Project (no Task layer). 3-day lock rule, smart default project, calendar/summary views, Excel export matching real report format.

```
src/modules/work-log/
├── application/
│   ├── commands/
│   │   ├── create-work-log.command.ts
│   │   ├── update-work-log.command.ts
│   │   ├── delete-work-log.command.ts
│   │   ├── unlock-work-log.command.ts      # includes `reason` field (C-6)
│   │   └── handlers/
│   │       ├── create-work-log.handler.ts
│   │       ├── update-work-log.handler.ts
│   │       ├── delete-work-log.handler.ts
│   │       └── unlock-work-log.handler.ts
│   ├── dtos/
│   │   ├── create-work-log.dto.ts

│   │   ├── unlock-work-log.dto.ts         # includes `reason` field (C-6)
│   │   ├── work-log.dto.ts
│   │   ├── monthly-report.dto.ts
│   │   ├── calendar-view.dto.ts
│   │   ├── summary-view.dto.ts
│   │   └── index.ts
│   └── queries/
│       ├── get-work-logs.query.ts
│       ├── get-monthly-report.query.ts
│       ├── get-calendar-view.query.ts
│       ├── get-summary-view.query.ts
│       ├── handlers/
│       │   ├── get-work-logs.handler.ts
│   │   ├── get-monthly-report.handler.ts
│   │   ├── get-calendar-view.handler.ts
│   │   └── get-summary-view.handler.ts
│       └── ports/
│           └── i-work-log-read-dao.interface.ts
├── constants/
│   └── tokens.ts
├── domain/
│   ├── entities/
│   │   ├── work-log.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── work-log-id.value-object.ts
│   │   ├── execution-date.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── work-log-created.event.ts
│   │   ├── work-log-updated.event.ts
│   │   ├── work-log-deleted.event.ts
│   │   ├── work-log-unlocked.event.ts    # carries unlockedBy, unlockedAt, reason (C-6)
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-work-log-repository.interface.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── business-day-calculator.service.ts
│   │   ├── work-log-lock-policy.service.ts
│   │   └── index.ts
│   └── specifications/
│       ├── within-edit-window.specification.ts
│       └── index.ts
├── infrastructure/
│   ├── http/
│   │   ├── work-log.controller.ts
│   │   ├── report.controller.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       └── work-log.schema.ts
│   │   ├── read/
│   │   │   └── work-log-read-dao.ts
│   │   └── write/
│   │       └── work-log.repository.ts
│   ├── projections/
│   │   └── work-log-read-model.projection.ts
│   └── services/
│       └── excel-export.service.ts
└── work-log.module.ts
```

**WorkLog Entity Key Behaviors:**
```typescript
class WorkLog extends AggregateRoot implements ISoftDeletable {
  static create(id, props, metadata?): WorkLog
  static reconstitute(...): WorkLog

  // Only actualResult is editable, within 3-day window
  updateContent(newContent: string, businessDayCalculator: IBusinessDayCalculator, metadata?): void
  delete(businessDayCalculator: IBusinessDayCalculator, metadata?): void

  // Manager override
  unlock(unlockedBy: string, reason: string, metadata?): void   // C-6: mandatory audit trail
  lock(): void   // auto-lock after employee saves post-unlock

  // Query helpers
  isWithinEditWindow(businessDayCalculator: IBusinessDayCalculator): boolean
}
```

**ExecutionDate Value Object — the 3-day lock rule at domain level:**
```typescript
class ExecutionDate extends BaseValueObject<Date> {
  // Validates: no future dates, no more than 3 business days in the past
  constructor(value: Date, businessDayCalculator: IBusinessDayCalculator) {
    // validateNotFuture(value)
    // validateWithinLookback(value, 3, businessDayCalculator)
  }

  daysSinceExecution(businessDayCalculator: IBusinessDayCalculator): number
  isWithinEditWindow(businessDayCalculator: IBusinessDayCalculator): boolean
}
```

**Domain Services:**

| Service | Responsibility |
|---------|---------------|
| `BusinessDayCalculator` | Calculate business days between two dates, excluding weekends and holidays. Pure TS, no framework dependency. Holidays loaded from config or hard-coded Vietnamese holidays. |
| `WorkLogLockPolicy` | Encapsulate the 3-day lock rule logic. `isEditable(workLog, calculator): boolean` |

**Specification Pattern:**
```typescript
class WithinEditWindowSpecification {
  isSatisfiedBy(workLog: WorkLog, calculator: IBusinessDayCalculator): boolean
}
```

**WorkLog Schema (Drizzle):**
```typescript
export const workLogsTable = pgTable('work_logs', {
  id: varchar('id', { length: 50 }).primaryKey(),
  projectId: varchar('project_id', { length: 50 }).notNull(),
  employeeId: varchar('employee_id', { length: 50 }).notNull(),
  executionDate: timestamp('execution_date').notNull(),
  content: text('content').notNull(),
  isUnlocked: boolean('is_unlocked').notNull().default(false),
  unlockedBy: varchar('unlocked_by', { length: 50 }),          // C-6: ID of manager
  unlockedAt: timestamp('unlocked_at'),                         // C-6: timestamp of unlock
  unlockReason: text('unlock_reason'),                          // C-6: mandatory reason
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workLogsRelations = relations(workLogsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [workLogsTable.projectId],
    references: [projectsTable.id],
  }),
  employee: one(usersTable, {
    fields: [workLogsTable.employeeId],
    references: [usersTable.id],
  }),
}));
```

**Unique constraint (enforced at DB level):**
```sql
UNIQUE (project_id, employee_id, execution_date, is_deleted)
-- Or application-level check in handler with a dedicated query
```

**Excel Export Service (infrastructure):**
```typescript
// src/modules/work-log/infrastructure/services/excel-export.service.ts
// Uses 'exceljs' library for .xlsx generation
// NOT a domain service — it's infrastructure (file I/O)
// Format follows real company report template (Tool_Bao_Cao_IT/report_logic.py)
class ExcelExportService {
  async exportMonthlyReport(data: MonthlyReportDto, fileName: string): Promise<Buffer>
}
```

**Excel Format (8 columns — matching real report template):**
| Column | Header | Source |
|--------|--------|--------|
| A | STT | Row index + section markers (I, II) |
| B | TÊN SẢN PHẨM / DỰ ÁN | `project.name` |
| C | THỜI GIAN (TUẦN) | Calculated: Week N from executionDate |
| D | KẾ HOẠCH ĐẶT RA | Project-level field (optional) |
| E | THỰC HIỆN | `workLog.content` — aggregated per project+week |
| F | KẾT QUẢ: % | `progress` field (optional) |
| G | Ý KIẾN ĐỀ XUẤT | Manager comments aggregated |
| H | GHI CHÚ | `workLog.notes` (optional) |

**Styling:** Green header (#C6E0B4), section rows (#A9D08E), Times New Roman font, thin borders, wrap text. Grouped by section (I. Công việc chung, II. Hỗ trợ/Dự án) and month。

**tokens.ts:**
```typescript
export const WORK_LOG_REPOSITORY_TOKEN = Symbol('IWorkLogRepository');
export const WORK_LOG_READ_DAO_TOKEN = Symbol('IWorkLogReadDao');
export const BUSINESS_DAY_CALCULATOR_TOKEN = Symbol('IBusinessDayCalculator');
export const EXCEL_EXPORT_SERVICE_TOKEN = Symbol('IExcelExportService');
```

---

### 3.5 Comment Module — `src/modules/comment/`

**Responsibility:** Manager comments on WorkLog entries.

```
src/modules/comment/
├── application/
│   ├── commands/
│   │   ├── create-comment.command.ts
│   │   ├── update-comment.command.ts
│   │   ├── delete-comment.command.ts
│   │   └── handlers/
│   │       ├── create-comment.handler.ts
│   │       ├── update-comment.handler.ts
│   │       └── delete-comment.handler.ts
│   ├── dtos/
│   │   ├── create-comment.dto.ts
│   │   ├── comment.dto.ts
│   │   └── index.ts
│   └── queries/
│       └── ports/
│           └── i-comment-read-dao.interface.ts
├── constants/
│   └── tokens.ts
├── domain/
│   ├── entities/
│   │   ├── comment.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── comment-id.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── comment-created.event.ts
│   │   ├── comment-updated.event.ts
│   │   ├── comment-deleted.event.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-comment-repository.interface.ts
│   │   └── index.ts
│   └── services/
│       └── index.ts
├── infrastructure/
│   ├── http/
│   │   ├── comment.controller.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       └── comment.schema.ts
│   │   ├── read/
│   │   │   └── comment-read-dao.ts
│   │   └── write/
│   │       └── comment.repository.ts
│   └── projections/
│       └── comment-read-model.projection.ts
└── comment.module.ts
```

**Comment Entity Key Behaviors:**
```typescript
class Comment extends BaseEntity {
  static create(id, props, metadata?): Comment
  static reconstitute(...): Comment
  updateContent(newContent: string, metadata?): void   // only author (manager) can edit
}
```

**Comment Schema (Drizzle):**
```typescript
export const commentsTable = pgTable('comments', {
  id: varchar('id', { length: 50 }).primaryKey(),
  workLogId: varchar('work_log_id', { length: 50 }).notNull(),
  authorId: varchar('author_id', { length: 50 }).notNull(),
  content: text('content').notNull(),
  version: integer('version').notNull().default(0),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  workLog: one(workLogsTable, {
    fields: [commentsTable.workLogId],
    references: [workLogsTable.id],
  }),
  author: one(usersTable, {
    fields: [commentsTable.authorId],
    references: [usersTable.id],
  }),
}));
```

**tokens.ts:**
```typescript
export const COMMENT_REPOSITORY_TOKEN = Symbol('ICommentRepository');
export const COMMENT_READ_DAO_TOKEN = Symbol('ICommentReadDao');
```

---

### 3.6 Notification Module — `src/modules/notification/`

**Responsibility:** In-app + email notifications. Cron-based scheduled + event-triggered.

```
src/modules/notification/
├── application/
│   ├── commands/
│   │   ├── send-notification.command.ts
│   │   ├── mark-notification-read.command.ts
│   │   ├── mark-all-read.command.ts
│   │   ├── update-notification-preference.command.ts
│   │   └── handlers/
│   │       ├── send-notification.handler.ts
│   │       ├── mark-notification-read.handler.ts
│   │       ├── mark-all-read.handler.ts
│   │       └── update-notification-preference.handler.ts
│   ├── dtos/
│   │   ├── notification.dto.ts
│   │   ├── notification-preference.dto.ts
│   │   └── index.ts
│   └── queries/
│       ├── get-notifications.query.ts
│       ├── get-notification-preferences.query.ts
│       ├── handlers/
│       │   ├── get-notifications.handler.ts
│       │   └── get-notification-preferences.handler.ts
│       └── ports/
│           └── i-notification-read-dao.interface.ts
├── constants/
│   └── tokens.ts
├── domain/
│   ├── entities/
│   │   ├── notification.entity.ts
│   │   ├── notification-preference.entity.ts
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── notification-type.value-object.ts
│   │   ├── notification-channel.value-object.ts
│   │   └── index.ts
│   ├── events/
│   │   ├── notification-sent.event.ts
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-notification-repository.interface.ts
│   │   └── index.ts
│   └── services/
│       └── index.ts
├── infrastructure/
│   ├── http/
│   │   ├── notification.controller.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/
│   │   │   └── schema/
│   │   │       ├── notification.schema.ts
│   │   │       └── notification-preference.schema.ts
│   │   ├── read/
│   │   │   └── notification-read-dao.ts
│   │   └── write/
│   │       └── notification.repository.ts
│   ├── schedulers/
│   │   ├── daily-reminder.scheduler.ts        // N-1, N-2
│   │   ├── weekly-summary.scheduler.ts        // N-3
│   │   ├── manager-alert.scheduler.ts         // N-4
│   │   └── monthly-report-reminder.scheduler.ts  // N-5, N-6
│   ├── event-handlers/
│   │   ├── on-comment-created.handler.ts      // N-7
│   │   └── on-task-assigned.handler.ts        // N-8
│   ├── services/
│   │   └── email.service.ts
│   └── projections/
│       └── notification-read-model.projection.ts
└── notification.module.ts
```

**Notification Type Enum (Value Object):**
```typescript
enum NotificationType {
  DAILY_WORK_LOG_REMINDER = 'daily_work_log_reminder',      // N-1
  EDIT_WINDOW_CLOSING = 'edit_window_closing',              // N-2
  WEEKLY_SUMMARY = 'weekly_summary',                        // N-3
  MANAGER_NO_ACTIVITY_ALERT = 'manager_no_activity_alert',  // N-4
  MONTHLY_REPORT_READY = 'monthly_report_ready',            // N-5
  PROJECT_NO_TASKS = 'project_no_tasks',                    // N-6
  COMMENT_RECEIVED = 'comment_received',                    // N-7
  TASK_ASSIGNED = 'task_assigned',                           // N-8
}

enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
}
```

**Notification Schema (Drizzle):**
```typescript
export const notificationsTable = pgTable('notifications', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 300 }).notNull(),
  content: text('content').notNull(),
  actionLink: varchar('action_link', { length: 500 }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const notificationPreferencesTable = pgTable('notification_preferences', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

**tokens.ts:**
```typescript
export const NOTIFICATION_REPOSITORY_TOKEN = Symbol('INotificationRepository');
export const NOTIFICATION_READ_DAO_TOKEN = Symbol('INotificationReadDao');
export const EMAIL_SERVICE_TOKEN = Symbol('IEmailService');
```

---

## 4. API Endpoint Summary

### 4.1 Auth Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| POST | `/auth/login` | Public | `LoginHandler` |
| POST | `/auth/refresh` | Public | `RefreshTokenHandler` |

### 4.2 Project Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| POST | `/projects` | `JwtAuthGuard` (any role — C-4) | `CreateProjectHandler` |
| PUT | `/projects/:id` | `JwtAuthGuard` | `UpdateProjectHandler` |
| GET | `/projects` | `JwtAuthGuard` | `GetProjectListHandler` |
| GET | `/projects/:id` | `JwtAuthGuard` | `GetProjectHandler` |
| GET | `/projects/search?q=` | `JwtAuthGuard` | Read DAO — fuzzy search (C-5) |

### 4.3 Merge Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| POST | `/projects/:id/merge` | `@Roles('manager')` | `MergeProjectsHandler` — merge duplicate projects |

### 4.4 WorkLog Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| POST | `/work-logs` | `JwtAuthGuard` | `CreateWorkLogHandler` — smart default project |
| PUT | `/work-logs/:id` | `@Roles('employee')` | `UpdateWorkLogHandler` |
| DELETE | `/work-logs/:id` | `@Roles('employee')` | `DeleteWorkLogHandler` |
| POST | `/work-logs/:id/unlock` | `@Roles('manager')` | `UnlockWorkLogHandler` — requires `reason` body field (C-6) |
| GET | `/work-logs?taskId=&executionDate=` | `JwtAuthGuard` | `GetWorkLogsHandler` |
| GET | `/work-logs/calendar?month=&year=` | `JwtAuthGuard` | `GetCalendarViewHandler` |
| GET | `/work-logs/summary?month=&year=` | `JwtAuthGuard` | `GetSummaryViewHandler` |

### 4.5 Report Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| GET | `/reports/monthly?month=&year=&employeeId=&projectId=` | `JwtAuthGuard` | `GetMonthlyReportHandler` |
| GET | `/reports/monthly/export?month=&year=&employeeId=&projectId=` | `JwtAuthGuard` | Read DAO → ExcelExportService |

### 4.6 Comment Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| POST | `/work-logs/:id/comments` | `@Roles('manager')` | `CreateCommentHandler` |
| PUT | `/comments/:id` | `@Roles('manager')` | `UpdateCommentHandler` |
| DELETE | `/comments/:id` | `@Roles('manager')` | `DeleteCommentHandler` |

### 4.7 Notification Endpoints

| Method | Endpoint | Guard | Handler |
|--------|----------|-------|---------|
| GET | `/notifications` | `JwtAuthGuard` | `GetNotificationsHandler` |
| PUT | `/notifications/:id/read` | `JwtAuthGuard` | `MarkNotificationReadHandler` |
| PUT | `/notifications/read-all` | `JwtAuthGuard` | `MarkAllReadHandler` |
| GET | `/notifications/preferences` | `JwtAuthGuard` | `GetNotificationPreferencesHandler` |
| PUT | `/notifications/preferences` | `JwtAuthGuard` | `UpdateNotificationPreferenceHandler` |

---

## 5. app.module.ts Update

The updated `AppModule` after adding all Task Management modules:

```typescript
import { Global, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  SharedCqrsModule,
  LoggingModule,
  HealthModule,
  DrizzleDatabaseModule,
  DrizzleUnitOfWork,
  UNIT_OF_WORK_TOKEN,
  OutboxModule,
  schema,
  ContextModule,
  CorrelationIdMiddleware,
} from 'src/libs/shared';
// Existing modules
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
// Task Management modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { WorkLogModule } from './modules/work-log/work-log.module';
import { CommentModule } from './modules/comment/comment.module';
import { NotificationModule } from './modules/notification/notification.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggingModule,
    ContextModule,
    SharedCqrsModule,
    DrizzleDatabaseModule.forRoot({
      schema,
      unitOfWorkProvider: {
        provide: UNIT_OF_WORK_TOKEN,
        useClass: DrizzleUnitOfWork,
      },
    }),
    OutboxModule,
    HealthModule,
    // Existing modules
    ProductModule,
    OrderModule,
    // Task Management modules
    UserModule,
    AuthModule,
    ProjectModule,
    WorkLogModule,
    CommentModule,
    NotificationModule,
  ],
  providers: [
    // Global guards
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

---

## 6. Drizzle Schema Registry Update

Add all new table schemas to `src/libs/shared/database/drizzle/schema/index.ts`:

```typescript
import {
  orderItemsRelations,
  orderItemsTable,
  ordersRelations,
  ordersTable,
} from '@modules/order/infrastructure/persistence/drizzle/schema';
import { productsTable } from '@modules/product/infrastructure/persistence/drizzle/schema';
import {
  outboxStatusEnum,
  outboxTable,
} from '@shared/database/outbox/drizzle/schema/outbox.schema';
// Task Management schemas
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import {
  workLogsTable,
  workLogsRelations,
} from '@modules/work-log/infrastructure/persistence/drizzle/schema';
import {
  commentsTable,
  commentsRelations,
} from '@modules/comment/infrastructure/persistence/drizzle/schema';
import {
  notificationsTable,
  notificationPreferencesTable,
} from '@modules/notification/infrastructure/persistence/drizzle/schema';

export const schema = {
  // Existing
  productsTable,
  ordersTable,
  orderItemsTable,
  ordersRelations,
  orderItemsRelations,
  outboxTable,
  outboxStatusEnum,
  // Task Management
  usersTable,
  projectsTable,
  workLogsTable,
  workLogsRelations,
  commentsTable,
  commentsRelations,
  notificationsTable,
  notificationPreferencesTable,
};
```

---

## 7. New Dependencies Required

| Package | Purpose | Version |
|---------|---------|---------|
| `@nestjs/jwt` | JWT token generation/validation | ^10.x |
| `@nestjs/passport` | Passport integration | ^10.x |
| `passport` | Authentication middleware | ^0.7.x |
| `passport-jwt` | JWT strategy for Passport | ^4.x |
| `bcrypt` | Password hashing (salt rounds >= 10) | ^5.x |
| `@types/bcrypt` | TypeScript types for bcrypt | devDep |
| `exceljs` | Excel (.xlsx) generation | ^4.x |
| `@nestjs/schedule` | Cron-based notification scheduling | ^4.x |

---

## 8. Complete File Listing (New Files to Create)

### src/modules/user/ (17 files)
```
src/modules/user/user.module.ts
src/modules/user/index.ts
src/modules/user/constants/tokens.ts
src/modules/user/domain/index.ts
src/modules/user/domain/entities/user.entity.ts
src/modules/user/domain/entities/index.ts
src/modules/user/domain/value-objects/user-id.value-object.ts
src/modules/user/domain/value-objects/user-email.value-object.ts
src/modules/user/domain/value-objects/user-role.value-object.ts
src/modules/user/domain/value-objects/index.ts
src/modules/user/domain/events/user-created.event.ts
src/modules/user/domain/events/user-deactivated.event.ts
src/modules/user/domain/events/index.ts
src/modules/user/domain/repositories/i-user-repository.interface.ts
src/modules/user/domain/repositories/index.ts
src/modules/user/domain/services/index.ts
src/modules/user/application/index.ts
src/modules/user/application/commands/create-user.command.ts
src/modules/user/application/commands/deactivate-user.command.ts
src/modules/user/application/commands/index.ts
src/modules/user/application/commands/handlers/create-user.handler.ts
src/modules/user/application/commands/handlers/deactivate-user.handler.ts
src/modules/user/application/commands/handlers/index.ts
src/modules/user/application/dtos/create-user.dto.ts
src/modules/user/application/dtos/user.dto.ts
src/modules/user/application/dtos/index.ts
src/modules/user/application/queries/get-user.query.ts
src/modules/user/application/queries/get-user-list.query.ts
src/modules/user/application/queries/index.ts
src/modules/user/application/queries/handlers/get-user.handler.ts
src/modules/user/application/queries/handlers/get-user-list.handler.ts
src/modules/user/application/queries/handlers/index.ts
src/modules/user/application/queries/ports/i-user-read-dao.interface.ts
src/modules/user/application/queries/ports/index.ts
src/modules/user/infrastructure/index.ts
src/modules/user/infrastructure/http/user.controller.ts
src/modules/user/infrastructure/http/index.ts
src/modules/user/infrastructure/persistence/index.ts
src/modules/user/infrastructure/persistence/drizzle/schema/user.schema.ts
src/modules/user/infrastructure/persistence/drizzle/schema/index.ts
src/modules/user/infrastructure/persistence/read/user-read-dao.ts
src/modules/user/infrastructure/persistence/read/index.ts
src/modules/user/infrastructure/persistence/write/user.repository.ts
src/modules/user/infrastructure/persistence/write/index.ts
src/modules/user/infrastructure/projections/user-read-model.projection.ts
src/modules/user/infrastructure/projections/index.ts
```

### src/modules/auth/ (23 files)
```
src/modules/auth/auth.module.ts
src/modules/auth/index.ts
src/modules/auth/constants/tokens.ts
src/modules/auth/domain/value-objects/token-pair.value-object.ts
src/modules/auth/domain/value-objects/index.ts
src/modules/auth/domain/services/index.ts
src/modules/auth/application/commands/login.command.ts
src/modules/auth/application/commands/refresh-token.command.ts
src/modules/auth/application/commands/index.ts
src/modules/auth/application/commands/handlers/login.handler.ts
src/modules/auth/application/commands/handlers/refresh-token.handler.ts
src/modules/auth/application/commands/handlers/index.ts
src/modules/auth/application/dtos/login-request.dto.ts
src/modules/auth/application/dtos/login-response.dto.ts
src/modules/auth/application/dtos/refresh-token-request.dto.ts
src/modules/auth/application/dtos/refresh-token-response.dto.ts
src/modules/auth/application/dtos/index.ts
src/modules/auth/application/queries/ports/i-token-read-dao.interface.ts
src/modules/auth/infrastructure/index.ts
src/modules/auth/infrastructure/http/auth.controller.ts
src/modules/auth/infrastructure/http/guards/jwt-auth.guard.ts
src/modules/auth/infrastructure/http/guards/roles.guard.ts
src/modules/auth/infrastructure/http/decorators/current-user.decorator.ts
src/modules/auth/infrastructure/http/decorators/roles.decorator.ts
src/modules/auth/infrastructure/http/index.ts
src/modules/auth/infrastructure/services/jwt-token.service.ts
src/modules/auth/infrastructure/services/bcrypt-hash.service.ts
src/modules/auth/infrastructure/services/index.ts
src/modules/auth/infrastructure/persistence/drizzle/schema/refresh-token.schema.ts
src/modules/auth/infrastructure/persistence/read/token-read-dao.ts
src/modules/auth/infrastructure/persistence/write/refresh-token.repository.ts
```

### src/modules/project/ (24 files)
```
src/modules/project/project.module.ts
src/modules/project/index.ts
src/modules/project/constants/tokens.ts
src/modules/project/domain/index.ts
src/modules/project/domain/entities/project.entity.ts
src/modules/project/domain/entities/index.ts
src/modules/project/domain/value-objects/project-id.value-object.ts
src/modules/project/domain/value-objects/project-status.value-object.ts
src/modules/project/domain/value-objects/index.ts
src/modules/project/domain/events/project-created.event.ts
src/modules/project/domain/events/project-updated.event.ts
src/modules/project/domain/events/project-completed.event.ts
src/modules/project/domain/events/project-archived.event.ts
src/modules/project/domain/events/index.ts
src/modules/project/domain/repositories/i-project-repository.interface.ts
src/modules/project/domain/repositories/index.ts
src/modules/project/domain/services/index.ts
src/modules/project/application/index.ts
src/modules/project/application/commands/create-project.command.ts
src/modules/project/application/commands/update-project.command.ts
src/modules/project/application/commands/index.ts
src/modules/project/application/commands/handlers/create-project.handler.ts
src/modules/project/application/commands/handlers/update-project.handler.ts
src/modules/project/application/commands/handlers/index.ts
src/modules/project/application/dtos/create-project.dto.ts
src/modules/project/application/dtos/update-project.dto.ts
src/modules/project/application/dtos/project.dto.ts
src/modules/project/application/dtos/index.ts
src/modules/project/application/queries/get-project.query.ts
src/modules/project/application/queries/get-project-list.query.ts
src/modules/project/application/queries/index.ts
src/modules/project/application/queries/handlers/get-project.handler.ts
src/modules/project/application/queries/handlers/get-project-list.handler.ts
src/modules/project/application/queries/handlers/index.ts
src/modules/project/application/queries/ports/i-project-read-dao.interface.ts
src/modules/project/infrastructure/index.ts
src/modules/project/infrastructure/http/project.controller.ts
src/modules/project/infrastructure/http/index.ts
src/modules/project/infrastructure/persistence/drizzle/schema/project.schema.ts
src/modules/project/infrastructure/persistence/drizzle/schema/index.ts
src/modules/project/infrastructure/persistence/read/project-read-dao.ts
src/modules/project/infrastructure/persistence/read/index.ts
src/modules/project/infrastructure/persistence/write/project.repository.ts
src/modules/project/infrastructure/persistence/write/index.ts
src/modules/project/infrastructure/projections/project-read-model.projection.ts
src/modules/project/infrastructure/projections/index.ts
```

### src/modules/work-log/ (38 files)
```
src/modules/work-log/work-log.module.ts
src/modules/work-log/index.ts
src/modules/work-log/constants/tokens.ts
src/modules/work-log/domain/index.ts
src/modules/work-log/domain/entities/work-log.entity.ts
src/modules/work-log/domain/entities/index.ts
src/modules/work-log/domain/value-objects/work-log-id.value-object.ts
src/modules/work-log/domain/value-objects/execution-date.value-object.ts
src/modules/work-log/domain/value-objects/index.ts
src/modules/work-log/domain/events/work-log-created.event.ts
src/modules/work-log/domain/events/work-log-updated.event.ts
src/modules/work-log/domain/events/work-log-deleted.event.ts
src/modules/work-log/domain/events/work-log-unlocked.event.ts
src/modules/work-log/domain/events/index.ts
src/modules/work-log/domain/repositories/i-work-log-repository.interface.ts
src/modules/work-log/domain/repositories/index.ts
src/modules/work-log/domain/services/business-day-calculator.service.ts
src/modules/work-log/domain/services/work-log-lock-policy.service.ts
src/modules/work-log/domain/services/index.ts
src/modules/work-log/domain/specifications/within-edit-window.specification.ts
src/modules/work-log/domain/specifications/index.ts
src/modules/work-log/application/index.ts
src/modules/work-log/application/commands/create-work-log.command.ts
src/modules/work-log/application/commands/update-work-log.command.ts
src/modules/work-log/application/commands/delete-work-log.command.ts
src/modules/work-log/application/commands/unlock-work-log.command.ts
src/modules/work-log/application/commands/index.ts
src/modules/work-log/application/commands/handlers/create-work-log.handler.ts
src/modules/work-log/application/commands/handlers/update-work-log.handler.ts
src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts
src/modules/work-log/application/commands/handlers/unlock-work-log.handler.ts
src/modules/work-log/application/commands/handlers/index.ts
src/modules/work-log/application/dtos/create-work-log.dto.ts
src/modules/work-log/application/dtos/update-work-log.dto.ts
src/modules/work-log/application/dtos/work-log.dto.ts
src/modules/work-log/application/dtos/monthly-report.dto.ts
src/modules/work-log/application/dtos/calendar-view.dto.ts
src/modules/work-log/application/dtos/summary-view.dto.ts
src/modules/work-log/application/dtos/index.ts
src/modules/work-log/application/queries/get-work-logs.query.ts
src/modules/work-log/application/queries/get-monthly-report.query.ts
src/modules/work-log/application/queries/get-calendar-view.query.ts
src/modules/work-log/application/queries/get-summary-view.query.ts
src/modules/work-log/application/queries/index.ts
src/modules/work-log/application/queries/handlers/get-work-logs.handler.ts
src/modules/work-log/application/queries/handlers/get-monthly-report.handler.ts
src/modules/work-log/application/queries/handlers/get-calendar-view.handler.ts
src/modules/work-log/application/queries/handlers/get-summary-view.handler.ts
src/modules/work-log/application/queries/handlers/index.ts
src/modules/work-log/application/queries/ports/i-work-log-read-dao.interface.ts
src/modules/work-log/infrastructure/index.ts
src/modules/work-log/infrastructure/http/work-log.controller.ts
src/modules/work-log/infrastructure/http/report.controller.ts
src/modules/work-log/infrastructure/http/index.ts
src/modules/work-log/infrastructure/persistence/drizzle/schema/work-log.schema.ts
src/modules/work-log/infrastructure/persistence/drizzle/schema/index.ts
src/modules/work-log/infrastructure/persistence/read/work-log-read-dao.ts
src/modules/work-log/infrastructure/persistence/read/index.ts
src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts
src/modules/work-log/infrastructure/persistence/write/index.ts
src/modules/work-log/infrastructure/projections/work-log-read-model.projection.ts
src/modules/work-log/infrastructure/projections/index.ts
src/modules/work-log/infrastructure/services/excel-export.service.ts
```

### src/modules/comment/ (25 files)
```
src/modules/comment/comment.module.ts
src/modules/comment/index.ts
src/modules/comment/constants/tokens.ts
src/modules/comment/domain/index.ts
src/modules/comment/domain/entities/comment.entity.ts
src/modules/comment/domain/entities/index.ts
src/modules/comment/domain/value-objects/comment-id.value-object.ts
src/modules/comment/domain/value-objects/index.ts
src/modules/comment/domain/events/comment-created.event.ts
src/modules/comment/domain/events/comment-updated.event.ts
src/modules/comment/domain/events/comment-deleted.event.ts
src/modules/comment/domain/events/index.ts
src/modules/comment/domain/repositories/i-comment-repository.interface.ts
src/modules/comment/domain/repositories/index.ts
src/modules/comment/domain/services/index.ts
src/modules/comment/application/index.ts
src/modules/comment/application/commands/create-comment.command.ts
src/modules/comment/application/commands/update-comment.command.ts
src/modules/comment/application/commands/delete-comment.command.ts
src/modules/comment/application/commands/index.ts
src/modules/comment/application/commands/handlers/create-comment.handler.ts
src/modules/comment/application/commands/handlers/update-comment.handler.ts
src/modules/comment/application/commands/handlers/delete-comment.handler.ts
src/modules/comment/application/commands/handlers/index.ts
src/modules/comment/application/dtos/create-comment.dto.ts
src/modules/comment/application/dtos/comment.dto.ts
src/modules/comment/application/dtos/index.ts
src/modules/comment/application/queries/ports/i-comment-read-dao.interface.ts
src/modules/comment/infrastructure/index.ts
src/modules/comment/infrastructure/http/comment.controller.ts
src/modules/comment/infrastructure/http/index.ts
src/modules/comment/infrastructure/persistence/drizzle/schema/comment.schema.ts
src/modules/comment/infrastructure/persistence/drizzle/schema/index.ts
src/modules/comment/infrastructure/persistence/read/comment-read-dao.ts
src/modules/comment/infrastructure/persistence/read/index.ts
src/modules/comment/infrastructure/persistence/write/comment.repository.ts
src/modules/comment/infrastructure/persistence/write/index.ts
src/modules/comment/infrastructure/projections/comment-read-model.projection.ts
src/modules/comment/infrastructure/projections/index.ts
```

### src/modules/notification/ (32 files)
```
src/modules/notification/notification.module.ts
src/modules/notification/index.ts
src/modules/notification/constants/tokens.ts
src/modules/notification/domain/index.ts
src/modules/notification/domain/entities/notification.entity.ts
src/modules/notification/domain/entities/notification-preference.entity.ts
src/modules/notification/domain/entities/index.ts
src/modules/notification/domain/value-objects/notification-type.value-object.ts
src/modules/notification/domain/value-objects/notification-channel.value-object.ts
src/modules/notification/domain/value-objects/index.ts
src/modules/notification/domain/events/notification-sent.event.ts
src/modules/notification/domain/events/index.ts
src/modules/notification/domain/repositories/i-notification-repository.interface.ts
src/modules/notification/domain/repositories/index.ts
src/modules/notification/domain/services/index.ts
src/modules/notification/application/index.ts
src/modules/notification/application/commands/send-notification.command.ts
src/modules/notification/application/commands/mark-notification-read.command.ts
src/modules/notification/application/commands/mark-all-read.command.ts
src/modules/notification/application/commands/update-notification-preference.command.ts
src/modules/notification/application/commands/index.ts
src/modules/notification/application/commands/handlers/send-notification.handler.ts
src/modules/notification/application/commands/handlers/mark-notification-read.handler.ts
src/modules/notification/application/commands/handlers/mark-all-read.handler.ts
src/modules/notification/application/commands/handlers/update-notification-preference.handler.ts
src/modules/notification/application/commands/handlers/index.ts
src/modules/notification/application/dtos/notification.dto.ts
src/modules/notification/application/dtos/notification-preference.dto.ts
src/modules/notification/application/dtos/index.ts
src/modules/notification/application/queries/get-notifications.query.ts
src/modules/notification/application/queries/get-notification-preferences.query.ts
src/modules/notification/application/queries/index.ts
src/modules/notification/application/queries/handlers/get-notifications.handler.ts
src/modules/notification/application/queries/handlers/get-notification-preferences.handler.ts
src/modules/notification/application/queries/handlers/index.ts
src/modules/notification/application/queries/ports/i-notification-read-dao.interface.ts
src/modules/notification/infrastructure/index.ts
src/modules/notification/infrastructure/http/notification.controller.ts
src/modules/notification/infrastructure/http/index.ts
src/modules/notification/infrastructure/persistence/drizzle/schema/notification.schema.ts
src/modules/notification/infrastructure/persistence/drizzle/schema/notification-preference.schema.ts
src/modules/notification/infrastructure/persistence/drizzle/schema/index.ts
src/modules/notification/infrastructure/persistence/read/notification-read-dao.ts
src/modules/notification/infrastructure/persistence/read/index.ts
src/modules/notification/infrastructure/persistence/write/notification.repository.ts
src/modules/notification/infrastructure/persistence/write/index.ts
src/modules/notification/infrastructure/projections/notification-read-model.projection.ts
src/modules/notification/infrastructure/projections/index.ts
src/modules/notification/infrastructure/schedulers/daily-reminder.scheduler.ts
src/modules/notification/infrastructure/schedulers/weekly-summary.scheduler.ts
src/modules/notification/infrastructure/schedulers/manager-alert.scheduler.ts
src/modules/notification/infrastructure/schedulers/monthly-report-reminder.scheduler.ts
src/modules/notification/infrastructure/event-handlers/on-comment-created.handler.ts
src/modules/notification/infrastructure/event-handlers/on-task-assigned.handler.ts
src/modules/notification/infrastructure/services/email.service.ts
```

### Files to Modify (Existing)
```
src/app.module.ts                                          — Add 7 new module imports + APP_GUARD providers
src/libs/shared/database/drizzle/schema/index.ts           — Register all new table schemas
```

---

## 9. Implementation Order

| Phase | Module | Rationale |
|-------|--------|-----------|
| **1** | UserModule | Foundation — all other modules depend on user identity |
| **2** | AuthModule | Depends on UserModule; enables authentication for all subsequent modules |
| **3** | ProjectModule | Standalone; foundation for Task hierarchy |
| **4** | WorkLogModule | Core feature; depends on ProjectModule + UserModule |
| **5** | CommentModule | Depends on WorkLogModule + UserModule |
| **6** | NotificationModule | Depends on all above; subscribes to domain events |

---

## 10. Key Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| AD-1 | **3-day lock rule enforced at domain level** | `ExecutionDate` value object + `WorkLogLockPolicy` domain service validate edit window. The aggregate itself rejects modifications outside the window. This is an invariant, not a policy. |
| AD-2 | **Business day calculator is a domain service** | Vietnamese holiday awareness is business logic, not infrastructure. The interface lives in domain; the concrete implementation (with holiday config) lives in infrastructure. |
| AD-3 | **Comment is a separate module, not nested in WorkLog** | Follows existing project pattern where each aggregate gets its own module. Enables independent evolution, separate DI tokens, clean CQRS boundaries. |
| AD-4 | **Global guards for JWT + Roles** | `APP_GUARD` registration in AppModule ensures all endpoints are protected by default. Individual endpoints opt-out with `@Public()` decorator (login, refresh). |
| AD-5 | **Flat authorization model** | Managers see ALL employees' data. No team/group filtering. Simple `role` check in guards, no complex RBAC. |
| AD-6 | **Excel export via infrastructure service** | `ExcelExportService` uses `exceljs` library. Called from read side (Query handler or directly from controller). File I/O is infrastructure concern. |
| AD-7 | **Notifications use domain events** | N-7 (comment created) and N-8 (task assigned) are triggered by `CommentCreatedEvent` and `TaskAssignedEvent` via `@EventsHandler`. Decouples notification from core business logic. |
| AD-8 | **Cron notifications via @nestjs/schedule** | N-1 through N-6 use `@Cron()` decorators in scheduler classes within NotificationModule's infrastructure layer. |
| AD-9 | **Unique constraint: project + employee + executionDate** | Enforced at both application level (handler checks before create) and database level (composite unique index). Prevents duplicate WorkLog entries (PRD constraint C-3). |
| AD-10 | **Soft delete for WorkLog and Comment** | Follows existing `ISoftDeletable` pattern from ProductModule. Audit trail preserved. |
| AD-11 | **Unlock audit trail (C-6)** | `UnlockWorkLogCommand` carries mandatory `reason` field. WorkLog entity stores `unlockedBy`, `unlockedAt`, `unlockReason` in DB. `WorkLogUnlockedEvent` carries full audit data for event consumers. |
| AD-12 | **Employee isolation (C-7)** | All WorkLog read queries filter by `employeeId = currentUser.id` when role is `employee`. Managers bypass this filter. Enforced at Read DAO level, not controller. |
| AD-13 | **Open Project/Task creation (C-4)** | `POST /projects` and `POST /tasks` only require `JwtAuthGuard` (not `@Roles('manager')`). Either role can create. Easy to tighten later by adding `@Roles('manager')` with no data migration. |
| AD-14 | **Search-before-create pattern (C-5)** | Project and Task Read DAOs expose `search(query: string)` with fuzzy matching (SQL `ILIKE` or `pg_trgm`). Controller returns search results; "create" button only offered client-side when results are empty. |

---

_Document generated by Winston (Architect Agent) — BMAD Method v6.6.0_
