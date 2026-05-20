# Tổng quan Architecture — NestJS DDD/CQRS Task Management

## 1. Kiến trúc tổng thể

```
Request → Middleware → Guard → Controller → CommandHandler → Entity → Repository → DB
                                                                              ↓
                                                                    DomainEvent → EventBus → Projection → ReadModel
                                                                                              ↓
                                                                                    OutboxTable → OutboxProcessor
```

## 2. Phân tầng (Layered Architecture)

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

## 3. CQRS — Tách Read/Write

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

## 4. Vòng đời một Request (ví dụ: Tạo WorkLog)

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

## 5. Domain Model — Business Rules

### 3-Day Lock Rule (Core Business Logic)
```
WorkLog sau 3 ngày làm việc (business days) sẽ bị khóa:
- Employee KHÔNG thể sửa/xóa
- Manager CÓ THỂ unlock (với lý do bắt buộc)
- Sau khi unlock + employee sửa → tự động lock lại

BusinessDayCalculator:
- Loại trừ cuối tuần (T7, CN)
- Loại trừ ngày lễ Việt Nam 2026
```

### Entity Lifecycle
```
WorkLog.create()          → status: active, isUnlocked: false
WorkLog.updateContent()   → chỉ trong 3-day window hoặc unlocked
WorkLog.delete()          → soft delete (_deletedAt), chỉ trong 3-day window
WorkLog.unlock()          → isUnlocked: true + audit trail (manager, reason, time)
WorkLog.lock()            → auto-lock sau employee save trên unlocked WorkLog
```

### Error Codes (DomainErrorCode enum)
```
WORKLOG_LOCKED              → 422 — WorkLog đã bị khóa
WORKLOG_FUTURE_DATE         → 422 — Không được ghi cho ngày tương lai
WORKLOG_LOOKBACK_EXCEEDED   → 422 — Quá 3 ngày làm việc
WORKLOG_ALREADY_DELETED     → 422 — WorkLog đã bị xóa
WORKLOG_DUPLICATE           → 409 — Trùng project + employee + date
WORKLOG_NOT_FOUND           → 404 — Không tìm thấy (hoặc sai employee - C-7)
```

## 6. Optimistic Concurrency Control

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

## 7. Shared Libraries

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
    ├── security/                  ← JWT service
    ├── logging/                   ← Pino logger
    ├── health/                    ← Health check
    └── observability/             ← Monitoring, tracing
```

## 8. 4 Modules

| Module | Vai trò | API Endpoints |
|--------|---------|---------------|
| **Auth** | Đăng nhập (JWT), Refresh token, Logout | POST /auth/login, /auth/refresh, /auth/logout |
| **User** | Quản lý user, seed CLI | POST /users, GET /users, GET /users/:id |
| **Project** | CRUD project | POST/GET/PUT /projects, POST /projects/:id/merge |
| **WorkLog** | CRUD worklog, 3-day lock, unlock, báo cáo | POST/GET/PUT/DELETE /work-logs, POST /work-logs/:id/unlock, GET /reports/* |

## 9. Database Schema

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
                                        deleted_at
                                        created_at
                                        updated_at

refresh_tokens
─────────────
id (PK)
user_id (FK)
token_hash (UNIQUE)
expires_at
is_revoked
created_at
```

## 10. Quy trình Dev chuẩn

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
node dist/src/main.js                         # HTTP server on port 3000
# hoặc
npm run start:dev                             # Dev mode (auto-reload)

# 6. Test
npm run test                                  # Unit tests (47 suites, 361 tests)

# 7. API docs
http://localhost:3000/api/docs                 # Swagger UI
```
