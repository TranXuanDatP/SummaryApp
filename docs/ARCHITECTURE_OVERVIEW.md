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

## 8. 5 Modules

| Module | Vai trò | API Endpoints |
|--------|---------|---------------|
| **Auth** | Đăng nhập (JWT), Refresh token, Logout | POST /auth/login, /auth/refresh, /auth/logout |
| **User** | Quản lý user, seed CLI | POST /users, GET /users, GET /users/:id, PATCH /users/:id/deactivate |
| **Project** | CRUD project | POST/GET/PUT /projects, GET /projects/search, POST /projects/:id/merge |
| **WorkLog** | CRUD worklog, 3-day lock, unlock, báo cáo | POST/GET/PUT/DELETE /work-logs, POST /work-logs/:id/unlock, GET /work-logs/calendar, /work-logs/summary, /work-logs/defaults, GET /reports/* |
| **Comment** | Manager nhận xét trên work log | POST /work-logs/:workLogId/comments, PUT /comments/:id, DELETE /comments/:id |

---

## 9. Auth Module — Chi tiết

### Cấu trúc thư mục

```
src/modules/auth/
├── domain/
│   ├── value-objects/
│   │   └── token-pair.value-object.ts     ← Value Object: TokenPair { accessToken, refreshToken }
│   ├── services/
│   │   ├── jwt-token.interface.ts          ← Interface: IJwtTokenService (generate/verify)
│   │   └── token-hash.util.ts             ← Utility: SHA-256 hash cho refresh token
│   └── repositories/
│       └── i-refresh-token-repository.interface.ts  ← Interface: IRefreshTokenRepository
│
├── application/
│   ├── commands/
│   │   ├── login.command.ts                ← LoginCommand { email, password }
│   │   ├── refresh-token.command.ts        ← RefreshTokenCommand { refreshToken }
│   │   ├── logout.command.ts               ← LogoutCommand { refreshToken }
│   │   └── handlers/
│   │       ├── login.handler.ts            ← Validate credentials → generate token pair
│   │       ├── refresh-token.handler.ts    ← Verify refresh token → rotate token pair
│   │       └── logout.handler.ts           ← Revoke refresh token
│   ├── queries/ports/
│   │   └── i-token-read-dao.interface.ts   ← Interface: ITokenReadDao
│   └── dtos/
│       ├── login-request.dto.ts            ← { email, password }
│       ├── login-response.dto.ts           ← { accessToken, refreshToken }
│       ├── refresh-token-request.dto.ts    ← { refreshToken }
│       └── refresh-token-response.dto.ts   ← { accessToken, refreshToken }
│
└── infrastructure/
    ├── http/
    │   ├── auth.controller.ts              ← 3 endpoints: login, refresh, logout
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts           ← Global guard: verify JWT, skip nếu @Public()
    │   │   └── roles.guard.ts              ← Global guard: check role từ @Roles()
    │   ├── strategies/
    │   │   └── jwt.strategy.ts             ← Passport JWT: extract Bearer token → { userId, email, role }
    │   └── decorators/
    │       ├── public.decorator.ts         ← @Public() — skip auth cho endpoint
    │       ├── current-user.decorator.ts   ← @CurrentUser() — extract user từ request
    │       └── roles.decorator.ts          ← @Roles('manager') — require role
    ├── services/
    │   └── jwt-token.service.ts            ← JWT sign (15m TTL) + refresh token (random 64 bytes)
    ├── persistence/
    │   ├── drizzle/schema/
    │   │   └── refresh-token.schema.ts     ← refresh_tokens table
    │   ├── write/
    │   │   └── refresh-token.repository.ts ← INSERT/UPDATE refresh tokens
    │   └── read/
    │       └── token-read-dao.ts           ← Find token by hash
    └── auth.module.ts                      ← Import: UserModule, PassportModule, JwtModule
```

### JWT Authentication Flow

```
                    LOGIN FLOW
                    ──────────
1. POST /auth/login { email, password }
2. LoginHandler:
   a. UserRepository.findByEmail() — tìm user
   b. HashService.compare() — verify password (bcrypt)
   c. User.isActive? — check account không bị disable
   d. JwtTokenService.generateAccessToken({ sub, email, role }) — JWT, TTL 15 phút
   e. JwtTokenService.generateRefreshToken() — random 64 bytes (hex)
   f. SHA-256 hash refresh token → lưu vào refresh_tokens table (TTL 7 ngày)
   g. Return { accessToken, refreshToken }

                    REQUEST AUTH FLOW
                    ─────────────────
1. Request header: Authorization: Bearer <accessToken>
2. JwtAuthGuard (Global):
   a. Check @Public() decorator? → skip nếu có
   b. Passport JwtStrategy:
      - ExtractJwt.fromAuthHeaderAsBearerToken()
      - Verify JWT signature (JWT_SECRET từ .env)
      - Validate payload → attach request.user = { userId, email, role }
   c. Nếu token expired/invalid → UnauthorizedException

                    REFRESH FLOW
                    ────────────
1. POST /auth/refresh { refreshToken }
2. RefreshTokenHandler:
   a. SHA-256 hash refresh token → tìm trong DB
   b. Check: exists? not expired? not revoked?
   c. Generate new token pair (rotation)
   d. Revoke old refresh token
   e. Save new refresh token
   f. Return { accessToken, refreshToken }

                    LOGOUT FLOW
                    ───────────
1. POST /auth/logout { refreshToken } (cần JWT)
2. LogoutHandler:
   a. Hash refresh token → find in DB
   b. Mark is_revoked = true
   c. Return { success: true }
```

### Guards & Decorators

```
@Public()              → Skip JWT auth (dùng cho login, refresh)
@ApiBearerAuth         → Swagger: hiển thị nút Authorize
@Roles('manager')      → Require role cụ thể (chỉ 'manager' hoặc 'employee')
@CurrentUser()         → Inject request.user vào parameter

Global Guard Order (AppModule):
1. JwtAuthGuard  → giải mã JWT, attach user (nếu không @Public)
2. RolesGuard    → kiểm tra role (nếu có @Roles)

RolesGuard cũng check conflict: @Public() + @Roles() trên cùng endpoint
→ throw Error (developer phải sửa)
```

### Token Storage

```
refresh_tokens table:
─────────────────────
id           (PK)
user_id      (FK → users)
token_hash   (SHA-256, UNIQUE)  ← Không lưu raw token, chỉ lưu hash
expires_at   (7 ngày từ lúc tạo)
is_revoked   (true sau logout/refresh rotation)
created_at

Security: refresh token được hash bằng SHA-256 trước khi lưu.
Nếu DB bị leak → attacker không thể dùng token trực tiếp.
```

---

## 10. User Module — Chi tiết

### Cấu trúc thư mục

```
src/modules/user/
├── domain/
│   ├── entities/
│   │   └── user.entity.ts               ← User Aggregate Root
│   ├── value-objects/
│   │   ├── user-id.value-object.ts      ← UserId (UUID validation)
│   │   ├── user-email.value-object.ts   ← UserEmail (RFC email validation)
│   │   └── user-role.value-object.ts    ← UserRole ('employee' | 'manager')
│   ├── events/
│   │   ├── user-created.event.ts        ← UserCreatedEvent
│   │   ├── user-deactivated.event.ts    ← UserDeactivatedEvent
│   │   └── user-reactivated.event.ts    ← UserReactivatedEvent
│   ├── services/
│   │   └── hash.interface.ts            ← Interface: IHashService (hash, compare)
│   └── repositories/
│       └── i-user-repository.interface.ts  ← Interface: IUserRepository
│
├── application/
│   ├── commands/
│   │   ├── create-user.command.ts       ← CreateUserCommand { email, password, fullName, role }
│   │   ├── deactivate-user.command.ts   ← DeactivateUserCommand { id }
│   │   └── handlers/
│   │       ├── create-user.handler.ts   ← Hash password → create entity → persist
│   │       └── deactivate-user.handler.ts
│   ├── queries/
│   │   ├── get-user.query.ts            ← GetUserQuery { id }
│   │   ├── get-user-list.query.ts       ← GetUserListQuery { page, limit }
│   │   ├── handlers/
│   │   │   ├── get-user.handler.ts
│   │   │   └── get-user-list.handler.ts
│   │   └── ports/
│   │       └── i-user-read-dao.interface.ts
│   └── dtos/
│       ├── create-user.dto.ts           ← { email, password, fullName, role }
│       └── user.dto.ts                  ← { id, email, fullName, role, isActive, version, ... }
│
└── infrastructure/
    ├── http/
    │   └── user.controller.ts           ← CRUD endpoints
    ├── persistence/
    │   ├── drizzle/schema/
    │   │   └── user.schema.ts           ← users table (Drizzle ORM)
    │   ├── write/
    │   │   └── user.repository.ts       ← BaseAggregateRepository<User>
    │   └── read/
    │       └── user-read-dao.ts         ← SELECT queries
    ├── services/
    │   └── bcrypt-hash.service.ts       ← bcrypt implementation
    ├── projections/
    │   └── user-read-model.projection.ts
    └── cli/
        └── seed.command.ts              ← nest-commander CLI: npm run seed:user
```

### User Entity — Business Rules

```
User.create(id, { email, password, fullName, role })
  → Validate: fullName không rỗng, maxLength 200
  → Validate: password không rỗng
  → Emit: UserCreatedEvent

User.deactivate()
  → Check: chưa bị soft delete
  → Set: isActive = false
  → Emit: UserDeactivatedEvent

User.reactivate()
  → Check: chưa bị soft delete
  → Set: isActive = true
  → Emit: UserReactivatedEvent

User.changeRole(newRole)
  → Check: chưa bị soft delete
  → Check: role khác hiện tại
  → Update: role = newRole

User.delete()    → soft delete: _deletedAt = new Date()
User.restore()   → undo delete: _deletedAt = null
```

### Value Objects

```
UserId      → validate UUID format
UserEmail   → validate RFC 5322 email format, max 254 chars
UserRole    → enum: 'employee' | 'manager'
```

### Role-based Access Control

```
Role        Permissions
──────────  ──────────────────────────────────────────
employee    - CRUD work-logs của mình (trong 3-day window)
            - Xem calendar, summary của mình
            - Xem defaults

manager     - Tất cả quyền employee
            - Unlock work-logs của bất kỳ employee
            - CRUD comments trên work-logs
            - Xem reports của tất cả employees
            - Merge projects
            - Xem work-logs của tất cả employees
```

---

## 11. Comment Module — Chi tiết

### Cấu trúc thư mục

```
src/modules/comment/
├── domain/
│   ├── entities/
│   │   └── comment.entity.ts             ← Comment Aggregate Root
│   ├── value-objects/
│   │   └── comment-id.value-object.ts    ← CommentId (UUID validation)
│   ├── events/
│   │   ├── comment-created.event.ts      ← CommentCreatedEvent
│   │   ├── comment-updated.event.ts      ← CommentUpdatedEvent
│   │   └── comment-deleted.event.ts      ← CommentDeletedEvent
│   └── repositories/
│       └── i-comment-repository.interface.ts
│
├── application/
│   ├── commands/
│   │   ├── create-comment.command.ts     ← { workLogId, content, authorId }
│   │   ├── update-comment.command.ts     ← { id, content, authorId }
│   │   ├── delete-comment.command.ts     ← { id, authorId }
│   │   └── handlers/
│   │       ├── create-comment.handler.ts
│   │       ├── update-comment.handler.ts
│   │       └── delete-comment.handler.ts
│   ├── queries/ports/
│   │   └── i-comment-read-dao.interface.ts
│   └── dtos/
│       ├── create-comment.dto.ts         ← { content }
│       └── comment.dto.ts                ← { id, workLogId, authorId, authorName, content, ... }
│
└── infrastructure/
    ├── http/
    │   └── comment.controller.ts         ← 2 controllers:
    │         WorkLogCommentController     ← POST /work-logs/:workLogId/comments (nested route)
    │         CommentController           ← PUT /comments/:id, DELETE /comments/:id
    ├── persistence/
    │   ├── drizzle/schema/
    │   │   └── comment.schema.ts         ← comments table
    │   ├── write/
    │   │   └── comment.repository.ts     ← BaseAggregateRepository<Comment>
    │   └── read/
    │       └── comment-read-dao.ts       ← SELECT with JOIN users (authorName)
    └── projections/
        └── comment-read-model.projection.ts
```

### Comment Entity — Business Rules

```
Comment.create(id, { workLogId, authorId, content })
  → Validate: content không rỗng, maxLength 2000
  → Validate: workLogId không rỗng, maxLength 50
  → Validate: authorId không rỗng, maxLength 50
  → Emit: CommentCreatedEvent

Comment.updateContent(newContent)
  → Check: chưa bị soft delete
  → Validate: content không rỗng, maxLength 2000
  → Emit: CommentUpdatedEvent

Comment.delete()
  → Check: chưa bị soft delete
  → Set: _deletedAt = new Date()
  → Emit: CommentDeletedEvent
```

### API Endpoints

```
POST   /work-logs/:workLogId/comments     ← @Roles('manager') — tạo comment trên work log
PUT    /comments/:id                       ← @Roles('manager') — sửa nội dung comment
DELETE /comments/:id                       ← @Roles('manager') — xóa comment (soft delete)
```

### Module Dependencies

```
CommentModule imports:
  - SharedCqrsModule  (CommandBus)
  - WorkLogModule     (cần verify workLogId tồn tại)
  - UserModule        (cần resolve authorName)
```

### Database Schema

```
comments table:
───────────────
id            varchar(50) PK
work_log_id   varchar(50) NOT NULL  → FK work_logs.id
author_id     varchar(50) NOT NULL  → FK users.id
content       text NOT NULL
version       integer DEFAULT 0
is_deleted    boolean DEFAULT false
deleted_at    timestamp
created_at    timestamp DEFAULT now()
updated_at    timestamp DEFAULT now()
```

---

## 12. Database Schema (Tổng hợp)

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
                                        deleted_at          comments
                                        created_at          ─────────────
                                        updated_at          id (PK)
                                                            work_log_id (FK)
                                        refresh_tokens      author_id (FK)
                                        ─────────────       content
                                        id (PK)             version
                                        user_id (FK)        is_deleted
                                        token_hash (UNIQUE) deleted_at
                                        expires_at          created_at
                                        is_revoked          updated_at
                                        created_at
```

## 13. Quy trình Dev chuẩn

```bash
# 1. Khởi động infrastructure
docker-compose up -d                          # Postgres + Redis

# 2. Schema migration
npm run db:generate                           # Sinh migration SQL từ code
npm run db:migrate                            # Apply lên DB (cần Docker đang chạy!)

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

> Xem thêm: [TESTING_GUIDE.md](./TESTING_GUIDE.md) — hướng dẫn chạy test chi tiết, test accounts, troubleshooting Drizzle.
