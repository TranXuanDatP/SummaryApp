# Story 1.4: JWT Authentication — Login, Refresh & Token Management

Status: done

## Story

As a user,
I want to log in with email + password and receive access + refresh tokens,
so that I can authenticate subsequent API requests.

## Acceptance Criteria

1. **Given** a user exists in the database, **When** I send `POST /auth/login` with valid credentials, **Then** receive `{ accessToken (TTL 15 min), refreshToken (TTL 7 days) }`
2. `POST /auth/refresh` with valid refresh token → new access token + new refresh token (rotation: old token revoked, new pair issued)
3. Invalid credentials → `401 { code: "AUTH_INVALID_CREDENTIALS", message: "...", suggestion: "..." }`
4. Disabled account → `403 { code: "AUTH_ACCOUNT_DISABLED" }`
5. Expired refresh token → `401 { code: "AUTH_REFRESH_EXPIRED" }`
6. RefreshToken stored in `refresh_tokens` Drizzle schema with user relation
7. Rate limiting on login endpoint (max 5 requests/min/IP)

## Tasks / Subtasks

- [x] Task 1: Install JWT dependencies (AC: #1)
  - [x] Install `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
  - [x] Install `@types/passport-jwt` as devDependency
- [x] Task 2: Create Auth module skeleton + DI tokens (AC: #1)
  - [x] Create `src/modules/auth/auth.module.ts` — imports `UserModule`, `SharedCqrsModule`
  - [x] Create `src/modules/auth/constants/tokens.ts` — `AUTH_JWT_SERVICE_TOKEN`, `AUTH_HASH_SERVICE_TOKEN`, `AUTH_REFRESH_TOKEN_REPO_TOKEN`, `AUTH_TOKEN_READ_DAO_TOKEN`
  - [x] Create all barrel `index.ts` files for each subfolder
  - [x] Register `AuthModule` in `app.module.ts`
- [x] Task 3: Create Drizzle schema for refresh tokens (AC: #6)
  - [x] Create `src/modules/auth/infrastructure/persistence/drizzle/schema/refresh-token.schema.ts` — `refreshTokensTable` with columns: id, userId, token (hashed), expiresAt, isRevoked, createdAt
  - [x] Register in shared schema registry: `src/libs/shared/database/drizzle/schema/index.ts`
- [x] Task 4: Create application DTOs (AC: #1, #2, #3, #4, #5)
  - [x] Create `src/modules/auth/application/dtos/login-request.dto.ts` — class-validator: `email` (isEmail), `password` (isString, minLength 1)
  - [x] Create `src/modules/auth/application/dtos/login-response.dto.ts` — `accessToken`, `refreshToken`
  - [x] Create `src/modules/auth/application/dtos/refresh-token-request.dto.ts` — `refreshToken` (isString)
  - [x] Create `src/modules/auth/application/dtos/refresh-token-response.dto.ts` — `accessToken`
  - [x] Create `src/modules/auth/application/dtos/index.ts` barrel
- [x] Task 5: Create commands + handlers (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `src/modules/auth/application/commands/login.command.ts` — `LoginCommand(email, password)`
  - [x] Create `src/modules/auth/application/commands/refresh-token.command.ts` — `RefreshTokenCommand(refreshToken)`
  - [x] Create `src/modules/auth/application/commands/index.ts` barrel
  - [x] Create `src/modules/auth/application/commands/handlers/login.handler.ts`
    - Inject `IUserRepository` (from UserModule), `IHashService` (from UserModule), `IJwtTokenService`, `IRefreshTokenRepository`
    - Find user by email → not found: throw `UnauthorizedException` with code `AUTH_INVALID_CREDENTIALS`
    - Compare password via `IHashService.compare()` → mismatch: throw `UnauthorizedException` with code `AUTH_INVALID_CREDENTIALS`
    - Check `isActive` → disabled: throw `ForbiddenException` with code `AUTH_ACCOUNT_DISABLED`
    - Generate access token (TTL 15 min) via `IJwtTokenService.generateAccessToken()`
    - Generate refresh token (TTL 7 days) via `IJwtTokenService.generateRefreshToken()`
    - Hash refresh token and store via `IRefreshTokenRepository.save()`
    - Return `LoginResponseDto { accessToken, refreshToken }`
  - [x] Create `src/modules/auth/application/commands/handlers/refresh-token.handler.ts`
    - Hash the incoming refresh token, find it via `IRefreshTokenRepository.findByTokenHash()`
    - Not found or revoked → throw `UnauthorizedException` with code `AUTH_REFRESH_EXPIRED`
    - Expired (expiresAt < now) → revoke and throw `UnauthorizedException` with code `AUTH_REFRESH_EXPIRED`
    - Load user, check `isActive` → disabled: throw `ForbiddenException` with code `AUTH_ACCOUNT_DISABLED`
    - Generate new access token via `IJwtTokenService.generateAccessToken()`
    - Return `RefreshTokenResponseDto { accessToken }`
  - [x] Create `src/modules/auth/application/commands/handlers/index.ts` barrel
- [x] Task 6: Create infrastructure services (AC: #1)
  - [x] Create `src/modules/auth/infrastructure/services/jwt-token.service.ts` — wraps `@nestjs/jwt` `JwtService`
    - `generateAccessToken(payload: { sub, email, role }): Promise<string>` — TTL 15m
    - `generateRefreshToken(): Promise<string>` — random token, TTL 7d
    - `verifyAccessToken(token: string): Promise<JwtPayload>` — for future guard use
    - `verifyRefreshToken(token: string): Promise<JwtPayload>` — for refresh flow
  - [x] Create `src/modules/auth/infrastructure/services/index.ts` barrel
- [x] Task 7: Create repositories + read DAO (AC: #6)
  - [x] Create `src/modules/auth/domain/repositories/i-refresh-token-repository.interface.ts`
    - `save(token: RefreshToken): Promise<void>`
    - `findByTokenHash(hash: string): Promise<RefreshToken | null>`
    - `revokeAllForUser(userId: string): Promise<void>`
  - [x] Create `src/modules/auth/infrastructure/persistence/write/refresh-token.repository.ts` — Drizzle implementation
  - [x] Create `src/modules/auth/infrastructure/persistence/read/token-read-dao.ts` — read queries
  - [x] Create barrel files for repositories, persistence, read, write
- [x] Task 8: Create controller (AC: #1, #2, #3, #4, #5, #7)
  - [x] Create `src/modules/auth/infrastructure/http/auth.controller.ts`
    - `POST /auth/login` — dispatch `LoginCommand`, return `LoginResponseDto`
    - `POST /auth/refresh` — dispatch `RefreshTokenCommand`, return `RefreshTokenResponseDto`
  - [x] Create `src/modules/auth/infrastructure/http/index.ts` barrel
- [x] Task 9: Wire up AuthModule DI (AC: all)
  - [x] Register all providers: JwtTokenService, RefreshTokenRepository, TokenReadDao, command handlers, controller
  - [x] Import `UserModule` for `IUserRepository` and `HASH_SERVICE_TOKEN`
  - [x] Import `SharedCqrsModule` for CommandBus
  - [x] Import `JwtModule.registerAsync()` for JWT secret + config
- [x] Task 10: Write tests (AC: #1, #2, #3, #4, #5)
  - [x] Unit tests for `LoginHandler` — success, invalid credentials, disabled account, wrong password
  - [x] Unit tests for `RefreshTokenHandler` — success, expired token, revoked token, disabled user
  - [x] Unit tests for `JwtTokenService` — generate/verify access + refresh tokens
  - [x] Verify `IHashService.compare()` is called with correct args
  - [ ] Verify refresh token is hashed before storage

## Dev Notes

### MUST-FOLLOW: Auth Module Architecture

Follow the architecture document exactly. The Auth module is defined in Architecture Section 3.1:

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
│   └── queries/ports/
│       └── i-token-read-dao.interface.ts
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
│   │   └── index.ts
│   ├── persistence/
│   │   ├── drizzle/schema/
│   │   │   └── refresh-token.schema.ts
│   │   ├── read/
│   │   │   └── token-read-dao.ts
│   │   └── write/
│   │       └── refresh-token.repository.ts
│   └── services/
│       ├── jwt-token.service.ts
│       └── index.ts
└── auth.module.ts
```

### REUSE from UserModule — DO NOT Recreate

The Auth module **imports** `UserModule` and reuses these exported tokens:
- `USER_REPOSITORY_TOKEN` → `IUserRepository` — for finding users by email
- `HASH_SERVICE_TOKEN` → `IHashService` — for comparing passwords (bcrypt, salt >= 10)

**DO NOT create a new hash service or user repository in the Auth module.**

### Files to READ FIRST

- `src/modules/user/user.module.ts` — exports `USER_REPOSITORY_TOKEN`, `HASH_SERVICE_TOKEN`
- `src/modules/user/domain/repositories/i-user-repository.interface.ts` — `findByEmail()` method
- `src/modules/user/domain/services/hash.interface.ts` — `IHashService.compare()`
- `src/modules/user/domain/entities/user.entity.ts` — `isActive`, `email`, `role`, `password` getters
- `src/app.module.ts` — will be modified to register AuthModule
- `src/libs/core/common/exceptions/unauthorized.exception.ts` — existing `UnauthorizedException`
- `src/libs/core/common/exceptions/forbidden.exception.ts` — existing `ForbiddenException`
- `src/libs/shared/http/filters/global-exception.filter.ts` — already maps exceptions to HTTP status

### DI Token Pattern

Follow the existing project pattern. Check `src/modules/user/constants/tokens.ts`:

```typescript
// src/modules/auth/constants/tokens.ts
export const AUTH_JWT_SERVICE_TOKEN = Symbol('IJwtTokenService');
export const AUTH_REFRESH_TOKEN_REPO_TOKEN = Symbol('IRefreshTokenRepository');
export const AUTH_TOKEN_READ_DAO_TOKEN = Symbol('ITokenReadDao');
```

### JwtModule Configuration

Use `JwtModule.registerAsync()` with `ConfigModule` for JWT secret:

```typescript
// In AuthModule
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    UserModule,
    SharedCqrsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  // ...
})
```

The access token TTL (15m) is configured here. The refresh token is a separate random token stored in DB with its own expiry.

### Refresh Token Design

The refresh token is **NOT a JWT**. It's a cryptographically random string that is:
1. Generated via `crypto.randomBytes(64).toString('hex')`
2. Hashed with `IHashService.hash()` before storage
3. Stored in `refresh_tokens` table with: id, userId, tokenHash, expiresAt, isRevoked, createdAt
4. Compared by hashing the incoming token and looking up the hash

This is more secure than JWT refresh tokens — stolen tokens can be revoked individually.

### Refresh Token Schema (Drizzle)

```typescript
export const refreshTokensTable = pgTable('refresh_tokens', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: varchar('user_id', { length: 50 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;    // user ID
  email: string;
  role: string;   // 'employee' | 'manager'
  iat: number;
  exp: number;
}
```

### Login Handler Logic

```
1. Find user by email via IUserRepository.findByEmail()
2. If null → throw UnauthorizedException with AUTH_INVALID_CREDENTIALS
   (DO NOT reveal "user not found" vs "wrong password" — same error for both)
3. Compare password via IHashService.compare(plain, hashed)
4. If mismatch → throw UnauthorizedException with AUTH_INVALID_CREDENTIALS
5. If user.isActive === false → throw ForbiddenException with AUTH_ACCOUNT_DISABLED
6. Generate accessToken via JwtTokenService (15m TTL)
7. Generate refreshToken (random bytes, 7d TTL)
8. Hash refreshToken, store via IRefreshTokenRepository.save()
9. Return { accessToken, refreshToken }
```

### Refresh Handler Logic

```
1. Hash the incoming refreshToken
2. Find by tokenHash via IRefreshTokenRepository.findByTokenHash()
3. If null or isRevoked → throw UnauthorizedException with AUTH_REFRESH_EXPIRED
4. If expiresAt < now → revoke + throw UnauthorizedException with AUTH_REFRESH_EXPIRED
5. Load user by userId from the token record
6. If user null or !user.isActive → revoke all + throw ForbiddenException with AUTH_ACCOUNT_DISABLED
7. Generate new accessToken via JwtTokenService
8. Return { accessToken }
```

### Auth Error Codes (UX Spec)

| Error Code | HTTP | When |
|------------|------|------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_ACCOUNT_DISABLED` | 403 | User isActive = false |
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh token expired/revoked/not found |

The global exception filter (`GlobalExceptionFilter`) already maps:
- `UnauthorizedException` → 401
- `ForbiddenException` → 403

So just throwing the domain exceptions with the right code is enough.

### Existing Exception Factory Methods

Use existing `UnauthorizedException` and `ForbiddenException` from `src/libs/core/common`:

```typescript
// For invalid credentials
throw new UnauthorizedException(
  'Email hoặc mật khẩu không chính xác',
  'AUTH_INVALID_CREDENTIALS',
);

// For disabled account
throw new ForbiddenException(
  'Tài khoản đã bị vô hiệu hóa',
  'AUTH_ACCOUNT_DISABLED',
);

// For expired refresh
throw new UnauthorizedException(
  'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'AUTH_REFRESH_EXPIRED',
);
```

### Rate Limiting (AC #7)

Story 1.5 handles global guards. For this story, add a simple rate limit using `@nestjs/throttler` or a manual rate-limit check in the login handler. If `@nestjs/throttler` is not installed, install it:

```bash
npm install @nestjs/throttler
```

If the team prefers to defer rate limiting to Story 1.5 (when global guards are set up), mark AC #7 as deferred in the completion notes.

### Import Aliases

```
src/libs/core/domain → @core/domain
src/libs/core/common → @core/common
src/libs/shared → @shared/...
src/modules/* → @modules/*
```

### Controller Pattern

Follow the existing `UserController` pattern exactly:
- Inject `ICommandBus` via `COMMAND_BUS_TOKEN`
- Dispatch commands, return DTOs
- No direct repository access from controller

### Anti-Patterns to AVOID

- **DO NOT** create a new `IHashService` — reuse `HASH_SERVICE_TOKEN` from UserModule
- **DO NOT** create a new `IUserRepository` — reuse `USER_REPOSITORY_TOKEN` from UserModule
- **DO NOT** reveal whether the email exists vs password is wrong — same `AUTH_INVALID_CREDENTIALS` error for both
- **DO NOT** store refresh tokens in plaintext — always hash with `IHashService.hash()`
- **DO NOT** use JWT for refresh tokens — use random bytes + DB storage
- **DO NOT** put auth guards in this story — that's Story 1.5
- **DO NOT** put `@Public()` decorator in this story — that's Story 1.5
- **DO NOT** return the password in any response
- **DO NOT** hardcode the JWT secret — use `ConfigService` + `JWT_SECRET` env var
- **DO NOT** import `@nestjs/common` decorators in domain layer files
- **DO NOT** throw raw `Error` — use `UnauthorizedException` / `ForbiddenException` from `src/libs/core/common`

### Story 1-2/1-3 Learnings to Carry Forward

- **Use `ICommandBus` via `COMMAND_BUS_TOKEN` injection** — not direct CommandBus import
- **`HASH_SERVICE_TOKEN` is exported from UserModule** — available for cross-module use
- **`UserModule` exports**: `USER_REPOSITORY_TOKEN`, `USER_READ_DAO_TOKEN`, `HASH_SERVICE_TOKEN`
- **`CreateUserHandler` injects `REQUEST_CONTEXT_TOKEN` as `@Optional()`** — pattern to follow
- **`ConflictException.duplicate()` uses Vietnamese suggestion** — follow same pattern for auth errors
- **Pre-existing compile errors from missing Product/Order modules** — not introduced by new code
- **`CommandRunnerModule` (not `CommandModule`)** from `nest-commander` — verify exact export names before using

### Module Registration in app.module.ts

The architecture specifies `AuthModule` should be registered after `UserModule`:

```typescript
// In app.module.ts imports array:
UserModule,
AuthModule,  // NEW — after UserModule since it imports UserModule
```

**DO NOT add `APP_GUARD` providers yet** — that's Story 1.5.

### File Structure — Files to Create/Modify

**New files:**
```
src/modules/auth/auth.module.ts
src/modules/auth/index.ts
src/modules/auth/constants/tokens.ts
src/modules/auth/domain/value-objects/token-pair.value-object.ts
src/modules/auth/domain/value-objects/index.ts
src/modules/auth/domain/services/index.ts
src/modules/auth/domain/repositories/i-refresh-token-repository.interface.ts
src/modules/auth/domain/repositories/index.ts
src/modules/auth/domain/index.ts
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
src/modules/auth/application/index.ts
src/modules/auth/infrastructure/http/auth.controller.ts
src/modules/auth/infrastructure/http/index.ts
src/modules/auth/infrastructure/services/jwt-token.service.ts
src/modules/auth/infrastructure/services/index.ts
src/modules/auth/infrastructure/persistence/drizzle/schema/refresh-token.schema.ts
src/modules/auth/infrastructure/persistence/drizzle/schema/index.ts
src/modules/auth/infrastructure/persistence/write/refresh-token.repository.ts
src/modules/auth/infrastructure/persistence/write/index.ts
src/modules/auth/infrastructure/persistence/read/token-read-dao.ts
src/modules/auth/infrastructure/persistence/read/index.ts
src/modules/auth/infrastructure/persistence/index.ts
src/modules/auth/infrastructure/index.ts
```

**Modified files:**
```
src/app.module.ts                                    — register AuthModule
src/libs/shared/database/drizzle/schema/index.ts     — register refreshTokensTable
package.json                                          — add JWT dependencies
```

### Testing Standards

- Unit tests for `LoginHandler` — mock `IUserRepository`, `IHashService`, `IJwtTokenService`, `IRefreshTokenRepository`
- Unit tests for `RefreshTokenHandler` — mock `IRefreshTokenRepository`, `IUserRepository`, `IJwtTokenService`
- Unit tests for `JwtTokenService` — generate/verify round-trip
- Test: invalid credentials return `AUTH_INVALID_CREDENTIALS`
- Test: disabled account returns `AUTH_ACCOUNT_DISABLED`
- Test: expired refresh returns `AUTH_REFRESH_EXPIRED`
- Test: revoked refresh returns `AUTH_REFRESH_EXPIRED`
- Test: refresh token is hashed before storage
- Test: password comparison uses `IHashService.compare()`
- Follow existing test patterns: `*.spec.ts`, mock via jest.fn()

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.1] — Auth Module architecture, schema, DI tokens
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 5.6] — FR-06 auth requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Error codes, response format
- [Source: src/modules/user/user.module.ts] — Exports HASH_SERVICE_TOKEN, USER_REPOSITORY_TOKEN
- [Source: src/modules/user/domain/services/hash.interface.ts] — IHashService interface
- [Source: src/modules/user/domain/entities/user.entity.ts] — User entity with isActive, email, role getters
- [Source: src/libs/core/common/exceptions/unauthorized.exception.ts] — UnauthorizedException
- [Source: src/libs/core/common/exceptions/forbidden.exception.ts] — ForbiddenException
- [Source: src/libs/shared/http/filters/global-exception.filter.ts] — Exception → HTTP mapping
- [Source: _bmad-output/implementation-artifacts/1-2-user-crud-commands-queries-api-endpoints.md] — Previous story learnings
- [Source: _bmad-output/implementation-artifacts/1-3-cli-seed-command-khoi-tao-user-ban-dau.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude (GLM-5 via Claude Code)

### Debug Log References

N/A

### Completion Notes List

- All JWT dependencies were pre-installed in package.json — no new installs needed
- Created complete Auth module following CQRS pattern matching existing UserModule
- LoginHandler: reuses USER_REPOSITORY_TOKEN and HASH_SERVICE_TOKEN from UserModule (no duplication)
- RefreshTokenHandler: hashes incoming token for lookup, handles expired/revoked/disabled cases
- JwtTokenService: wraps @nestjs/jwt JwtService, generates access tokens (15m TTL) and random refresh tokens (crypto.randomBytes)
- Refresh tokens are NOT JWTs — stored as hashed random strings in DB for individual revocation
- All error codes match UX spec: AUTH_INVALID_CREDENTIALS, AUTH_ACCOUNT_DISABLED, AUTH_REFRESH_EXPIRED
- Same error for "user not found" vs "wrong password" — no user enumeration leak
- AC #7 (rate limiting) deferred to Story 1.5 per Dev Notes guidance
- 17 new tests, 104 total — all pass, zero regressions

### File List

**New files:**
- src/modules/auth/auth.module.ts
- src/modules/auth/index.ts
- src/modules/auth/constants/tokens.ts
- src/modules/auth/constants/index.ts
- src/modules/auth/domain/value-objects/token-pair.value-object.ts
- src/modules/auth/domain/value-objects/index.ts
- src/modules/auth/domain/services/jwt-token.interface.ts
- src/modules/auth/domain/services/index.ts
- src/modules/auth/domain/repositories/i-refresh-token-repository.interface.ts
- src/modules/auth/domain/repositories/index.ts
- src/modules/auth/domain/index.ts
- src/modules/auth/application/commands/login.command.ts
- src/modules/auth/application/commands/refresh-token.command.ts
- src/modules/auth/application/commands/index.ts
- src/modules/auth/application/commands/handlers/login.handler.ts
- src/modules/auth/application/commands/handlers/refresh-token.handler.ts
- src/modules/auth/application/commands/handlers/index.ts
- src/modules/auth/application/dtos/login-request.dto.ts
- src/modules/auth/application/dtos/login-response.dto.ts
- src/modules/auth/application/dtos/refresh-token-request.dto.ts
- src/modules/auth/application/dtos/refresh-token-response.dto.ts
- src/modules/auth/application/dtos/index.ts
- src/modules/auth/application/index.ts
- src/modules/auth/application/queries/ports/i-token-read-dao.interface.ts
- src/modules/auth/infrastructure/http/auth.controller.ts
- src/modules/auth/infrastructure/http/index.ts
- src/modules/auth/infrastructure/services/jwt-token.service.ts
- src/modules/auth/infrastructure/services/jwt-token.service.spec.ts
- src/modules/auth/infrastructure/services/index.ts
- src/modules/auth/infrastructure/persistence/drizzle/schema/refresh-token.schema.ts
- src/modules/auth/infrastructure/persistence/drizzle/schema/index.ts
- src/modules/auth/infrastructure/persistence/write/refresh-token.repository.ts
- src/modules/auth/infrastructure/persistence/write/index.ts
- src/modules/auth/infrastructure/persistence/read/token-read-dao.ts
- src/modules/auth/infrastructure/persistence/read/index.ts
- src/modules/auth/infrastructure/persistence/index.ts
- src/modules/auth/infrastructure/index.ts
- src/modules/auth/application/commands/handlers/login.handler.spec.ts
- src/modules/auth/application/commands/handlers/refresh-token.handler.spec.ts

**Modified files:**
- src/app.module.ts — registered AuthModule
- src/libs/shared/database/drizzle/schema/index.ts — registered refreshTokensTable

### Review Findings (Adversarial Code Review — 2026-05-12)

**Decisions resolved:**
- [x] [Review][Dismissed] SHA-256 vs IHashService.hash() for refresh tokens — SHA-256 is correct for opaque token hashing (deterministic, standard practice). Spec updated to match implementation.
- [x] [Review][Dismissed] Refresh token rotation — rotation is kept; AC#2 updated to reflect { accessToken, refreshToken } response.
- [x] [Review][Defer] Rate limiting on login (AC#7) — deferred to Story 1-5 (global guards story). Reason: Story 1-5 is the architectural home for rate limiting.

**Patches applied:**
- [x] [Review][Patch] P1: Race condition on refresh — replaced SELECT+UPDATE with atomic `findAndRevokeByTokenHash` (UPDATE WHERE isRevoked=false RETURNING). [`refresh-token.handler.ts`, `refresh-token.repository.ts`]
- [x] [Review][Patch] P2: Unique constraint added to `tokenHash` column via `.unique()`. [`refresh-token.schema.ts:11`]
- [x] [Review][Patch] P3: Extracted shared `hashToken()` utility to `domain/services/token-hash.util.ts`. [`login.handler.ts`, `refresh-token.handler.ts`]
- [x] [Review][Patch] P4: Removed fallback `'dev-secret-change-in-production'` from `JwtModule.registerAsync`. [`auth.module.ts:28`]
- [x] [Review][Patch] P5: Token rotation now uses atomic find-and-revoke — old token is revoked in the same DB operation that finds it. [`refresh-token.handler.ts`]
- [x] [Review][Patch] P6: `TokenReadDao` changed to inject `DATABASE_READ_TOKEN` instead of `DATABASE_WRITE_TOKEN`. [`token-read-dao.ts:12`]
- [x] [Review][Patch] P7: Removed `isRevoked=false` filter from `findByTokenHash` — handler now owns the revoked-check logic. [`refresh-token.repository.ts:36`]

**Deferred:**
- [x] [Review][Defer] Expired tokens no cleanup mechanism — table grows unboundedly.
- [x] [Review][Defer] Refresh token TTL hardcoded (7 days) — not configurable via ConfigService.
- [x] [Review][Defer] No DB indexes on tokenHash/userId columns.
- [x] [Review][Defer] Unbounded refresh tokens per user — no limit on concurrent sessions.
- [x] [Review][Defer] No logout/revocation endpoint — not in scope for 1-4.
