# PROJECT_STRUCTURE.md — Kiến trúc & Liên kết Module

> Tổng hợp toàn bộ kiến trúc NestJS DDD/CQRS của project **nestjs-project-example**.
> Cập nhật: 2026-05-15

---

## 1. Tổng quan kiến trúc

Project sử dụng **Domain-Driven Design (DDD)** kết hợp **CQRS** (Command Query Responsibility Segregation) trên nền NestJS + Drizzle ORM + PostgreSQL.

**Nguyên tắc cốt lõi:**
- Mỗi module là 1 bounded context độc lập
- Write side (Commands) và Read side (Queries) tách biệt hoàn toàn
- Module giao tiếp qua Domain Events, không gọi trực tiếp logic nghiệp vụ của nhau
- DI Tokens cho phép inject interface qua module boundary
- Global guards bảo vệ mọi endpoint mặc định

```
src/
├── app.module.ts              ← Root module, global guards (JWT + Roles)
├── main.ts                    ← Bootstrap, Fastify adapter
│
├── libs/
│   ├── core/                  ← Shared DDD kernel
│   │   ├── domain/            ← AggregateRoot, BaseEntity, ISoftDeletable,
│   │   │                      ← BaseValueObject, BaseDomainEvent, DomainException
│   │   ├── application/       ← Command/Query/EventHandler interfaces, Projection base
│   │   ├── infrastructure/    ← BaseAggregateRepository, BaseReadDao,
│   │   │                      ← UnitOfWork interface, EventBus interface
│   │   └── common/            ← Exceptions: Domain, Unauthorized, Forbidden,
│   │                          ← Conflict, Validation, Concurrency
│   │
│   └── shared/                ← Wiring layer (NestJS-specific)
│       ├── cqrs/              ← SharedCqrsModule: NestCommandBus, NestQueryBus, EventBus
│       ├── database/          ← DrizzleDatabaseModule, DrizzleUnitOfWork, schema registry
│       ├── context/           ← CorrelationIdMiddleware, RequestContext
│       ├── logging/           ← Pino structured logging
│       └── outbox/            ← Transactional Outbox pattern
│
└── modules/
    ├── user/                  ← Epic 1 — User identity
    ├── auth/                  ← Epic 1 — Authentication
    ├── project/               ← Epic 2 — Project management (IN PROGRESS)
    ├── work-log/              ← Epic 3 — WorkLog & Reports (chưa tạo)
    ├── comment/               ← Epic 4 — Manager feedback (chưa tạo)
    └── notification/          ← Epic 4 — Notification system (chưa tạo)
```

---

## 2. Module Dependency Graph

```
                        AppModule (Global)
                        ┌─────┴──────┐
                        │ APP_GUARD:  │
                        │ JwtAuthGuard│
                        │ RolesGuard  │
                        └─────┬──────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    UserModule           AuthModule          ProjectModule
    (standalone)         │                    (standalone)
         │          imports User              │
         │               │               ┌───┴───┐
    exports:         inject tokens:        │       │
    • USER_REPOSITORY_TOKEN        WorkLogModule CommentModule
    • USER_READ_DAO_TOKEN    (imports Project,   (imports WorkLog,
    • HASH_SERVICE_TOKEN      User, Comment)      User)
         │                                         │
         │                                   NotificationModule
         │                                   (imports User, WorkLog,
         │                                    Project, Comment)
         │                                   lắng nghe events từ TẤT CẢ
         ▼
    Legend:
    → "imports" = DI dependency (đồng bộ, trực tiếp)
    ⇢ "events"  = domain events (bất đồng bộ, tách biệt)
```

---

## 3. CQRS — Hai chiều dữ liệu

### 3.1 Write Side (Commands)

```
Controller → CommandBus → CommandHandler → Aggregate → Repository → DB
                                                    → Domain Events → EventBus
```

**Flow chi tiết — Tạo Project:**

1. **Controller** nhận request, tạo Command:
   ```typescript
   // project.controller.ts
   const command = new CreateProjectCommand(dto.name, dto.description);
   const result = await this.commandBus.execute(command);
   ```

2. **CommandBus** dispatch đến Handler đăng ký với `@CommandHandler()`:
   ```typescript
   // create-project.handler.ts
   @CommandHandler(CreateProjectCommand)
   export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand, ProjectDto>
   ```

3. **Handler** thực thi nghiệp vụ:
   ```typescript
   // Validate duplicate
   const existing = await this.projectRepository.findByName(command.name);
   if (existing) throw ConflictException.duplicate(...);

   // Tạo aggregate — domain logic nằm trong entity
   const project = Project.create(
     new ProjectId(randomUUID()),
     { name: command.name, description: command.description },
     eventMetadata,  // correlationId, userId từ request context
   );

   // Persist — Unit of Work wrap trong transaction
   await this.projectRepository.save(project);

   // Return DTO (không trả entity thẳng)
   return new ProjectDto({ id, name, description, status, version, ... });
   ```

4. **Aggregate** (Project entity) phát Domain Events:
   ```typescript
   // Bên trong Project.create()
   project.addDomainEvent(
     new ProjectCreatedEvent(id.value, { name, description, status }, metadata)
   );
   ```

5. **Repository** persist — optimistic concurrency qua version:
   ```typescript
   // user.repository.ts (pattern giống project)
   if (expectedVersion === 0) {
     await db.insert(usersTable).values(persistenceModel);
   } else {
     // UPDATE WHERE version = expectedVersion → throw ConcurrencyException nếu 0 rows
   }
   ```

### 3.2 Read Side (Queries)

```
Controller → QueryBus → QueryHandler → ReadDAO → DB (SQL query)
```

**Flow chi tiết — Search Project:**

1. **Controller**:
   ```typescript
   // project.controller.ts
   const query = new SearchProjectsQuery(q.trim(), page, limit);
   return this.queryBus.execute(query);
   ```

2. **QueryHandler** đọc thẳng DB qua ReadDAO:
   ```typescript
   // search-projects.handler.ts
   @QueryHandler(SearchProjectsQuery)
   export class SearchProjectsHandler {
     constructor(@Inject(PROJECT_READ_DAO_TOKEN) private readonly readDao: IProjectReadDao) {}

     async execute(query) {
       const { data, total } = await this.readDao.search({
         query: query.query, page: query.page, limit: query.limit,
       });
       return { data, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
     }
   }
   ```

Read side KHÔNG đi qua Aggregate — tối ưu cho query, phân trang, join.

### 3.3 Event → Projection (Read model sync)

```
Aggregate (save) → UnitOfWork commit → Outbox table → OutboxProcessor → EventBus → Projection → Read DB
```

```typescript
// user-read-model.projection.ts
@EventsHandler(UserCreatedEvent, UserDeactivatedEvent)
export class UserReadModelProjection extends BaseProjection<UserCreatedEvent | UserDeactivatedEvent>
  implements IEventHandler<UserCreatedEvent | UserDeactivatedEvent>
{
  async handle(event) {
    switch (event.eventType) {
      case 'UserCreated':  // sync read model
      case 'UserDeactivated':  // update read model
    }
  }
}
```

---

## 4. Cross-Module Communication — 3 cơ chế

### 4.1 DI Token Injection (đồng bộ, trực tiếp)

Module A export token, Module B import và inject. Dùng khi cần gọi trực tiếp.

**Ví dụ: AuthModule cần UserModule để login**

```
UserModule                              AuthModule
├── user.module.ts                      ├── auth.module.ts
│   exports:                            │   imports: [UserModule, ...]
│   • USER_REPOSITORY_TOKEN       ◄─────┤
│   • USER_READ_DAO_TOKEN              │
│   • HASH_SERVICE_TOKEN          ◄─────┤
│                                       │
│                                       ├── login.handler.ts
│                                       │   @Inject(USER_REPOSITORY_TOKEN)
│                                       │   @Inject(HASH_SERVICE_TOKEN)
│                                       │   @Inject(AUTH_JWT_SERVICE_TOKEN)  ← nội bộ
│                                       │   @Inject(AUTH_REFRESH_TOKEN_REPO_TOKEN) ← nội bộ
```

Handler inject token và gọi method trên interface:
```typescript
// login.handler.ts
const user = await this.userRepository.findByEmail(command.email);  // từ UserModule
const match = await this.hashService.compare(password, user.password);  // từ UserModule
const accessToken = await this.jwtTokenService.generateAccessToken(...);  // nội bộ Auth
```

### 4.2 Domain Events (bất đồng bộ, tách biệt)

Entity phát event, Handler ở module khác đăng ký nhận. Module gửi KHÔNG biết ai nhận.

```
Gửi (không biết ai nhận):          Nhận (đăng ký @EventsHandler):

User entity                         UserReadModelProjection (cùng UserModule)
  └─ UserCreatedEvent ──────────────► cập nhật read model

Comment entity                      NotificationModule (tương lai, Epic 4)
  └─ CommentCreatedEvent ───────────► tạo notification cho employee

WorkLog entity                      NotificationModule (tương lai, Epic 4)
  └─ WorkLogCreatedEvent ───────────► trigger edit_window_closing reminder
```

Đặc điểm:
- Loosely coupled — module gửi không import module nhận
- Event được freeze (immutable) sau khi tạo
- Event carry aggregateId + data + metadata (correlationId, userId)
- Outbox pattern đảm bảo at-least-once delivery

### 4.3 Global Guards (cross-cutting protection)

```
AppModule providers:
  { provide: APP_GUARD, useClass: JwtAuthGuard }  ← chạy TRƯỚC
  { provide: APP_GUARD, useClass: RolesGuard }    ← chạy SAU
```

Mọi controller tự động được bảo vệ. Opt-out bằng decorator:
- `@Public()` — bypass cả hai guards (dùng cho login/refresh)
- `@Roles('manager')` — chỉ cho phép role cụ thể
- Không decorator nào = mọi authenticated user đều truy cập được

```typescript
// auth.controller.ts
@Public()           // ← bypass guards
@Post('login')
async login(@Body() dto) { ... }

// work-log.controller.ts (tương lai)
@Roles('manager')   // ← chỉ manager
@Post(':id/unlock')
async unlock(@Param('id') id) { ... }

// project.controller.ts
@Post()             // ← không decorator = mọi authenticated user
async create(@Body() dto) { ... }
```

---

## 5. Request Lifecycle

Một request POST /projects đi qua hệ thống theo thứ tự:

```
POST /projects
Authorization: Bearer eyJhbGci...
Content-Type: application/json
{"name": "Website mới", "description": "Dự án ABC"}

  1. CorrelationIdMiddleware    ← gắn correlationId, init request context
  2. JwtAuthGuard               ← verify JWT → request.user = { userId, email, role }
  3. RolesGuard                 ← check @Roles() — không có = allow
  4. ValidationPipe             ← validate DTO (class-validator)
  5. Controller.create()        ← tạo Command, gọi CommandBus
  6. CommandBus.dispatch()      ← tìm Handler đăng ký
  7. CreateProjectHandler       ← nghiệp vụ:
     a. findByName() — check duplicate
     b. Project.create() — domain logic, emit event
     c. repo.save() — UnitOfWork: BEGIN → INSERT → COMMIT
  8. EventBus (post-commit)     ← ProjectCreatedEvent → Projection → read model
  9. Response 201 Created       ← { id, name, status, ... }
     Location: /projects/{id}
```

---

## 6. Database Schema Registry

Tất cả Drizzle schemas tập trung tại `src/libs/shared/database/drizzle/schema/index.ts`:

```typescript
import { usersTable } from '@modules/user/infrastructure/persistence/drizzle/schema';
import { refreshTokensTable } from '@modules/auth/infrastructure/persistence/drizzle/schema';
import { projectsTable } from '@modules/project/infrastructure/persistence/drizzle/schema';
import { outboxStatusEnum, outboxTable } from '@shared/database/outbox/drizzle/schema/outbox.schema';

export const schema = {
  usersTable,
  refreshTokensTable,
  projectsTable,
  outboxTable,
  outboxStatusEnum,
};
```

Sắp thêm (Epic 3 & 4): `workLogsTable`, `commentsTable`, `notificationsTable`, `notificationPreferencesTable`

### Schema hiện tại

**users** (UserModule)
| Column | Type | Constraints |
|--------|------|-------------|
| id | varchar(50) | PK |
| email | varchar(255) | NOT NULL, UNIQUE |
| password | varchar(255) | NOT NULL |
| full_name | varchar(200) | NOT NULL |
| role | varchar(20) | NOT NULL ('employee'/'manager') |
| is_active | boolean | NOT NULL, default true |
| version | integer | NOT NULL, default 0 |
| is_deleted | boolean | NOT NULL, default false |
| deleted_at | timestamp | nullable |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**refresh_tokens** (AuthModule)
| Column | Type | Constraints |
|--------|------|-------------|
| id | varchar(50) | PK |
| user_id | varchar(50) | NOT NULL, FK → users |
| token_hash | varchar(64) | NOT NULL (SHA256) |
| expires_at | timestamp | NOT NULL |
| is_revoked | boolean | NOT NULL, default false |
| created_at | timestamp | NOT NULL |

**projects** (ProjectModule)
| Column | Type | Constraints |
|--------|------|-------------|
| id | varchar(50) | PK |
| name | varchar(200) | NOT NULL |
| description | varchar(1000) | nullable |
| status | varchar(20) | NOT NULL, default 'active' |
| version | integer | NOT NULL, default 0 |
| is_deleted | boolean | NOT NULL, default false |
| deleted_at | timestamp | nullable |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**outbox** (Shared)
| Column | Type | Constraints |
|--------|------|-------------|
| id | varchar(50) | PK |
| aggregate_type | varchar(100) | NOT NULL |
| aggregate_id | varchar(100) | NOT NULL |
| event_type | varchar(100) | NOT NULL |
| payload | jsonb | NOT NULL |
| status | enum (pending/processed/failed) | NOT NULL |
| created_at | timestamp | NOT NULL |

---

## 7. Folder Structure Pattern

Mỗi module follow cấu trúc DDD cố định:

```
src/modules/{module-name}/
├── {module-name}.module.ts          ← NestJS module registration
├── index.ts                         ← Public barrel export
├── constants/
│   └── tokens.ts                    ← DI Symbol tokens
├── domain/
│   ├── entities/
│   │   ├── {entity}.entity.ts       ← Aggregate Root
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── {name}.value-object.ts   ← Validated value objects
│   │   └── index.ts
│   ├── events/
│   │   ├── {name}.event.ts          ← Domain events
│   │   └── index.ts
│   ├── repositories/
│   │   ├── i-{entity}-repository.interface.ts
│   │   └── index.ts                 ← export type (isolatedModules)
│   ├── services/
│   │   └── index.ts                 ← Domain services (nếu có)
│   └── index.ts
├── application/
│   ├── commands/
│   │   ├── {action}.command.ts      ← Command class
│   │   ├── handlers/
│   │   │   ├── {action}.handler.ts  ← Command handler
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── queries/
│   │   ├── {action}.query.ts        ← Query class
│   │   ├── handlers/
│   │   │   ├── {action}.handler.ts  ← Query handler
│   │   │   └── index.ts
│   │   ├── ports/
│   │   │   ├── i-{entity}-read-dao.interface.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── dtos/
│   │   ├── {action}.dto.ts          ← Request/Response DTOs
│   │   └── index.ts
│   └── index.ts
└── infrastructure/
    ├── http/
    │   ├── {entity}.controller.ts   ← REST controller
    │   ├── guards/                   ← Module-specific guards
    │   ├── decorators/               ← Custom decorators
    │   └── index.ts
    ├── persistence/
    │   ├── drizzle/schema/
    │   │   ├── {entity}.schema.ts    ← Drizzle table definition
    │   │   └── index.ts
    │   ├── write/
    │   │   ├── {entity}.repository.ts ← AggregateRepository impl
    │   │   └── index.ts
    │   ├── read/
    │   │   ├── {entity}-read-dao.ts  ← ReadDAO impl
    │   │   └── index.ts
    │   └── index.ts
    ├── projections/
    │   ├── {entity}-read-model.projection.ts ← Event handler → read model
    │   └── index.ts
    ├── services/                     ← Infrastructure services
    └── index.ts
```

---

## 8. Key Patterns Reference

### Entity (Aggregate Root)
```typescript
export class Project extends AggregateRoot implements ISoftDeletable {
  private _props: ProjectProps;
  private _deletedAt?: Date | null = null;

  private constructor(id, props, version?, createdAt?, updatedAt?, deletedAt?) {
    super(id.value, version, createdAt, updatedAt);
  }

  static create(id, props, metadata?)   // factory → emits event, version++
  static reconstitute(id, props, ...)    // hydration → NO events

  // Lifecycle methods
  updateDetails(params, metadata?)       // validate → mutate → emit event
  deactivate() / activate()             // status transitions
  delete() / restore()                  // soft delete
}
```

### Value Object
```typescript
export class ProjectStatus extends BaseValueObject {
  static readonly ACTIVE = 'active';
  constructor(public readonly value: string) {
    super();
    // validate in constructor, throw DomainException nếu invalid
  }
  protected getEqualityComponents() { return [this.value]; }
}
```

### Domain Event
```typescript
export class ProjectCreatedEvent extends BaseDomainEvent<ProjectCreatedEventData> {
  constructor(aggregateId, data, metadata?) {
    super(aggregateId, 'Project', 'ProjectCreated', data, metadata);
  }
}
```

### Repository (Write side)
```typescript
export class UserRepository extends BaseAggregateRepository<User> implements IUserRepository {
  protected async persist(aggregate, expectedVersion, options?) {
    if (expectedVersion === 0) await db.insert(table).values(model);
    else await db.update(table).set(model).where(version = expectedVersion);
  }
  // toPersistence(aggregate) → DB row
  // toDomain(row) → Entity via reconstitute()
}
```

### Error Response Format
```json
{
  "statusCode": 422,
  "code": "WORKLOG_EDIT_WINDOW_EXPIRED",
  "message": "WorkLog đã quá cửa sổ 3 ngày",
  "suggestion": "Liên hệ quản lý để mở khóa",
  "details": null
}
```

### Pagination Response
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

---

## 9. Test Coverage

| Suite | Tests | Scope |
|-------|-------|-------|
| User domain (entity, VOs, events) | ~30 | Entity creation, lifecycle, validation |
| User application (handlers, DTOs) | ~20 | CRUD command/query handlers, DTO validation |
| User infrastructure (CLI seed) | ~3 | Seed command |
| Auth application (login, refresh, logout) | ~15 | Auth flows, token management |
| Auth infrastructure (guards, decorators, JWT) | ~15 | Guard logic, JWT strategy |
| Project domain (entity, VOs) | ~35 | Entity lifecycle, status transitions, validation |
| Project application (handlers, DTOs) | ~20 | CRUD + search handlers |
| Project infrastructure (controller) | ~5 | API endpoint tests |
| **Total** | **~208** | **30 test suites** |

---

## 10. Implementation Progress

### Epic 1: Xác thực & Quản lý Người dùng — DONE

| Story | Mô tả | Status |
|-------|--------|--------|
| 1.1 | User Module — Aggregate, Value Objects & Schema | done |
| 1.2 | User CRUD — Commands, Queries & API Endpoints | done |
| 1.3 | CLI Seed Command — Khởi tạo User ban đầu | done |
| 1.4 | JWT Authentication — Login, Refresh & Token Management | done |
| 1.5 | Global Auth Guards, Decorators & Error Response Format | done |

### Epic 2: Quản lý Dự án — IN PROGRESS

| Story | Mô tả | Status |
|-------|--------|--------|
| 2.1 | Project Module — Aggregate, Value Objects & Schema | done |
| 2.2 | Project CRUD — Commands, Queries & API Endpoints | review |
| 2.3 | Fuzzy Search & Search-before-Create Pattern | in-progress |
| 2.4 | Merge Projects — Gộp Dự án Trùng Tên | backlog |

### Epic 3: Ghi nhận Công việc & Báo cáo — BACKLOG

| Story | Mô tả | Status |
|-------|--------|--------|
| 3.1 | WorkLog Module — Aggregate, Value Objects & Domain Services | backlog |
| 3.2 | WorkLog CRUD — Create/Update/Delete với 3-day Lock Rule | backlog |
| 3.3 | Manager Unlock Override | backlog |
| 3.4 | WorkLog List & Query với Phân quyền | backlog |
| 3.5 | Smart Defaults Endpoint | backlog |
| 3.6 | Calendar View API | backlog |
| 3.7 | Summary View API | backlog |
| 3.8 | Monthly Report API | backlog |
| 3.9 | Excel Export | backlog |

### Epic 4: Phản hồi Quản lý & Hệ thống Thông báo — BACKLOG

| Story | Mô tả | Status |
|-------|--------|--------|
| 4.1 | Comment Module — Entity, Value Objects & Schema | backlog |
| 4.2 | Comment CRUD — API Endpoints | backlog |
| 4.3 | Notification Module — Entities, Value Objects & Schema | backlog |
| 4.4 | Notification CRUD & Preferences API | backlog |
| 4.5 | Event-Triggered Notifications (N-7) | backlog |
| 4.6 | Cron-Based Daily Reminders (N-1, N-2) | backlog |
| 4.7 | Cron-Based Manager Alerts & Weekly Summary (N-3~N-6) | backlog |
