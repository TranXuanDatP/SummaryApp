# Kế hoạch Triển khai — Dự án Summary

> Tổng hợp toàn bộ kế hoạch implement từ các phiên làm việc. Mỗi section là 1 plan độc lập.

---

## Mục lục

1. [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Sửa Mã Lỗi + Xóa Repository delete()](#2-sửa-mã-lỗi--xóa-repository-delete)
3. [Trạng thái Work Log "Hoàn thành"](#3-trạng-thái-work-log-hoàn-thành)
4. [Thao tác Xóa của Manager](#4-thao-tác-xóa-của-manager)
5. [Giao diện Frontend](#5-giao-diện-frontend)
6. [Hệ thống Ghi log](#6-hệ-thống-ghi-log)
7. [API Quản lý Chi tiêu Cá nhân (Dự án riêng)](#7-api-quản-lý-chi-tiêu-cá-nhân)

---

## 1. Tổng quan Kiến trúc

### Kiến trúc Tổng thể

```
Request → Middleware → Guard → Controller → CommandHandler → Entity → Repository → DB
                                                                              ↓
                                                                    DomainEvent → EventBus → Projection → ReadModel
                                                                                              ↓
                                                                                    OutboxTable → OutboxProcessor
```

### Phân tầng (Kiến trúc Tầng)

Mỗi module (auth, user, project, work-log) đều tuân theo 3 tầng:

```
src/modules/work-log/
├── domain/                    ← TẦNG DOMAIN (Pure TypeScript, 0 dependency)
│   ├── entities/              ← Entity: WorkLog (Aggregate Root)
│   ├── value-objects/         ← Value Objects: WorkLogId, ExecutionDate
│   ├── events/                ← Domain Events: WorkLogCreated, WorkLogUpdated...
│   ├── services/              ← Domain Services: IBusinessDayCalculator interface
│   ├── specifications/        ← Specification: WithinEditWindowSpecification
│   └── repositories/          ← Interface: IWorkLogRepository (chỉ interface)
│
├── application/               ← TẦNG APPLICATION (Use Cases, CQRS)
│   ├── commands/              ← Command: CreateWorkLogCommand
│   │   └── handlers/          ← Handler: CreateWorkLogHandler (chứa logic use case)
│   ├── queries/               ← Query: GetWorkLogsQuery
│   │   ├── handlers/          ← Handler: GetWorkLogsHandler
│   │   └── ports/             ← Port: IWorkLogReadDao (interface cho read side)
│   └── dtos/                  ← DTO: WorkLogDto, CreateWorkLogDto
│
└── infrastructure/            ← TẦNG INFRASTRUCTURE (Framework, DB, HTTP)
    ├── http/                  ← Controller: WorkLogController (route handlers)
    ├── persistence/
    │   ├── drizzle/schema/    ← Drizzle schema: workLogsTable
    │   ├── write/             ← Repository: WorkLogRepository (extends BaseAggregateRepository)
    │   └── read/              ← Read DAO: WorkLogReadDao (query builder)
    ├── services/              ← Service: BusinessDayCalculatorService, ExcelExportService
    └── projections/           ← Projection: WorkLogReadModelProjection
```

### CQRS — Tách Read/Write

```
                        COMMAND (Write)                          QUERY (Read)
                    ┌─────────────────┐                    ┌─────────────────┐
                    │  POST /work-logs │                    │ GET /work-logs   │
                    └────────┬────────┘                    └────────┬────────┘
                             │                                      │
                    ┌────────▼────────┐                    ┌────────▼────────┐
                    │  CommandHandler  │                    │  QueryHandler   │
                    │  (use case logic)│                    │  (read logic)   │
                    └────────┬────────┘                    └────────┬────────┘
                             │                                      │
                    ┌────────▼────────┐                    ┌────────▼────────┐
                    │  WorkLog Entity  │                    │  WorkLogReadDao  │
                    │  (Domain Rules)  │                    │  (JOIN queries)  │
                    └────────┬────────┘                    └────────┬────────┘
                             │                                      │
                    ┌────────▼────────┐                    ┌────────▼────────┐
                    │  WriteRepo       │                    │  DB (Read-only)  │
                    │  (INSERT/UPDATE) │                    │  SELECT + JOIN   │
                    └────────┬────────┘                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Domain Events   │
                    │  → EventBus      │────→ Projection ──→ Cập nhật Read Model
                    │  → Outbox Table  │
                    └─────────────────┘
```

- **Write side**: Command → Handler → Entity (kiểm tra business rules) → Repository (persist) → Events
- **Read side**: Query → Handler → Read DAO (truy vấn trực tiếp DB, JOIN tables) → DTO

### Vòng đời một Request (Ví dụ: Tạo WorkLog)

```
1. HTTP Request
   POST /work-logs { content, projectId }
   Authorization: Bearer <JWT>

2. CorrelationIdMiddleware
   → Gắn correlationId vào request context (distributed tracing)

3. JwtAuthGuard (Global)
   → Giải mã JWT → gắn { userId, email, role } vào request

4. RolesGuard (Global)
   → Kiểm tra role (nếu có @Roles decorator)

5. WorkLogController.create()
   → Tạo CreateWorkLogCommand
   → Gửi vào CommandBus

6. CommandBus → CreateWorkLogHandler.execute()
   → Resolve defaults (projectId, executionDate)
   → Duplicate check qua ReadDAO
   → WorkLog.create() — Entity validate (3-day rule, future date...)
   → Repository.save(entity)
       → incrementVersion()
       → persist() — INSERT vào DB với optimistic concurrency
       → publishEvents() — EventBus phát events
       → clearDomainEvents()

7. Event → WorkLogReadModelProjection
   → Cập nhật read model (projection)

8. Event → OutboxProcessor
   → Ghi event vào outbox table (đảm bảo eventual consistency)

9. Controller trả về WorkLogDto
   → ResponseInterceptor format { success, statusCode, data }
```

### Domain Model — Quy tắc Nghiệp vụ

#### Quy tắc Khóa 3 Ngày (Logic Nghiệp vụ Cốt lõi)
```
WorkLog sau 3 ngày làm việc (business days) sẽ bị khóa:
- Employee KHÔNG thể sửa/xóa
- Manager CÓ THỂ unlock (với lý do bắt buộc)
- Sau khi unlock + employee sửa → tự động lock lại

BusinessDayCalculator:
- Loại trừ cuối tuần (T7, CN)
- Loại trừ ngày lễ Việt Nam 2026
```

#### Vòng đời Entity
```
WorkLog.create()          → status: active, isUnlocked: false
WorkLog.updateContent()   → chỉ trong 3-day window hoặc unlocked
WorkLog.delete()          → soft delete (_deletedAt), chỉ trong 3-day window
WorkLog.unlock()          → isUnlocked: true + audit trail (manager, reason, time)
WorkLog.lock()            → auto-lock sau employee save trên unlocked WorkLog
```

#### Mã Lỗi (Enum DomainErrorCode)
```
WORKLOG_LOCKED              → 422 — WorkLog đã bị khóa
WORKLOG_FUTURE_DATE         → 422 — Không được ghi cho ngày tương lai
WORKLOG_LOOKBACK_EXCEEDED   → 422 — Quá 3 ngày làm việc
WORKLOG_ALREADY_DELETED     → 422 — WorkLog đã bị xóa
WORKLOG_DUPLICATE           → 409 — Trùng project + employee + date
WORKLOG_NOT_FOUND           → 404 — Không tìm thấy (hoặc sai employee)
```

### Kiểm soát Đồng thời Optimistic

```
Entity.version = 0 (khi tạo mới, chưa save)
    ↓
Repository.save():
    1. expectedVersion = aggregate.version (0)
    2. aggregate.incrementVersion() → version = 1
    3. INSERT INTO ... VALUES (version = 1)
    ↓
Entity.version = 1 (trong memory, sau save)
    ↓
Lần update tiếp:
    1. Repository.getById() → reconstitute với version = 1
    2. entity.updateContent() → markAsDirty() (chỉ update updatedAt)
    3. save(): expectedVersion = 1, incrementVersion() → version = 2
    4. UPDATE ... SET version = 2 WHERE id = ? AND version = 1
    5. Nếu rowCount = 0 → ConcurrencyException (ai đó đã sửa trước)
```

### Thư viện Dùng chung

```
src/libs/
├── core/                          ← Core abstractions (pure TS)
│   ├── domain/                    ← AggregateRoot, DomainException, DomainErrorCode, ValueObject, Specification
│   ├── application/               ← ICommand, IQuery, IEventHandler interfaces
│   ├── common/                    ← Exceptions: NotFound, Conflict, BusinessRule, Concurrency
│   ├── infrastructure/            ← EventBus, Outbox, UnitOfWork implementations
│   └── constants/                 ← DI tokens
│
└── shared/                        ← NestJS-integrated shared modules
    ├── cqrs/                      ← CommandBus, QueryBus, @CommandHandler, @QueryHandler
    ├── database/                  ← DrizzleDB, BaseAggregateRepository, BaseReadDao, Schema Registry
    ├── http/                      ← GlobalExceptionFilter, ResponseInterceptor, ValidationPipe
    ├── logging/                   ← Pino logger + Audit log module
    ├── context/                   ← Request context, Correlation ID
    └── health/                    ← Health check
```

### Schema Cơ sở dữ liệu

```
users               projects            work_logs           outbox
─────────────       ─────────────       ─────────────       ─────────────
id (PK)             id (PK)             id (PK)             id (PK)
email (UNIQUE)      name                project_id (FK)     aggregate_id
password            description         employee_id (FK)    aggregate_type
full_name           status              execution_date      event_type
role                version             content             payload
is_active           is_deleted          is_unlocked         status
version             deleted_at          unlocked_by         created_at
is_deleted          created_at          unlocked_at         processed_at
deleted_at          updated_at          unlock_reason       retry_count
created_at                              version             last_error
updated_at                              is_deleted
                                        status              audit_logs
                                        deleted_at          ─────────────
                                        created_at          id (PK)
                                        updated_at          user_id
                                                            action
refresh_tokens                              resource_type
─────────────                               resource_id
id (PK)                                     correlation_id
user_id (FK)                                ip_address
token_hash (UNIQUE)                         payload (JSONB)
expires_at                                  result (JSONB)
is_revoked                                  status_code
created_at                                  created_at

comments
─────────────
id (PK)
work_log_id (FK)
author_id (FK)
content
version
is_deleted
deleted_at
created_at
updated_at
```

### Quy trình Phát triển Chuẩn

```bash
# 1. Khởi động infrastructure
docker-compose up -d                          # Postgres + Redis

# 2. Schema migration
npm run db:generate                           # Sinh migration SQL từ code
npm run db:migrate                            # Apply lên DB

# 3. Build
npm run build                                 # TypeScript → JavaScript

# 4. Seed (tạo user ban đầu)
npm run seed:user:prod -- -e "..." -p "..." -n "..." -r manager

# 5. Chạy server
npm run start:dev                             # Dev mode (auto-reload)

# 6. Test
npm run test                                  # Unit tests

# 7. API docs
http://localhost:3000/api/docs                # Swagger UI
```

---

## 2. Sửa Mã Lỗi + Xóa Repository delete()

### Context

Hai vấn đề deferred từ code review:
1. **Fragile DomainException message matching** — Các handler bắt lỗi bằng `.includes('locked')`, `.includes('future')`... Nếu ai sửa message text, logic bắt lỗi sẽ sụp đổ.
2. **Repository `delete()` bypasses domain logic** — `WorkLogRepository.delete(id)` làm soft-delete trực tiếp ở DB mà không thông qua Aggregate Root, bỏ qua 3-day lock check, không emit WorkLogDeletedEvent.

### Vấn đề 1: Mã Lỗi cho DomainException

**Approach:** Tạo `DomainErrorCode` enum trong domain layer, thêm code vào mỗi `throw new DomainException()`.

**Files tạo mới:**
- `src/libs/core/domain/exceptions/domain-error-code.ts` — enum chứa tất cả error codes

**Files sửa — Tầng domain thêm mã lỗi:**
- `src/libs/core/domain/exceptions/index.ts` — export DomainErrorCode
- `src/libs/core/domain/index.ts` — re-export DomainErrorCode
- `src/modules/work-log/domain/entities/work-log.entity.ts`
- `src/modules/work-log/domain/value-objects/execution-date.value-object.ts`
- `src/modules/work-log/domain/value-objects/work-log-id.value-object.ts`
- `src/modules/project/domain/entities/project.entity.ts`
- `src/modules/project/domain/value-objects/project-id.value-object.ts`
- `src/modules/project/domain/value-objects/project-status.value-object.ts`

**Files sửa — Tầng application đổi sang so khớp mã lỗi:**
- `src/modules/work-log/application/commands/handlers/create-work-log.handler.ts`
- `src/modules/work-log/application/commands/handlers/update-work-log.handler.ts`
- `src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts`
- `src/modules/work-log/application/commands/handlers/unlock-work-log.handler.ts`

### Vấn đề 2: Repository delete() Bỏ qua Domain Logic

**Approach:** Xóa `delete()` khỏi interface vì vi phạm DDD — repository không nên có method thay đổi state aggregate mà không qua domain logic. Không ai gọi `repository.delete(id)` — tất cả handler đều dùng `workLog.delete()` + `repository.save()`. Dead code.

**Files sửa:**
- `src/libs/core/domain/repositories/aggregate-repository.interface.ts` — remove `delete(id)`
- `src/libs/core/infrastructure/persistence/write/aggregate-repository.ts` — remove abstract `delete()`
- `src/modules/work-log/infrastructure/persistence/write/work-log.repository.ts` — remove `delete()` method
- `src/modules/project/infrastructure/persistence/write/project.repository.ts` — remove `delete()` method

### Trạng thái: **HOÀN THÀNH**

---

## 3. Trạng thái Work Log "Hoàn thành"

### Context

Employee cần đánh dấu work log hoàn thành. Thêm `status: 'in_progress' | 'done'` để employee tự quản lý tiến độ. Chỉ employee tạo log mới được chuyển status.

### Thay đổi

#### Schema CSDL
Thêm vào `workLogsTable`:
```typescript
status: varchar('status', { length: 20 }).notNull().default('in_progress'),
```

#### Entity Domain
- `WorkLogProps` thêm `status: string`
- Default = `'in_progress'` khi create
- Method `markDone(metadata?)` — set `status = 'done'`, emit `WorkLogStatusChangedEvent`
- Method `reopen(metadata?)` — set `status = 'in_progress'`
- Validate: chỉ `'in_progress'` | `'done'`

#### Endpoint API
```
PATCH /work-logs/:id/status
Body: { status: 'done' | 'in_progress' }
```
- Employee only — check `user.userId === workLog.employeeId`
- Must be within edit window or unlocked

#### Giao diện
- `WorkLogDto` thêm `status: string`
- Column Status hiển thị: Tag xanh "Done" / Tag blue "In Progress"
- Nút action: "Mark Done" / "Reopen"

| File | Hành động |
|------|-----------|
| `work-log.schema.ts` | Thêm cột `status varchar default 'in_progress'` |
| `work-log.entity.ts` | Thêm `status` prop + `markDone()` + `reopen()` |
| `work-log.dto.ts` | Thêm field `status` |
| `work-log.repository.ts` | Map `status` trong toPersistence/toDomain |
| `work-log-read-dao.ts` | Include `status` trong mapToDto |
| `update-work-log-status.command.ts` | **MỚI** |
| `update-work-log-status.handler.ts` | **MỚI** |
| `work-log.controller.ts` | Thêm `PATCH /work-logs/:id/status` |

### Trạng thái: **HOÀN THÀNH**

---

## 4. Thao tác Xóa của Manager

### Context

Thêm 3 tính năng xóa cho manager:
1. Xóa user (soft delete) — chỉ manager
2. Xóa project (soft delete + cascade work logs) — chỉ manager
3. Manager xóa work log của employee khác (bypass ownership + locked check)

### 1. Xóa Người dùng (Chỉ Manager)

```
DeleteUserCommand(id)
→ DeleteUserHandler
  → userRepository.getById(id) → 404 if null
  → user.delete() (soft delete)
  → userRepository.save(user)
  → return { deleted: true, id }
```

**Files tạo mới:**
- `src/modules/user/application/commands/delete-user.command.ts`
- `src/modules/user/application/commands/handlers/delete-user.handler.ts`
- `src/modules/user/application/commands/handlers/delete-user.handler.spec.ts`

**Files sửa:**
- `src/modules/user/infrastructure/http/user.controller.ts` — thêm `@Delete(':id')` với `@Roles('manager')`

### 2. Xóa Dự án (Chỉ Manager, cascade work logs)

```
DeleteProjectCommand(id, deletedBy)
→ DeleteProjectHandler
  → projectRepository.getById(id) → 404 if null
  → project.delete()
  → projectRepository.save(project)
  → workLogRepository.findByProjectId(id) → soft delete từng work log
  → return { deleted: true, id, workLogsDeleted: count }
```

**Files tạo mới:**
- `src/modules/project/application/commands/delete-project.command.ts`
- `src/modules/project/application/commands/handlers/delete-project.handler.ts`

**Files sửa:**
- `src/modules/project/infrastructure/http/project.controller.ts` — thêm `@Delete(':id')`
- `src/modules/work-log/domain/repositories/` — thêm `findByProjectId(projectId)`

### 3. Manager Xóa Work Log (bypass quyền sở hữu + khóa)

```
if (user.role === 'manager') {
  // Bypass ownership check
  // Bypass locked check — gọi workLog.forceDelete()
} else {
  // Giữ nguyên logic cũ (ownership + locked check)
}
```

**Files sửa:**
- `src/modules/work-log/domain/entities/work-log.entity.ts` — thêm `forceDelete()` method
- `src/modules/work-log/application/commands/delete-work-log.command.ts` — thêm `userRole` field
- `src/modules/work-log/application/commands/handlers/delete-work-log.handler.ts` — thêm branch cho manager

### Tổng hợp Endpoint

| Method | Path | Role | Response |
|--------|------|------|----------|
| `DELETE` | `/users/:id` | manager | `{ deleted: true, id }` |
| `DELETE` | `/projects/:id` | manager | `{ deleted: true, id, workLogsDeleted: number }` |
| `DELETE` | `/work-logs/:id` | employee/manager | `{ deleted: true, id }` |

### Trạng thái: **HOÀN THÀNH**

---

## 5. Giao diện Frontend

### Context

Backend NestJS đã hoàn thiện 34 endpoints qua 6 modules. Cần frontend để test trực quan.

### Quyết định Kỹ thuật

- **Vị trí**: `f:\Workspace\summary-ui` (folder riêng)
- **Framework**: React 18 + Vite + TypeScript
- **UI Library**: Ant Design 5
- **Routing**: React Router v6
- **HTTP Client**: Axios (interceptor tự gắn JWT)
- **State**: React Context (auth state) + local state

### Cấu trúc Dự án

```
summary-ui/
├── src/
│   ├── main.tsx
│   ├── App.tsx             ← Router + AuthProvider
│   ├── api/
│   │   ├── client.ts       ← Axios instance, interceptor JWT, refresh token
│   │   ├── auth.ts         ← login, refresh, logout
│   │   ├── user.ts         ← CRUD users
│   │   ├── project.ts      ← CRUD projects, search, merge
│   │   ├── worklog.ts      ← CRUD work-logs, calendar, summary, unlock
│   │   ├── comment.ts      ← CRUD comments
│   │   ├── notification.ts ← list, markRead, preferences
│   │   └── report.ts       ← monthly, export Excel
│   ├── contexts/
│   │   └── AuthContext.tsx  ← login/logout, store token
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── WorkLogsPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── CommentsPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   └── ReportsPage.tsx
│   └── components/
│       ├── AppLayout.tsx   ← Sidebar menu + header
│       └── PrivateRoute.tsx
```

### Trang & Tính năng

| Page | Features |
|------|----------|
| **LoginPage** | Form email + password, gọi `POST /auth/login`, lưu JWT |
| **DashboardPage** | Thống kê nhanh, quick links |
| **UsersPage** | Table + Create modal + Deactivate |
| **ProjectsPage** | Table + search + CRUD + Merge |
| **WorkLogsPage** | Table + filter + CRUD + Unlock + Status toggle |
| **CalendarPage** | Calendar component, click ngày → tạo/sửa work log |
| **CommentsPage** | List + create/edit/delete (manager only) |
| **NotificationsPage** | List + mark read + preferences |
| **ReportsPage** | Bảng báo cáo + Export Excel download |

### Thiết kế API Client

```
src/api/client.ts:
- baseURL: '/api' (proxy → localhost:3000)
- Request interceptor: gắn Authorization: Bearer <token>
- Response interceptor:
  - Wrap response.data
  - 401 → thử refresh token → retry 1 lần
  - Refresh fail → logout, redirect /login
```

### Thứ tự Triển khai

1. **Phase 1**: Setup + Auth (Vite, Axios, AuthContext, LoginPage, AppLayout)
2. **Phase 2**: Core CRUD (Users, Projects, WorkLogs)
3. **Phase 3**: Views (Calendar, Comments, Reports)
4. **Phase 4**: Notifications + Dashboard

### Trạng thái: **ĐÃ LÊN KẾ HOẠCH**

---

## 6. Hệ thống Ghi log

### Context

Project chỉ có console logging cơ bản qua `nestjs-pino`. Cần 3 nâng cấp:
1. **File-based logging** với daily rotation
2. **Request/response logging** chi tiết ra file
3. **Business audit log** — ghi lại ai làm gì, lúc nào, trên tài nguyên nào

### Phần 1: Ghi log ra File

**Cài đặt:** `npm install pino-roll`

**Cấu hình `.env`:**
```
LOG_DIR=logs
ENABLE_FILE_LOGGING=true
ENABLE_PRETTY_LOGGING=true
```

**File sửa:** `src/libs/shared/logging/logging.module.ts`
- Console: `pino-pretty` (dev only)
- File: `logs/app-YYYY-MM-DD.log` (all levels, daily rotation via `pino-roll`)
- File: `logs/error-YYYY-MM-DD.log` (error level only)
- Log request body cho POST/PUT/PATCH/DELETE (redacted sensitive fields)

### Phần 2: Ghi log Request/Response

Pino-http serializers enhanced:
- Include request body for mutating methods
- Redact `password`, `token`, `refreshToken`, etc.
- Log response time (ms)

### Phần 3: Audit log Nghiệp vụ

**Schema CSDL:**
```sql
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(50),
  userEmail VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resourceType VARCHAR(100) NOT NULL,
  resourceId VARCHAR(50),
  correlationId VARCHAR(36),
  ipAddress VARCHAR(45),
  userAgent TEXT,
  payload JSONB,
  result JSONB,
  statusCode INTEGER,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Files tạo mới:**
| File | Mô tả |
|------|-------|
| `src/libs/shared/logging/audit/drizzle/schema/audit-log.schema.ts` | Drizzle schema |
| `src/libs/shared/logging/audit/audit-log.service.ts` | DB write service |
| `src/libs/shared/logging/audit/audit-log.interceptor.ts` | Auto-capture interceptor + `@AuditLog` decorator |
| `src/libs/shared/logging/audit/audit-log.module.ts` | NestJS module |
| `src/libs/shared/logging/audit/index.ts` | Exports |

**Files sửa:**
| File | Thay đổi |
|------|----------|
| `src/libs/shared/logging/logging.module.ts` | File transport |
| `src/libs/shared/logging/index.ts` | Export audit |
| `src/libs/shared/database/drizzle/schema/index.ts` | Add auditLogsTable |
| `drizzle.config.ts` | Add audit schema path |
| `src/app.module.ts` | Register AuditLogModule + global interceptor |
| 6 controllers (auth, user, project, work-log, comment, notification) | Add `@AuditLog()` decorator |

**Endpoints đã gắn `@AuditLog()`:**

| Module | Actions |
|--------|---------|
| Auth | login, refresh, logout |
| User | create, deactivate, delete |
| Project | create, update, merge, delete |
| WorkLog | create, update, delete, update-status, unlock |
| Comment | create, update, delete |
| Notification | read-all, read, update-preferences |

### Trạng thái: **HOÀN THÀNH**

---

## 7. API Quản lý Chi tiêu Cá nhân

> **Ghi chú:** Đây là kế hoạch cho dự án riêng (`personal-expense-api`), không thuộc dự án Summary.

### Context

Tạo NestJS mới tái sử dụng DDD + CQRS từ `nestjs-project-example`. Scope: Auth (Register/Login), Quản lý Chi tiêu (Create Expense, Get Monthly Stats).

### Approach

Clone core/shared libs, bỏ product/order modules, thêm `auth` + `expense` modules.

### Module Xác thực

| Tầng | Files |
|-------|-------|
| Domain | `User` entity, `Email`/`Password` VOs, `IUserRepository` |
| Application | `RegisterUserCommand`, `LoginQuery`, handlers |
| Infrastructure | `AuthController` (POST /auth/register, POST /auth/login), Drizzle schema, JWT |

### Module Chi tiêu

| Tầng | Files |
|-------|-------|
| Domain | `Expense` entity, `ExpenseCategory`/`Money` VOs, `IExpenseRepository` |
| Application | `CreateExpenseCommand`, `GetMonthlyExpensesQuery`, handlers |
| Infrastructure | `ExpenseController` (POST /expenses, GET /expenses/monthly), Drizzle schema, projection |

### Thư viện cần thêm

```json
{
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/passport": "^11.0.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcryptjs": "^2.4.3"
}
```

### Trạng thái: **ĐÃ LÊN KẾ HOẠCH**
