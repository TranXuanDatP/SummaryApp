# PROJECT_PATTERNS.md — Context DNA

> This document contains the **invariant rules** of the project. Every new feature, module, or refactor MUST follow these patterns. When in doubt, refer to this file as the source of truth.

---

## 1. Module Inventory

| Module | Path | Description |
|---|---|---|
| **Product** | `src/modules/product/` | Product catalog management (CRUD, stock operations, bulk adjustments) |
| **Order** | `src/modules/order/` | Order management (place, cancel, status lifecycle) — depends on ProductModule |
| **Core** | `src/libs/core/` | DDD building blocks (BaseEntity, AggregateRoot, ValueObject, DomainEvent, exceptions) |
| **Shared** | `src/libs/shared/` | Cross-cutting infrastructure (CQRS buses, Drizzle DB, UnitOfWork, Outbox, logging, health, security, observability) |

### How Modules Depend on Each Other

```
AppModule (Global)
├── ConfigModule (global)
├── LoggingModule (Pino)
├── ContextModule (Correlation ID)
├── SharedCqrsModule (Command/Query/Event buses)
├── DrizzleDatabaseModule (PostgreSQL)
├── OutboxModule (Transactional Outbox)
├── HealthModule
├── ProductModule ← standalone
└── OrderModule → imports ProductModule (for IProductRepository)
```

### Adding a New Module

Every module MUST follow the same directory structure:

```
src/modules/{module-name}/
├── application/
│   ├── commands/
│   │   ├── {action}-{entity}.command.ts       # Command class
│   │   └── handlers/
│   │       └── {action}-{entity}.handler.ts   # Command handler
│   ├── queries/
│   │   ├── get-{entity}.query.ts              # Query class
│   │   └── handlers/
│   │       └── get-{entity}.handler.ts        # Query handler
│   ├── dtos/
│   │   ├── create-{entity}.dto.ts             # Input DTO
│   │   ├── {entity}.dto.ts                    # Output/Read DTO
│   │   └── index.ts                           # Barrel export
│   └── queries/ports/
│       └── i-{entity}-read-dao.interface.ts   # Read DAO port
├── constants/
│   └── tokens.ts                              # DI tokens (Symbol-based)
├── domain/
│   ├── entities/
│   │   ├── {entity}.entity.ts                 # Aggregate Root / Entity
│   │   └── index.ts
│   ├── value-objects/
│   │   ├── {name}.value-object.ts             # Value Object
│   │   └── index.ts
│   ├── events/
│   │   ├── {entity}-{action}.event.ts         # Domain Event
│   │   └── index.ts
│   ├── repositories/
│   │   └── i-{entity}-repository.interface.ts # Repository port
│   ├── services/
│   │   └── {name}.service.ts                  # Domain Service
│   └── specifications/                        # (optional) Specification pattern
├── infrastructure/
│   ├── http/
│   │   └── {entity}.controller.ts             # NestJS Controller
│   ├── persistence/
│   │   ├── drizzle/schema/
│   │   │   └── {entity}.schema.ts             # Drizzle table definition
│   │   ├── read/
│   │   │   └── {entity}-read-dao.ts           # Read DAO implementation
│   │   └── write/
│   │       └── {entity}-repository.ts         # Write repository implementation
│   └── projections/
│       └── {entity}-read-model.projection.ts  # Event → Read Model projector
└── {module-name}.module.ts                    # NestJS Module
```

---

## 2. Naming Conventions

### 2.1 Files

| Artifact | Pattern | Example |
|---|---|---|
| Entity | `{name}.entity.ts` | `product.entity.ts`, `order-item.entity.ts` |
| Value Object | `{name}.value-object.ts` | `price.value-object.ts`, `money.value-object.ts` |
| Domain Event | `{entity}-{action}.event.ts` | `product-created.event.ts`, `stock-decreased.event.ts` |
| Command | `{action}-{entity}.command.ts` | `create-product.command.ts`, `cancel-order.command.ts` |
| Command Handler | `{action}-{entity}.handler.ts` | `create-product.handler.ts`, `cancel-order.handler.ts` |
| Query | `get-{entity}.query.ts` | `get-product.query.ts`, `get-product-list.query.ts` |
| Query Handler | `get-{entity}.handler.ts` | `get-product.handler.ts`, `get-product-list.handler.ts` |
| DTO (input) | `{action}-{entity}.dto.ts` | `create-product.dto.ts`, `place-order.dto.ts` |
| DTO (output) | `{entity}.dto.ts` | `product.dto.ts`, `order.dto.ts` |
| Drizzle Schema | `{entity}.schema.ts` | `product.schema.ts`, `order.schema.ts` |
| Controller | `{entity}.controller.ts` | `product.controller.ts`, `order.controller.ts` |
| Module | `{module-name}.module.ts` | `product.module.ts`, `order.module.ts` |
| Repository Port | `i-{entity}-repository.interface.ts` | `i-product-repository.interface.ts` |
| Repository Impl | `{entity}-repository.ts` | `product-repository.ts` |
| Read DAO Port | `i-{entity}-read-dao.interface.ts` | `i-product-read-dao.interface.ts` |
| Read DAO Impl | `{entity}-read-dao.ts` | `product-read-dao.ts` |
| Projection | `{entity}-read-model.projection.ts` | `product-read-model.projection.ts` |
| DI Tokens | `tokens.ts` in `constants/` | `tokens.ts` |
| Barrel Export | `index.ts` per folder | `entities/index.ts`, `events/index.ts` |

### 2.2 Classes & Interfaces

| Artifact | Convention | Example |
|---|---|---|
| Entity class | PascalCase | `Product`, `Order`, `OrderItem` |
| Value Object class | PascalCase | `Price`, `ProductId`, `Money`, `OrderId`, `OrderStatus` |
| Aggregate Root | extends `AggregateRoot` | `class Product extends AggregateRoot` |
| Child Entity | extends `BaseEntity` | `class OrderItem extends BaseEntity` |
| Domain Event class | `{Entity}{Action}Event` extends `BaseDomainEvent<T>` | `ProductCreatedEvent`, `StockDecreasedEvent` |
| Event Data interface | `{Entity}{Action}EventData` | `ProductCreatedEventData`, `StockDecreasedEventData` |
| Command class | `{Action}{Entity}Command` | `CreateProductCommand`, `CancelOrderCommand` |
| Query class | `Get{Entity}Query` | `GetProductQuery`, `GetProductListQuery` |
| Handler class | `{Action}{Entity}Handler` | `CreateProductHandler`, `GetProductHandler` |
| DTO class (input) | `{Action}{Entity}Dto` | `CreateProductDto`, `PlaceOrderDto` |
| DTO class (output) | `{Entity}Dto` | `ProductDto`, `OrderDto` |
| Interface (port) | `I{Name}` prefix | `IProductRepository`, `IProductReadDao`, `ICommandBus` |
| Exception class | `{Name}Exception` extends `BaseException` or `DomainException` | `NotFoundException`, `ConcurrencyException` |

### 2.3 DI Tokens

- Use `Symbol()` for DI tokens, NOT string literals
- Convention: `const {ENTITY}_{TYPE}_TOKEN = Symbol('I{Interface}')`
- Examples: `PRODUCT_REPOSITORY_TOKEN`, `PRODUCT_READ_DAO_TOKEN`, `COMMAND_BUS_TOKEN`

### 2.4 Database Columns (Drizzle)

- Use `camelCase` for TypeScript property names
- Use `snake_case` for actual DB column names
- Example: `priceAmount: decimal('price_amount', ...)`, `isDeleted: boolean('is_deleted')`

### 2.5 API Routes

- RESTful, lowercase, plural nouns: `@Controller('products')`, `@Controller('orders')`
- Sub-resources: `POST products/:id/stock/increase`, `POST products/:id/stock/decrease`
- Special actions: `POST products/search`, `POST products/stock/bulk-adjust`

---

## 3. Error Handling

### 3.1 Exception Hierarchy

```
Error
├── BaseException (abstract) ← src/libs/core/common/exceptions/base.exception.ts
│   ├── NotFoundException        → HTTP 404
│   ├── ValidationException      → HTTP 400
│   ├── UnauthorizedException    → HTTP 401
│   ├── ForbiddenException       → HTTP 403
│   ├── ConflictException        → HTTP 409
│   ├── ConcurrencyException     → HTTP 409 (optimistic concurrency)
│   └── BusinessRuleException    → HTTP 400
└── DomainException              ← src/libs/core/domain/exceptions/domain.exception.ts
    (Pure TypeScript, NO NestJS dependency — used inside Domain Layer)
```

### 3.2 When to Use Which Exception

| Layer | Exception | When |
|---|---|---|
| **Domain** | `DomainException` | Business rule violations inside entities, value objects, domain services. Pure TS, no framework dependency. |
| **Application** | `NotFoundException.entity('Product', id)` | Entity not found when loading from repository. |
| **Application** | `ConcurrencyException.versionMismatch(...)` | Optimistic concurrency version mismatch. |
| **Application** | `BusinessRuleException.violation(rule, details)` | Cross-aggregate business rules in handlers. |
| **Infrastructure** | `ValidationException` | DTO validation failures. |
| **Infrastructure** | `UnauthorizedException` | Missing/invalid auth. |

### 3.3 Exception Construction Rules

1. **Domain Layer** — ALWAYS use `DomainException` (pure TS):
   ```typescript
   throw new DomainException('Product name is required');
   throw new DomainException('Insufficient stock', 'INSUFFICIENT_STOCK');
   ```

2. **Application Layer** — use typed exceptions with static factory methods:
   ```typescript
   throw NotFoundException.entity('Product', command.id);
   throw ConcurrencyException.versionMismatch(aggregateId, expected, actual);
   throw BusinessRuleException.violation('Minimum order value not met', { min: 50 });
   ```

3. **Exception format** — Every exception has: `message`, `code`, `details`:
   ```typescript
   {
     name: 'NotFoundException',
     code: 'PRODUCT_NOT_FOUND',
     message: "Product with id 'abc-123' not found",
     details: { resourceType: 'Product', resourceId: 'abc-123' }
   }
   ```

4. **Global Exception Filter** — `GlobalExceptionFilter` in `src/libs/shared/http/` converts all exceptions to standardized HTTP responses. Never catch and swallow exceptions in handlers unless you have a specific recovery strategy.

### 3.4 Validation: Dual-Layer Approach

- **DTO layer** (application): `class-validator` decorators on DTOs — validates input shape/types
  ```typescript
  @IsString() @MinLength(1) @MaxLength(200)
  name: string;
  ```
- **Domain layer** (entity): `DomainException` inside entity methods — validates business rules
  ```typescript
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException('Product name is required');
    }
  }
  ```

---

## 4. Required Libraries & Their Roles

### 4.1 Core Dependencies (MANDATORY)

| Library | Role | Where Used |
|---|---|---|
| `@nestjs/common` | Framework core (decorators, DI, modules) | Everywhere |
| `@nestjs/core` | NestJS runtime | Bootstrap |
| `@nestjs/platform-fastify` | HTTP adapter (NOT Express) | `main.ts` |
| `@nestjs/config` | Environment config | `AppModule` |
| `@nestjs/cqrs` | CQRS decorators (`@CommandHandler`, `@QueryHandler`, `@EventsHandler`) | Handler classes |
| `@nestjs/swagger` | OpenAPI/Swagger generation | Controllers, DTOs |
| `drizzle-orm` | SQL ORM (type-safe, NOT TypeORM) | Schema definitions, queries |
| `pg` | PostgreSQL driver | Database connection |
| `redis` | Caching & event bus transport | `libs/shared/caching/` |
| `class-validator` | DTO validation via decorators | Input DTOs |
| `class-transformer` | DTO transformation | Input DTOs |
| `zod` | Runtime schema validation | (Available for schema validation) |
| `nestjs-pino` + `pino` | Structured JSON logging | Global via `LoggingModule` |
| `rxjs` | Reactive streams | NestJS internal |

### 4.2 Observability Stack

| Library | Role |
|---|---|
| `@opentelemetry/api` | Tracing API |
| `@opentelemetry/sdk-node` | SDK for instrumentation |
| `@opentelemetry/auto-instrumentations-node` | Auto-instrumentation |
| `@opentelemetry/exporter-jaeger` | Export traces to Jaeger |
| `@opentelemetry/exporter-prometheus` | Export metrics to Prometheus |

### 4.3 Dev Dependencies

| Library | Role |
|---|---|
| `jest` + `ts-jest` | Unit/integration testing |
| `supertest` | HTTP E2E testing |
| `drizzle-kit` | Migration generation |
| `eslint` + `prettier` | Code quality |
| `typescript` | Type checking |
| `bun` | Package manager & runtime |

### 4.4 What NOT to Use

| Rejected | Reason |
|---|---|
| TypeORM | Project uses **Drizzle ORM** exclusively |
| Express | Project uses **Fastify** exclusively |
| `console.log` | Use **Pino logger** (`nestjs-pino`) exclusively |
| Prisma | Project uses **Drizzle ORM** |
| Winston | Project uses **Pino** for logging |

---

## 5. Architecture Patterns (Invariant Rules)

### 5.1 DDD Layer Separation

```
Domain Layer (PURE TypeScript — NO NestJS imports)
  └── Entities, Value Objects, Domain Events, Domain Services, Repository Interfaces
      Can throw: DomainException only
      Can import: Only from src/libs/core/domain/

Application Layer (Orchestration — uses @nestjs/cqrs)
  └── Commands, Queries, Handlers, DTOs
      Can throw: NotFoundException, ConcurrencyException, BusinessRuleException
      Can import: Domain Layer interfaces, @nestjs/cqrs decorators

Infrastructure Layer (Framework — full NestJS access)
  └── Controllers, Repositories (impl), Read DAOs, Projections, Schemas
      Can import: Application Layer (DTOs, commands, queries), NestJS modules
```

**CRITICAL: Domain Layer MUST NOT import anything from `@nestjs/*`. It is pure TypeScript.**

### 5.2 Entity Pattern

- Private constructor — use `static create()` factory method for new entities
- `static reconstitute()` factory for loading from DB (does NOT emit events)
- Private `_props` object to encapsulate state
- Getter methods return primitives or immutable Value Objects
- Semantic business methods (NOT generic `update()`):
  ```typescript
  // GOOD
  product.rename(newName);
  product.changePrice(newPrice);
  product.decreaseStock(quantity);

  // BAD
  product.update({ name, price, stock });
  ```
- Invariant validation via private static methods (usable in both factory and methods):
  ```typescript
  private static validateName(name: string): void { ... }
  ```

### 5.3 Value Object Pattern

- Extends `BaseValueObject` from `src/libs/core/domain/`
- All properties `readonly` (immutable)
- Equality via `getEqualityComponents()` (compared by value, not identity)
- Validates invariants in constructor, throws `DomainException`

### 5.4 Domain Event Pattern

- Extends `BaseDomainEvent<TData>` with typed payload
- `{Entity}{Action}Event` naming
- Separate `{Entity}{Action}EventData` interface for payload
- Events are **frozen** (immutable) via `Object.freeze()`
- Include `IEventMetadata` for distributed tracing (`correlationId`, `causationId`, `userId`)
- **Only AggregateRoot can emit events** — child entities must notify their root

### 5.5 CQRS Pattern

- **Write side**: Controller → CommandBus → CommandHandler → Repository → AggregateRoot → Domain Events
- **Read side**: Controller → QueryBus → QueryHandler → ReadDAO → DTO
- **NEVER mix**: Command handlers do NOT return data (except aggregate ID for creates). Query handlers do NOT modify state.

### 5.6 Repository Pattern

- **Write Repository**: Works with Aggregate Roots. Saves entity + collects/publishes domain events.
- **Read DAO**: Works with raw data/DTOs. Optimized for queries. Does NOT load aggregates.
- Interface defined in Domain Layer (`i-{entity}-repository.interface.ts`)
- Implementation in Infrastructure Layer (`{entity}-repository.ts`)
- Bound via DI token in Module

### 5.7 Projection Pattern (Event → Read Model)

- Event handlers (`@EventsHandler`) listen to domain events
- Update read-optimized database tables
- Invalidate caches when read model changes
- Example: `ProductReadModelProjection` handles `ProductCreatedEvent`, `ProductUpdatedEvent`, etc.

### 5.8 Unit of Work Pattern

- Used for cross-aggregate transactions (e.g., PlaceOrder: modify Product stock + create Order)
- `IUnitOfWork` interface from `src/libs/core/infrastructure/persistence/unit-of-work/`
- `DrizzleUnitOfWork` implementation in `src/libs/shared/database/drizzle/unit-of-work/`
- Injected via `UNIT_OF_WORK_TOKEN`

### 5.9 Transactional Outbox Pattern

- Domain events stored in `outbox` table within same DB transaction
- Background process publishes events to event bus
- Ensures eventual consistency without distributed transactions
- Implemented in `src/libs/shared/database/outbox/`

### 5.10 Optimistic Concurrency Control

- Every AggregateRoot has a `version` field (auto-incremented on each modification)
- Repository checks version when saving — throws `ConcurrencyException` on mismatch
- Schema includes `version: integer('version').notNull().default(0)`

### 5.11 Soft Delete Pattern

- Entities implement `ISoftDeletable` interface
- Schema: `isDeleted: boolean('is_deleted').notNull().default(false)`
- Entity methods: `delete()` and `restore()`
- Guard: `ensureNotDeleted()` throws `DomainException` if entity is soft-deleted

---

## 6. Controller Conventions

### 6.1 Standard Structure

```typescript
@ApiTags('resources')
@Controller('resources')
export class ResourceController {
  constructor(
    @Inject(COMMAND_BUS_TOKEN) private readonly commandBus: ICommandBus,
    @Inject(QUERY_BUS_TOKEN) private readonly queryBus: IQueryBus,
    @Inject(RESOURCE_READ_DAO_TOKEN) private readonly readDao: IResourceReadDao,
  ) {}
}
```

### 6.2 Method Conventions

- Write ops (POST/PUT/DELETE) → dispatch Command via `commandBus.execute()`
- Read ops (GET) → dispatch Query via `queryBus.execute()` or call `readDao` directly
- Use `@ApiOperation`, `@ApiResponse`, `@ApiParam` Swagger decorators on every endpoint
- Use `@HttpCode(HttpStatus.CREATED)` for POST, `@HttpCode(HttpStatus.NO_CONTENT)` for DELETE

### 6.3 Response Format

All responses wrapped by `ResponseInterceptor` into:
```typescript
{
  success: boolean;
  statusCode: number;
  timestamp: string;
  path?: string;
  method?: string;
  data?: T;
  message?: string;
}
```

---

## 7. Import Aliases

Configured in `tsconfig.json` and `jest` config:

| Alias | Resolves To |
|---|---|
| `@core` | `src/libs/core` |
| `@core/*` | `src/libs/core/*` |
| `@shared` | `src/libs/shared` |
| `@shared/*` | `src/libs/shared/*` |
| `@modules/*` | `src/modules/*` |

---

## 8. Global Infrastructure

These are registered once in `AppModule` and available everywhere:

| Component | Location | Purpose |
|---|---|---|
| `GlobalValidationPipe` | `src/libs/shared/http/` | Validates all DTOs via class-validator |
| `GlobalExceptionFilter` | `src/libs/shared/http/` | Converts exceptions to standard API responses |
| `ResponseInterceptor` | `src/libs/shared/http/` | Wraps all responses in `ApiResponse` format |
| `CorrelationIdMiddleware` | `src/libs/shared/context/` | Extracts/generates correlation ID for tracing |
| `LoggingModule` | `src/libs/shared/logging/` | Pino structured logging |
| `HealthModule` | `src/libs/shared/health/` | Health check endpoints |
| `RateLimiterGuard` | `src/libs/shared/security/` | Rate limiting |

---

## 9. Testing Conventions

| Test Type | Location | Pattern |
|---|---|---|
| Domain unit tests | `domain/entities/*.spec.ts`, `domain/value-objects/*.spec.ts` | `product.entity.spec.ts`, `price.value-object.spec.ts` |
| Integration tests | `tests/*.integration.spec.ts` in module root | `product.integration.spec.ts` |
| E2E tests | `test/*.e2e-spec.ts` (project root) | Jest config `jest-e2e.json` |

---

## 10. Quick Reference: Creating a New Feature

1. **Define Domain**: Entity → Value Objects → Events → Repository Interface → Domain Service
2. **Define Application**: Command/Query classes → Handlers → DTOs
3. **Define Infrastructure**: Drizzle schema → Repository impl → Read DAO → Controller → Projection
4. **Wire Module**: Create `tokens.ts`, register all providers in `*.module.ts`
5. **Write Tests**: Entity unit tests → Handler tests → Integration tests
