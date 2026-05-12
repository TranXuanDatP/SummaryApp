---
stepsCompleted: [1, 2, 3, 4]
status: complete
inputDocuments:
  - "_bmad-output/planning-artifacts/prd-task-management.md"
  - "_bmad-output/planning-artifacts/architecture-task-management.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/planning-artifacts/product-brief-task-management.md"
---

# nestjs-project-example - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for nestjs-project-example, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR-01: Quản lý WorkLog (Nhân viên) — tạo/sửa/xóa WorkLog trong cửa sổ 3 ngày làm việc, khóa vĩnh viễn sau khi hết hạn, quản lý override mở khóa (P0)
- FR-02: Xem Báo cáo Tháng (Nhân viên & Quản lý) — bảng theo thời gian, lọc tháng/năm/nhân viên/dự án, phân quyền hiển thị (P0)
- FR-03: Xuất Excel — file .xlsx với format cố định, đặt tên tự động, bộ lọc phản ánh trong xuất (P0)
- FR-04: Nhận xét / Phản hồi của Quản lý — tạo/sửa/xóa nhận xét trên WorkLog, hiển thị trong báo cáo và Excel (P0)
- FR-05: Quản lý Dự án & Merge — CRUD, tìm kiếm fuzzy, merge dự án trùng (P1)
- FR-06: Xác thực & Phân quyền — JWT access/refresh token, hai vai trò, guards, CLI initialization (P0)
- FR-07: Hệ thống Thông báo — 8 loại (N-1 đến N-8), cron + event-triggered, tùy chọn kênh (P0)
- FR-08: Calendar View & Summary View — calendar với status indicators, summary thống kê (P1)

### Non-Functional Requirements

- NFR-1: Backend NestJS với cấu trúc module DDD, pattern CQRS
- NFR-2: Báo cáo <2 giây (500 WorkLog), xuất Excel <5 giây, CRUD API <500ms
- NFR-3: Không ghi ngày tương lai, cửa sổ 3 ngày làm việc, một WorkLog/dự án/ngày, soft delete, toàn vẹn ở cấp domain
- NFR-4: JWT TTL 15 phút + refresh 7 ngày, bcrypt salt >= 10, role-based guards, rate limiting trên auth endpoints

### Additional Requirements (Architecture)

- Kiến trúc starter: Module DDD/CQRS hiện có (Drizzle ORM, Fastify, CQRS buses, Unit of Work, Outbox pattern)
- 5 module mới: Auth, User, Project, WorkLog, Comment, Notification
- Thứ tự triển khai: User → Auth → Project → WorkLog → Comment → Notification
- 7 package mới: @nestjs/jwt, @nestjs/passport, passport, passport-jwt, bcrypt, exceljs, @nestjs/schedule
- ~159 files mới, 2 files sửa đổi (app.module.ts, schema/index.ts)
- Global guards: JwtAuthGuard + RolesGuard qua APP_GUARD
- Cross-module dependencies đã xác định rõ

### UX Design Requirements

- UX-DR1: Zero-friction create — POST /work-logs chỉ cần `{ content }`, smart defaults cho projectId và executionDate
- UX-DR2: Business rule flags — `isEditable`, `editWindowClosesAt` trong mọi WorkLog response
- UX-DR3: Error format chuẩn — `{ code, message, suggestion, details? }` với 13 error codes đã định nghĩa
- UX-DR4: Smart defaults endpoint — `GET /work-logs/defaults` trả suggestedProjectId + todayDate
- UX-DR5: Calendar view API — mảng ngày với `isBusinessDay`, `hasWorkLog`, `isEditable` per ngày
- UX-DR6: Summary view API — `completionRate`, `editableGaps`, `projectBreakdown`
- UX-DR7: Search-before-create — fuzzy search, "create" chỉ hiện khi kết quả trống
- UX-DR8: Notification preferences — nested object `{ type, channel, enabled }` per user
- UX-DR9: Pagination nhất quán — `{ data, total, page, totalPages }` trên mọi list endpoint
- UX-DR10: Flat access model — manager xem tất cả, employee auto-filter theo employeeId
- UX-DR11: DTO trả display names (`projectName`, `employeeName`) — không bắt client gọi thêm
- UX-DR12: Create response trả 201 + Location header + full DTO

### FR Coverage Map

FR-01: Epic 3 — Quản lý WorkLog (tạo/sửa/xóa, khóa 3 ngày, override)
FR-02: Epic 3 — Báo cáo tháng (bảng, lọc, phân quyền)
FR-03: Epic 3 — Xuất Excel (.xlsx, format cố định)
FR-04: Epic 4 — Nhận xét quản lý trên WorkLog
FR-05: Epic 2 — Quản lý dự án (CRUD, fuzzy search, merge)
FR-06: Epic 1 — Xác thực & phân quyền (JWT, roles, guards)
FR-07: Epic 4 — Hệ thống thông báo (8 loại, cron + event)
FR-08: Epic 3 — Calendar & Summary view

## Epic List

### Epic 1: Xác thực & Quản lý Người dùng
Người dùng có thể đăng nhập bằng email + mật khẩu, nhận JWT tokens, hệ thống phân quyền theo vai trò employee/manager. Admin khởi tạo user qua CLI.
**FRs covered:** FR-06

### Epic 2: Quản lý Dự án
Người dùng có thể tạo, tìm kiếm, cập nhật, và quản lý dự án. Quản lý có thể gộp dự án trùng lặp.
**FRs covered:** FR-05

### Epic 3: Ghi nhận Công việc & Báo cáo
Nhân viên ghi nhận công việc hàng ngày trong <15 giây. Xem calendar, summary, báo cáo tháng. Quản lý xem báo cáo toàn đội. Xuất Excel trong 3 giây.
**FRs covered:** FR-01, FR-02, FR-03, FR-08

### Epic 4: Phản hồi Quản lý & Hệ thống Thông báo
Quản lý nhận xét trên WorkLog. Hệ thống thông báo chủ động với 8 loại (cron + event-triggered). Người dùng tùy chỉnh kênh nhận.
**FRs covered:** FR-04, FR-07

## Epic 1: Xác thực & Quản lý Người dùng

Người dùng có thể đăng nhập bằng email + mật khẩu, nhận JWT tokens, hệ thống phân quyền theo vai trò employee/manager. Admin khởi tạo user qua CLI.

### Story 1.1: User Module — Aggregate, Value Objects & Schema

As a developer,
I want to create UserModule with domain entity, value objects, and Drizzle schema,
so that user identity is available as foundation for the entire system.

**Acceptance Criteria:**

**Given** the existing NestJS DDD/CQRS project
**When** UserModule is created with User entity (id, email, password, fullName, role, isActive), value objects (UserId, UserEmail, UserRole), domain events (UserCreatedEvent, UserDeactivatedEvent), repository interface, and Drizzle schema
**Then** User entity has factory methods `create()` and `reconstitute()`, lifecycle methods `deactivate()`, `reactivate()`, `changeRole()`
**And** `usersTable` schema matches Architecture document, registered in shared schema registry
**And** module follows folder structure: domain/, application/, infrastructure/, constants/

### Story 1.2: User CRUD Commands & Queries — API Endpoints

As an admin,
I want to create, deactivate, and list users via API,
so that I can manage user accounts in the system.

**Acceptance Criteria:**

**Given** UserModule with entity and repository
**When** I send `POST /users` with `{ email, password, fullName, role }`
**Then** user is created with bcrypt-hashed password (salt >= 10), returns 201 + full User DTO + Location header
**And** `GET /users` returns paginated list `{ data, total, page, totalPages }`
**And** `GET /users/:id` returns user detail
**And** deactivate command sets `isActive = false`, emits UserDeactivatedEvent
**And** validation errors return `{ code: "VALIDATION_ERROR", details: [{ field, message }] }`

### Story 1.3: CLI Seed Command — Khởi tạo User ban đầu

As an admin,
I want to run a CLI command to create the initial manager user,
so that the system has at least one manager to start using.

**Acceptance Criteria:**

**Given** UserModule with create-user command handler
**When** I run the CLI seed command with email, password, fullName, role
**Then** a manager user is created in the database
**And** running seed with existing email does not duplicate — returns friendly error
**And** password is hashed with bcrypt, same as API create user

### Story 1.4: JWT Authentication — Login, Refresh & Token Management

As a user,
I want to log in with email + password and receive access + refresh tokens,
so that I can authenticate subsequent API requests.

**Acceptance Criteria:**

**Given** a user exists in the database
**When** I send `POST /auth/login` with valid credentials
**Then** receive `{ accessToken (TTL 15 min), refreshToken (TTL 7 days) }`
**And** `POST /auth/refresh` with valid refresh token → new access token
**And** invalid credentials → `401 { code: "AUTH_INVALID_CREDENTIALS", message: "...", suggestion: "..." }`
**And** disabled account → `403 { code: "AUTH_ACCOUNT_DISABLED" }`
**And** expired refresh token → `401 { code: "AUTH_REFRESH_EXPIRED" }`
**And** RefreshToken stored in `refresh_tokens` Drizzle schema with user relation
**And** rate limiting on login endpoint (max 5 requests/min/IP)

### Story 1.5: Global Auth Guards, Decorators & Error Response Format

As a developer,
I want JWT + Roles guards applied globally and error response format standardized,
so that all endpoints are protected by default and errors are consistent system-wide.

**Acceptance Criteria:**

**Given** JwtAuthGuard and RolesGuard registered via APP_GUARD in AppModule
**When** any request without JWT hits any endpoint except `/auth/login` and `/auth/refresh`
**Then** returns `401 { code: "AUTH_TOKEN_EXPIRED", message: "...", suggestion: "..." }`
**And** endpoint with `@Roles('manager')` accessed by employee → `403 { code: "AUTH_FORBIDDEN_ROLE" }`
**And** `@Public()` decorator bypasses guards for login/refresh
**And** `@CurrentUser()` decorator extracts authenticated user from JWT payload
**And** all error responses (401, 403, 404, 422, 500) follow format `{ statusCode, code, message, suggestion, details? }`
**And** `app.module.ts` updated with UserModule, AuthModule, and APP_GUARD providers

## Epic 2: Quản lý Dự án

Người dùng có thể tạo, tìm kiếm, cập nhật, và quản lý dự án. Quản lý có thể gộp dự án trùng lặp.

### Story 2.1: Project Module — Aggregate, Value Objects & Schema

As a developer,
I want to create ProjectModule with domain entity, value objects, and Drizzle schema,
so that projects exist as a foundation for WorkLog entries.

**Acceptance Criteria:**

**Given** the existing NestJS project with auth from Epic 1
**When** ProjectModule is created with Project entity (id, name, description, status), value objects (ProjectId, ProjectStatus with `active|completed|archived`), domain events (Created, Updated, Completed, Archived), repository interface, and Drizzle schema
**Then** Project entity has factory methods `create()` and `reconstitute()`, lifecycle methods `updateDetails()`, `activate()`, `complete()`, `archive()`
**And** `projectsTable` schema matches Architecture document, registered in shared schema registry
**And** ProjectModule imported by AppModule

### Story 2.2: Project CRUD — Commands, Queries & API Endpoints

As any authenticated user,
I want to create, update, list, and view projects via API,
so that I can organize my work by project.

**Acceptance Criteria:**

**Given** ProjectModule with entity and repository
**When** I send `POST /projects` with `{ name, description? }`
**Then** project created with status `active`, returns 201 + full Project DTO + Location header
**And** `GET /projects` returns paginated list `{ data, total, page, totalPages }` ordered by `createdAt desc`
**And** `GET /projects/:id` returns project detail
**And** `PUT /projects/:id` with `{ name?, description? }` updates project — only `JwtAuthGuard` required (both roles per C-4)
**And** `isDeleted: false` filter applied on all read queries (soft delete)

### Story 2.3: Fuzzy Search & Search-before-Create Pattern

As an employee,
I want to search for existing projects by name before creating a new one,
so that I avoid creating duplicate projects.

**Acceptance Criteria:**

**Given** projects exist in the database
**When** I send `GET /projects/search?q=dự án alpha`
**Then** returns matching projects using fuzzy matching (`ILIKE` or `pg_trgm`), ordered by relevance
**And** empty query `q=""` returns empty results (not all projects)
**And** response format: `{ data: [...], total, page, totalPages }`
**And** search endpoint protected by `JwtAuthGuard` only — both roles can search
**And** UX pattern: client shows results; "Create new" only visible when `data` is empty (UX-DR7)

### Story 2.4: Merge Projects — Gộp Dự án Trùng Tên

As a manager,
I want to merge duplicate projects into one,
so that reports are clean before exporting.

**Acceptance Criteria:**

**Given** two or more projects with similar/identical names exist
**When** I send `POST /projects/:id/merge` with `{ sourceIds: ["id1", "id2"] }`
**Then** all WorkLogs from source projects reassigned to target project (`projectId` updated)
**And** source projects status set to `archived` (not deleted — soft archive)
**And** merge emits `ProjectsMergedEvent` for event consumers
**And** endpoint protected by `@Roles('manager')` — employee returns `403 AUTH_FORBIDDEN_ROLE`
**And** target project must exist — `404 PROJECT_NOT_FOUND` if not
**And** source must not equal target — `422` if sourceId === targetId

## Epic 3: Ghi nhận Công việc & Báo cáo

Nhân viên ghi nhận công việc hàng ngày trong <15 giây. Xem calendar, summary, báo cáo tháng. Quản lý xem báo cáo toàn đội. Xuất Excel trong 3 giây.

### Story 3.1: WorkLog Module — Aggregate, Value Objects & Domain Services

As a developer,
I want to create WorkLogModule with domain entity, value objects, and domain services,
so that the 3-day lock rule and business day logic are enforced at domain level.

**Acceptance Criteria:**

**Given** existing project with auth (Epic 1) and projects (Epic 2)
**When** WorkLogModule is created with WorkLog entity (id, projectId, employeeId, executionDate, content, isUnlocked, unlockedBy, unlockedAt, unlockReason), value objects (WorkLogId, ExecutionDate), domain services (BusinessDayCalculator, WorkLogLockPolicy, WithinEditWindowSpecification)
**Then** `ExecutionDate` value object rejects future dates and dates beyond 3 business days lookback
**And** `BusinessDayCalculator` calculates business days excluding weekends and Vietnamese holidays
**And** `WorkLogLockPolicy.isEditable(workLog, calculator)` returns true/false based on 3-day window
**And** WorkLog entity `updateContent()` and `delete()` reject changes outside edit window (unless unlocked)
**And** `unlock()` records `unlockedBy`, `unlockedAt`, `unlockReason` — mandatory audit trail (C-6)
**And** `workLogsTable` Drizzle schema matches Architecture, registered in shared schema registry
**And** domain events: WorkLogCreated, WorkLogUpdated, WorkLogDeleted, WorkLogUnlocked

### Story 3.2: WorkLog CRUD — Create, Update, Delete với 3-day Lock Rule

As an employee,
I want to create, update, and delete my WorkLog entries within the 3-day window,
so that I can record my daily work and correct mistakes before the lock kicks in.

**Acceptance Criteria:**

**Given** I am authenticated as an employee
**When** I send `POST /work-logs` with `{ content, projectId?, executionDate? }`
**Then** WorkLog created — `projectId` defaults to my most recent project, `executionDate` defaults to today, returns 201 + full WorkLog DTO with `isEditable: true`, `editWindowClosesAt`, `projectName`, `employeeName`
**And** `PUT /work-logs/:id` with `{ content }` updates only `content`, only within 3-day window
**And** `DELETE /work-logs/:id` soft-deletes within 3-day window
**And** future `executionDate` → `422 WORKLOG_FUTURE_DATE`
**And** `executionDate` beyond 3 business days → `422 WORKLOG_EDIT_WINDOW_EXPIRED`
**And** update/delete on locked WorkLog → `422 WORKLOG_LOCKED` with suggestion "Liên hệ quản lý để mở khóa"
**And** duplicate (same projectId + employeeId + executionDate) → `409 WORKLOG_DUPLICATE`
**And** I can only access my own WorkLogs — others return `404 WORKLOG_NOT_FOUND` (C-7)

### Story 3.3: Manager Unlock Override — Mở khóa WorkLog đã Hết hạn

As a manager,
I want to unlock a locked WorkLog with a mandatory reason,
so that employees can fix entries missed due to illness or emergencies.

**Acceptance Criteria:**

**Given** a WorkLog is locked (past 3-day window)
**When** I send `POST /work-logs/:id/unlock` with `{ reason: "Nhân viên ốm 2 ngày" }`
**Then** `isUnlocked` = true, `unlockedBy` = my ID, `unlockedAt` = now, `unlockReason` = provided reason
**And** response includes `isEditable: true`
**And** `reason` is mandatory — missing returns `400 VALIDATION_ERROR`
**And** endpoint protected by `@Roles('manager')` — employee returns `403`
**And** after employee saves update, WorkLog auto-locks (`isUnlocked: false`)
**And** WorkLogUnlockedEvent emitted with full audit data

### Story 3.4: WorkLog List & Query với Phân quyền

As an employee or manager,
I want to list and filter WorkLog entries,
so that I can view work history by project, date, or employee.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I send `GET /work-logs?projectId=abc&executionDate=2026-05-11`
**Then** returns paginated list `{ data: [WorkLog DTO], total, page, totalPages }`
**And** each WorkLog DTO includes `projectName`, `employeeName`, `isEditable`, `editWindowClosesAt` (UX-DR11)
**And** as employee: only my WorkLogs, auto-filtered by `employeeId = currentUser.id` (UX-DR10)
**And** as manager: all employees' WorkLogs
**And** filter by `projectId` and/or `executionDate`
**And** sorted by `executionDate desc`, default limit=20

### Story 3.5: Smart Defaults Endpoint

As an employee,
I want the API to suggest my most recent project and today's date,
so that I can create a WorkLog by typing only the content.

**Acceptance Criteria:**

**Given** I am authenticated as an employee and have created WorkLogs before
**When** I send `GET /work-logs/defaults`
**Then** returns `{ suggestedProjectId, suggestedProjectName, todayDate }`
**And** `suggestedProjectId` is from my most recent WorkLog's project
**And** no previous WorkLogs → `suggestedProjectId` is null
**And** `todayDate` in ISO 8601 format
**And** endpoint protected by `JwtAuthGuard` (UX-DR4)

### Story 3.6: Calendar View API

As an employee,
I want to see my work entries on a calendar layout,
so that I can quickly spot days I forgot to log.

**Acceptance Criteria:**

**Given** I am authenticated as an employee
**When** I send `GET /work-logs/calendar?month=5&year=2026`
**Then** returns array of day objects for entire month: `{ date, isBusinessDay, hasWorkLog, workLogId, isEditable, editWindowClosesAt }` (UX-DR5)
**And** `isBusinessDay: false` for weekends and Vietnamese holidays
**And** `isEditable` distinguishes editable gaps from locked gaps for frontend color-coding
**And** only my own WorkLogs shown (C-7)

### Story 3.7: Summary View API

As an employee,
I want a quick overview of my work activity for a period,
so that I know my completion rate and which days I can still fill.

**Acceptance Criteria:**

**Given** I am authenticated as an employee
**When** I send `GET /work-logs/summary?month=5&year=2026`
**Then** returns `{ period, totalBusinessDays, loggedDays, completionRate, editableGaps, projectBreakdown }` (UX-DR6)
**And** `completionRate` = loggedDays / totalBusinessDays
**And** `editableGaps` lists dates still within 3-day window with no WorkLog
**And** only my own data (C-7)

### Story 3.8: Monthly Report API

As an employee or manager,
I want to view a monthly report table with filters,
so that I can review all work entries for a given period.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I send `GET /reports/monthly?month=5&year=2026&employeeId=abc&projectId=xyz`
**Then** returns paginated report `{ data: [WorkLog DTO with comments], total, page, totalPages }`
**And** each entry includes: date, projectName, content, comments (manager name + content)
**And** sorted by `executionDate asc`
**And** as employee: `employeeId` forced to my own, can filter by `projectId`
**And** as manager: can filter by both, or no filter = all employees (UX-DR10)
**And** month/year required — missing returns `400`
**And** empty result returns `{ data: [], total: 0 }` (UX-DR9)
**And** report renders <2 seconds for 500 WorkLogs (NFR-2)

### Story 3.9: Excel Export

As an employee or manager,
I want to export the monthly report as an Excel file with one click,
so that I can submit or archive the report.

**Acceptance Criteria:**

**Given** I am viewing a monthly report with filters applied
**When** I send `GET /reports/monthly/export?month=5&year=2026&employeeId=abc&projectId=xyz`
**Then** returns `.xlsx` binary with correct Content-Type and Content-Disposition headers
**And** filename: `BaoCao_Thang{MM}_{YYYY}_{EmployeeName}.xlsx`
**And** Excel columns: STT | TÊN SP/DỰ ÁN | THỜI GIAN (TUẦN) | KẾ HOẠCH | THỰC HIỆN | KẾT QUẢ % | Ý KIẾN | GHI CHÚ
**And** styling: green header (#C6E0B4), Times New Roman, thin borders, wrap text, grouped by project+week
**And** same filters as report view applied
**And** empty data → Excel with header row only
**And** export completes <5 seconds (NFR-2)
**And** uses `exceljs` library

## Epic 4: Phản hồi Quản lý & Hệ thống Thông báo

Quản lý nhận xét trên WorkLog. Hệ thống thông báo chủ động với 8 loại (cron + event-triggered). Người dùng tùy chỉnh kênh nhận.

### Story 4.1: Comment Module — Entity, Value Objects & Schema

As a developer,
I want to create CommentModule with domain entity and Drizzle schema,
so that comments can be persisted as manager feedback on WorkLogs.

**Acceptance Criteria:**

**Given** WorkLogModule exists from Epic 3
**When** CommentModule is created with Comment entity (id, workLogId, authorId, content), value object (CommentId), domain events (Created, Updated, Deleted), repository interface, and Drizzle schema
**Then** Comment entity has `create()`, `reconstitute()`, `updateContent()` methods
**And** `commentsTable` schema matches Architecture with relations to workLogs and users
**And** CommentModule imports WorkLogModule and UserModule
**And** schema registered in shared schema registry

### Story 4.2: Comment CRUD — API Endpoints

As a manager,
I want to create, update, and delete comments on WorkLog entries,
so that I can give contextual feedback to employees.

**Acceptance Criteria:**

**Given** CommentModule with entity and repository, and a WorkLog exists
**When** I send `POST /work-logs/:workLogId/comments` with `{ content: "Kết quả test thế nào?" }`
**Then** comment created, returns 201 + full Comment DTO with `authorName` (UX-DR11)
**And** `PUT /comments/:id` updates comment — only the author (manager) can edit
**And** `DELETE /comments/:id` soft-deletes — only the author can delete
**And** all endpoints protected by `@Roles('manager')` — employee returns `403`
**And** commenting on non-existent WorkLog → `404 WORKLOG_NOT_FOUND`
**And** CommentCreatedEvent emitted for notification consumers
**And** comments appear in monthly report response (nested in WorkLog DTO)

### Story 4.3: Notification Module — Entities, Value Objects & Schema

As a developer,
I want to create NotificationModule with entities, value objects, and schemas,
so that notifications can be stored and preferences managed.

**Acceptance Criteria:**

**Given** all previous modules exist
**When** NotificationModule is created with Notification entity (id, userId, type, title, content, actionLink, isRead), NotificationPreference entity (id, userId, type, channel, enabled), value objects (NotificationType with 8 types, NotificationChannel), domain events, repositories, and Drizzle schemas (`notificationsTable`, `notificationPreferencesTable`)
**Then** NotificationType enum matches all 8 types from PRD FR-07
**And** schemas registered in shared schema registry
**And** NotificationModule imports UserModule, WorkLogModule, ProjectModule

### Story 4.4: Notification CRUD & Preferences API

As any authenticated user,
I want to view and manage my notifications and preferences,
so that I control what notifications I receive and how.

**Acceptance Criteria:**

**Given** NotificationModule with entities and repositories
**When** I send `GET /notifications`
**Then** returns paginated list of my notifications `{ data, total, page, totalPages }` sorted by `createdAt desc`
**And** each notification includes `type`, `title`, `content`, `actionLink`, `isRead`, `createdAt`
**And** `PUT /notifications/:id/read` marks single notification as read
**And** `PUT /notifications/read-all` marks all as read
**And** `GET /notifications/preferences` returns my preferences per type
**And** `PUT /notifications/preferences` with `{ preferences: [{ type, channel, enabled }] }` updates preferences (UX-DR8)
**And** all endpoints auto-filter by `currentUser.id`
**And** defaults: all types in_app enabled, N-1/N-3/N-5/N-7 email enabled

### Story 4.5: Event-Triggered Notifications (N-7)

As a manager,
I want employees to receive a notification immediately when I comment on their WorkLog,
so that feedback reaches them without delay.

**Acceptance Criteria:**

**Given** NotificationModule and CommentModule are active
**When** a manager creates a comment on a WorkLog (Story 4.2)
**Then** `CommentCreatedEvent` handled by `OnCommentCreatedHandler` in NotificationModule
**And** notification created for the WorkLog's employee: type `comment_received`, title "{managerName} đã nhận xét về công việc của bạn", actionLink to the WorkLog
**And** delivered via in-app (always) + email (if preference enabled)
**And** email includes `managerName` and `workLogDate` — personal, not robotic
**And** handler uses `@EventsHandler` — decoupled from CommentModule (Architecture AD-7)

### Story 4.6: Cron-Based Daily Reminders (N-1, N-2)

As an employee,
I want to receive a reminder at 5:30 PM if I haven't logged work today,
so that I don't forget to record my daily activity.

**Acceptance Criteria:**

**Given** NotificationModule with `@nestjs/schedule` infrastructure
**When** cron fires at 5:30 PM on business days
**Then** N-1: for each employee with no WorkLog today → notification type `daily_work_log_reminder` with actionLink to create WorkLog
**And** N-2: for each WorkLog with 1 business day before edit window expiry → notification type `edit_window_closing` with actionLink to the WorkLog
**And** each type fires max once per user per day (anti-spam)
**And** respects preferences — skipped if `enabled: false`
**And** only fires on business days

### Story 4.7: Cron-Based Manager Alerts & Weekly Summary (N-3, N-4, N-5, N-6)

As a manager,
I want proactive alerts when employees miss logging days, plus weekly summaries,
so that I can intervene early and review team activity.

**Acceptance Criteria:**

**Given** NotificationModule with scheduler infrastructure
**When** cron jobs fire at scheduled times:
**Then** N-3 (5:00 PM Friday): weekly email to each employee — type `weekly_summary`, content with logged days / total, new comments, remaining gaps
**And** N-4 (daily): alert manager when employee has 0 WorkLogs for 2 consecutive business days — type `manager_no_activity_alert`
**And** N-5 (first business day of month): remind managers report is ready — type `monthly_report_ready` with actionLink
**And** N-6 (daily): alert manager when project has 0 WorkLogs after 2 calendar days — type `project_no_tasks`
**And** all notifications respect preferences and anti-spam rules (max 1/type/user/day)
