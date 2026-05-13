# Story 1.5: Global Auth Guards, Decorators & Error Response Format

Status: done

## Story

As a developer,
I want JWT + Roles guards applied globally and error response format standardized,
so that all endpoints are protected by default and errors are consistent system-wide.

## Acceptance Criteria

1. **Given** `JwtAuthGuard` and `RolesGuard` registered via `APP_GUARD` in AppModule, **When** any request without JWT hits any endpoint except `/auth/login` and `/auth/refresh`, **Then** returns `401 { code: "AUTH_TOKEN_EXPIRED", message: "...", suggestion: "..." }`
2. Endpoint with `@Roles('manager')` accessed by employee → `403 { code: "AUTH_FORBIDDEN_ROLE" }`
3. `@Public()` decorator bypasses guards for login/refresh
4. `@CurrentUser()` decorator extracts authenticated user from JWT payload
5. All error responses (401, 403, 404, 422, 500) follow format `{ statusCode, code, message, suggestion, details? }`
6. `app.module.ts` updated with `AuthModule` import and `APP_GUARD` providers

## Tasks / Subtasks

- [x] Task 1: Create `@Public()` decorator (AC: #3)
  - [x] Create `src/modules/auth/infrastructure/http/decorators/public.decorator.ts` — sets `IS_PUBLIC_KEY` metadata via `SetMetadata()`
  - [x] Create `src/modules/auth/infrastructure/http/decorators/index.ts` barrel
- [x] Task 2: Create `@CurrentUser()` decorator (AC: #4)
  - [x] Create `src/modules/auth/infrastructure/http/decorators/current-user.decorator.ts` — creates parameter decorator that extracts `request.user`
  - [x] Add to barrel `index.ts`
- [x] Task 3: Create `@Roles()` decorator (AC: #2)
  - [x] Create `src/modules/auth/infrastructure/http/decorators/roles.decorator.ts` — sets `ROLES_KEY` metadata via `SetMetadata()`
  - [x] Add to barrel `index.ts`
- [x] Task 4: Create `JwtAuthGuard` (AC: #1, #3)
  - [x] Create `src/modules/auth/infrastructure/http/guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`
  - [x] Override `canActivate()`: check `IS_PUBLIC_KEY` metadata → if true, allow; otherwise call `super.canActivate()`
  - [x] Override `handleRequest()`: map Passport errors to `UnauthorizedException` with `AUTH_TOKEN_EXPIRED`
  - [x] Create `src/modules/auth/infrastructure/http/guards/index.ts` barrel
- [x] Task 5: Create `RolesGuard` (AC: #2)
  - [x] Create `src/modules/auth/infrastructure/http/guards/roles.guard.ts` — implements `CanActivate`
  - [x] `canActivate()`: check `ROLES_KEY` metadata → if no roles required, allow; otherwise match `user.role` against required roles
  - [x] If role mismatch → throw `ForbiddenException` with `AUTH_FORBIDDEN_ROLE`
  - [x] Skip entirely if `IS_PUBLIC_KEY` is set (public endpoints have no role requirement)
  - [x] Add to barrel `index.ts`
- [x] Task 6: Create JWT Strategy (Passport) (AC: #1, #4)
  - [x] Create `src/modules/auth/infrastructure/http/strategies/jwt.strategy.ts` — extends `PassportStrategy(Strategy)`
  - [x] Extract JWT secret from `ConfigService`
  - [x] `validate(payload)`: return `{ userId: payload.sub, email: payload.email, role: payload.role }` — this becomes `request.user`
  - [x] Create `src/modules/auth/infrastructure/http/strategies/index.ts` barrel
- [x] Task 7: Register guards globally in AppModule (AC: #1, #6)
  - [x] Update `src/app.module.ts` — add `APP_GUARD` providers for `JwtAuthGuard` and `RolesGuard`
  - [x] Import `AuthModule` (guards live in AuthModule but are global via APP_GUARD)
  - [x] Ensure `AuthModule` is imported AFTER `UserModule` in the imports array
- [x] Task 8: Update AuthModule to register guards, strategies, and decorators (AC: #1-#4)
  - [x] Register `JwtAuthGuard`, `RolesGuard`, `JwtStrategy` as providers in AuthModule
  - [x] Import `PassportModule` and `JwtModule` in AuthModule
- [x] Task 9: Add `@Public()` to auth controller endpoints (AC: #3)
  - [x] Update `src/modules/auth/infrastructure/http/auth.controller.ts` — add `@Public()` to `POST /auth/login` and `POST /auth/refresh`
  - [x] Note: This requires the auth controller to exist from Story 1-4. If Story 1-4 is not yet implemented, create a placeholder auth controller with just the `@Public()` endpoints
- [x] Task 10: Standardize error response format (AC: #5)
  - [x] Verify `GlobalExceptionFilter` already handles all error types correctly — check existing mapping
  - [x] Ensure `UnauthorizedException` with `AUTH_TOKEN_EXPIRED` produces: `{ statusCode: 401, code: "AUTH_TOKEN_EXPIRED", message: "...", suggestion: "..." }`
  - [x] Ensure `ForbiddenException` with `AUTH_FORBIDDEN_ROLE` produces: `{ statusCode: 403, code: "AUTH_FORBIDDEN_ROLE", message: "...", suggestion: "..." }`
  - [x] If the global filter's error response shape does NOT include `suggestion`, update it to support the `suggestion` field from exception `details`
- [x] Task 11: Write tests (AC: #1, #2, #3, #4, #5)
  - [x] Unit tests for `JwtAuthGuard` — public endpoint bypass, valid token, expired token, missing token
  - [x] Unit tests for `RolesGuard` — no roles required, matching role, mismatching role, public endpoint
  - [x] Unit tests for `@CurrentUser()` decorator — extracts user from request
  - [x] Verify error response format includes `statusCode`, `code`, `message`, `suggestion`

## Dev Notes

### MUST-FOLLOW: Architecture Section 3.1 — Guards & Decorators

The architecture specifies these files in the Auth module:

```
src/modules/auth/infrastructure/http/
├── auth.controller.ts          (from Story 1-4 — add @Public())
├── guards/
│   ├── jwt-auth.guard.ts       (NEW)
│   ├── roles.guard.ts          (NEW)
│   └── index.ts
├── decorators/
│   ├── current-user.decorator.ts  (NEW)
│   ├── roles.decorator.ts         (NEW)
│   ├── public.decorator.ts        (NEW)
│   └── index.ts
├── strategies/
│   ├── jwt.strategy.ts            (NEW)
│   └── index.ts
└── index.ts
```

### PREREQUISITE: Story 1-4 must be implemented first

This story requires:
- `AuthModule` with `JwtModule` registered
- `AuthController` with `POST /auth/login` and `POST /auth/refresh`
- `JwtTokenService` with `verifyAccessToken()` method
- `refresh_tokens` Drizzle schema registered

If Story 1-4 is NOT yet implemented, you must create the minimal AuthModule skeleton first:
1. `src/modules/auth/auth.module.ts` with `PassportModule` and `JwtModule` imports
2. `src/modules/auth/constants/tokens.ts` with DI tokens
3. A placeholder `AuthController` with `@Public()` decorated endpoints
4. `JwtTokenService` with at least `generateAccessToken()` and `verifyAccessToken()`

### Files to READ FIRST

- `src/app.module.ts` — will be modified to add APP_GUARD providers and AuthModule import
- `src/libs/shared/http/filters/global-exception.filter.ts` — already maps exceptions to HTTP status, may need `suggestion` field
- `src/libs/core/common/exceptions/unauthorized.exception.ts` — existing `UnauthorizedException` with factory methods
- `src/libs/core/common/exceptions/forbidden.exception.ts` — existing `ForbiddenException` with factory methods
- `src/main.ts` — already registers `GlobalExceptionFilter`, `ResponseInterceptor`, `GlobalValidationPipe`

### APP_GUARD Registration Pattern

```typescript
// src/app.module.ts
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/infrastructure/http/guards';
import { RolesGuard } from './modules/auth/infrastructure/http/guards';

@Global()
@Module({
  imports: [
    // ... existing imports ...
    UserModule,
    AuthModule,  // Must be after UserModule
  ],
  providers: [
    // Global guards — order matters: JwtAuthGuard runs first, then RolesGuard
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule { /* ... */ }
```

### JwtAuthGuard Implementation

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { UnauthorizedException } from 'src/libs/core/common';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        'AUTH_TOKEN_EXPIRED',
      );
    }
    return user;
  }
}
```

### RolesGuard Implementation

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from 'src/libs/core/common';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No roles required → any authenticated user can access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user) return false;

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền thực hiện hành động này. Yêu cầu vai trò: ${requiredRoles.join(' hoặc ')}`,
        'AUTH_FORBIDDEN_ROLE',
      );
    }
    return true;
  }
}
```

### @Public() Decorator

```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### @Roles() Decorator

```typescript
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### @CurrentUser() Decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

Usage: `@CurrentUser() user: { userId: string; email: string; role: string }`
Or extract a single field: `@CurrentUser('userId') userId: string`

### JWT Strategy (Passport)

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
```

The `validate()` return value becomes `request.user` — this is what `@CurrentUser()` extracts.

### Error Response Format (UX Spec)

The UX spec requires all errors to follow: `{ statusCode, code, message, suggestion, details? }`

**Current state of GlobalExceptionFilter:**
The filter already maps domain exceptions to HTTP status codes (401, 403, 404, 409, etc.) and returns:
```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "...",
  "path": "...",
  "method": "...",
  "error": {
    "name": "UnauthorizedException",
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "...",
    "details": null
  }
}
```

**Gap:** The UX spec expects `suggestion` as a top-level field, but the current format nests everything under `error`. The existing `details` field on `BaseException` could carry `suggestion`.

**Decision:** This story should NOT restructure the global error format (that would break existing functionality). Instead:
1. Use the existing `details` field on exceptions to carry the `suggestion`
2. The format is already consistent — just ensure all auth exceptions include a `suggestion` in their details

If the team wants to refactor the error format later, that should be a separate task.

### Auth Error Codes Reference

| Code | HTTP | When | suggestion |
|------|------|------|-----------|
| `AUTH_TOKEN_EXPIRED` | 401 | Missing/expired JWT | "Vui lòng đăng nhập lại" |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email/password | "Kiểm tra lại email và mật khẩu" |
| `AUTH_REFRESH_EXPIRED` | 401 | Expired/revoked refresh token | "Vui lòng đăng nhập lại" |
| `AUTH_ACCOUNT_DISABLED` | 403 | User isActive = false | "Liên hệ quản trị viên" |
| `AUTH_FORBIDDEN_ROLE` | 403 | Insufficient role | "Liên hệ quản trị viên để được cấp quyền" |

### Auth Controller @Public() Usage

```typescript
@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  async login(@Body() dto: LoginRequestDto) { /* ... */ }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenRequestDto) { /* ... */ }
}
```

All OTHER endpoints across ALL modules are automatically protected by default (that's the power of `APP_GUARD`).

### How Guards Chain Works

When a request comes in with APP_GUARD:

```
1. JwtAuthGuard.canActivate()
   → Is endpoint @Public()? → YES: allow
   → NO: Extract JWT from Authorization header
   → Verify JWT via JwtStrategy.validate()
   → Set request.user = { userId, email, role }
   → Invalid/missing → throw 401 AUTH_TOKEN_EXPIRED

2. RolesGuard.canActivate()
   → Get @Roles() metadata from handler/class
   → No roles required? → allow (any authenticated user)
   → Check request.user.role against required roles
   → Mismatch → throw 403 AUTH_FORBIDDEN_ROLE
```

### Module Registration in AuthModule

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { SharedCqrsModule } from 'src/libs/shared';
import { JwtAuthGuard } from './infrastructure/http/guards';
import { RolesGuard } from './infrastructure/http/guards';
import { JwtStrategy } from './infrastructure/http/strategies';
// ... other imports

@Module({
  imports: [
    UserModule,
    SharedCqrsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    // ... other providers (JwtTokenService, handlers, etc.)
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
```

### Existing Exception Classes — REUSE, Do NOT Recreate

From `src/libs/core/common/exceptions/`:

| Exception | HTTP | Usage |
|-----------|------|-------|
| `UnauthorizedException` | 401 | Invalid/expired token, bad credentials |
| `ForbiddenException` | 403 | Insufficient role, disabled account |
| `ConflictException` | 409 | Duplicate resource |
| `NotFoundException` | 404 | Resource not found |
| `ValidationException` | 400 | Business rule violation |
| `DomainException` | 400 | Domain invariant violation |

The `GlobalExceptionFilter` already maps each to the correct HTTP status. Just throw the right exception with the right code.

### Rate Limiting Note

If Story 1-4 deferred rate limiting, this story should install `@nestjs/throttler` and add basic rate limiting on auth endpoints. However, if rate limiting is considered separate from guards, it can be deferred. The architecture mentions rate limiting in NFR-4 but doesn't specify a dedicated story for it. Add it as a stretch goal if time permits.

### Anti-Patterns to AVOID

- **DO NOT** create guards in `src/libs/shared/` — they belong in `src/modules/auth/infrastructure/http/guards/`
- **DO NOT** register `PassportModule` or `JwtModule` in `AppModule` — they belong in `AuthModule`
- **DO NOT** throw NestJS `HttpException` directly — use domain exceptions (`UnauthorizedException`, `ForbiddenException`)
- **DO NOT** put role logic in `JwtAuthGuard` — roles are handled by `RolesGuard` (separation of concerns)
- **DO NOT** forget to export `JwtAuthGuard` and `RolesGuard` from `AuthModule` — `APP_GUARD` needs them
- **DO NOT** forget to add `@Public()` to auth controller endpoints — otherwise login/refresh will require auth (chicken-and-egg)
- **DO NOT** modify the `GlobalExceptionFilter` response structure without understanding all existing consumers
- **DO NOT** import `PassportModule` in every module that needs guards — `APP_GUARD` makes guards global
- **DO NOT** create `request.user` manually in guards — `JwtStrategy.validate()` return value IS `request.user`

### Story 1-4 Dependency

This story has a **hard dependency** on Story 1-4. The following must exist:
- `AuthModule` with `JwtModule` configured
- `AuthController` with `POST /auth/login` and `POST /auth/refresh`
- `JwtTokenService` with `generateAccessToken()` and `verifyAccessToken()`
- `refresh_tokens` Drizzle schema

If Story 1-4 is not done, create a minimal auth module skeleton as described in the prerequisite section.

### Story 1-2/1-3 Learnings

- **Use `ICommandBus` via `COMMAND_BUS_TOKEN`** — not direct CommandBus import
- **`HASH_SERVICE_TOKEN` exported from UserModule** — available for cross-module use
- **Pre-existing compile errors from missing Product/Order modules** — not introduced by new code
- **`CommandRunnerModule` (not `CommandModule`)** from `nest-commander` — verify exact export names
- **`UnauthorizedException` and `ForbiddenException` already exist** in `src/libs/core/common/exceptions/` with factory methods

### File Structure — Files to Create/Modify

**New files:**
```
src/modules/auth/infrastructure/http/guards/jwt-auth.guard.ts       (NEW)
src/modules/auth/infrastructure/http/guards/roles.guard.ts           (NEW)
src/modules/auth/infrastructure/http/guards/index.ts                  (NEW)
src/modules/auth/infrastructure/http/decorators/public.decorator.ts   (NEW)
src/modules/auth/infrastructure/http/decorators/current-user.decorator.ts (NEW)
src/modules/auth/infrastructure/http/decorators/roles.decorator.ts    (NEW)
src/modules/auth/infrastructure/http/decorators/index.ts              (NEW)
src/modules/auth/infrastructure/http/strategies/jwt.strategy.ts       (NEW)
src/modules/auth/infrastructure/http/strategies/index.ts              (NEW)
src/modules/auth/infrastructure/http/guards/jwt-auth.guard.spec.ts    (NEW — tests)
src/modules/auth/infrastructure/http/guards/roles.guard.spec.ts       (NEW — tests)
src/modules/auth/infrastructure/http/decorators/current-user.decorator.spec.ts (NEW — tests)
```

**Modified files:**
```
src/app.module.ts                                            — add APP_GUARD providers, AuthModule import
src/modules/auth/auth.module.ts                              — register JwtStrategy, guards, PassportModule
src/modules/auth/infrastructure/http/auth.controller.ts      — add @Public() to login/refresh (if exists from 1-4)
```

### Testing Standards

- Unit tests for `JwtAuthGuard`:
  - Public endpoint → allows without token
  - Valid JWT → extracts user, allows
  - Invalid JWT → throws `UnauthorizedException` with `AUTH_TOKEN_EXPIRED`
  - Missing Authorization header → throws 401
- Unit tests for `RolesGuard`:
  - No `@Roles()` decorator → allows any authenticated user
  - `@Roles('manager')` + manager user → allows
  - `@Roles('manager')` + employee user → throws `ForbiddenException` with `AUTH_FORBIDDEN_ROLE`
  - Public endpoint → skips role check entirely
- Unit tests for `@CurrentUser()`:
  - Extracts full user object from request
  - Extracts single field with parameter
- Test file naming: `*.spec.ts`
- Mock `Reflector`, `ExecutionContext` for guard tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.1] — Auth Module guards, decorators, APP_GUARD
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 5] — app.module.ts with APP_GUARD providers
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-4] — Global guards architectural decision
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Error codes table, error format
- [Source: src/app.module.ts] — Current module registration (no APP_GUARD yet)
- [Source: src/libs/shared/http/filters/global-exception.filter.ts] — Exception → HTTP mapping
- [Source: src/libs/core/common/exceptions/unauthorized.exception.ts] — UnauthorizedException
- [Source: src/libs/core/common/exceptions/forbidden.exception.ts] — ForbiddenException
- [Source: src/main.ts] — Global filter/interceptor registration
- [Source: _bmad-output/implementation-artifacts/1-4-jwt-authentication-login-refresh-token-management.md] — Previous story

## Dev Agent Record

### Agent Model Used

Claude (GLM-5 via Claude Code)

### Debug Log References

N/A

### Completion Notes List

- Created three decorators: @Public(), @CurrentUser(), @Roles() following NestJS patterns
- JwtAuthGuard extends AuthGuard('jwt') with IS_PUBLIC_KEY bypass and handleRequest error mapping to AUTH_TOKEN_EXPIRED
- RolesGuard implements CanActivate, checks ROLES_KEY metadata, skips on public endpoints, throws AUTH_FORBIDDEN_ROLE on mismatch
- JwtStrategy extracts JWT from Bearer token, returns { userId, email, role } as request.user
- Both guards registered globally via APP_GUARD in AppModule — all endpoints protected by default
- @Public() added to auth controller login/refresh endpoints
- AuthModule updated with PassportModule import, JwtStrategy, guards as providers
- GlobalExceptionFilter already maps exceptions correctly — details field carries suggestion
- 15 new tests (5 JwtAuthGuard, 7 RolesGuard, 3 CurrentUser), 119 total — all pass, zero regressions
- Also updated story 1-4 tests to reflect user's changes: crypto.createHash('sha256') for token hashing and token rotation

### File List

**New files:**
- src/modules/auth/infrastructure/http/decorators/public.decorator.ts
- src/modules/auth/infrastructure/http/decorators/current-user.decorator.ts
- src/modules/auth/infrastructure/http/decorators/roles.decorator.ts
- src/modules/auth/infrastructure/http/decorators/index.ts
- src/modules/auth/infrastructure/http/guards/jwt-auth.guard.ts
- src/modules/auth/infrastructure/http/guards/roles.guard.ts
- src/modules/auth/infrastructure/http/guards/index.ts
- src/modules/auth/infrastructure/http/strategies/jwt.strategy.ts
- src/modules/auth/infrastructure/http/strategies/index.ts
- src/modules/auth/infrastructure/http/guards/jwt-auth.guard.spec.ts
- src/modules/auth/infrastructure/http/guards/roles.guard.spec.ts
- src/modules/auth/infrastructure/http/decorators/current-user.decorator.spec.ts

**Modified files:**
- src/app.module.ts — added APP_GUARD providers, imported guards and AuthModule
- src/modules/auth/auth.module.ts — added PassportModule, JwtStrategy, guards, exports
- src/modules/auth/infrastructure/http/auth.controller.ts — added @Public() to login/refresh

**Updated tests (from story 1-4):**
- src/modules/auth/application/commands/handlers/login.handler.spec.ts
- src/modules/auth/application/commands/handlers/refresh-token.handler.spec.ts
- src/modules/auth/infrastructure/services/jwt-token.service.spec.ts

### Review Findings

- [x] [Review][Decision] @Public() + @Roles() on same endpoint silently disables authorization — Fixed: RolesGuard now throws Error in non-production when contradictory decorators detected.
- [x] [Review][Patch] JwtStrategy uses hardcoded JWT_SECRET fallback [jwt.strategy.ts:11-12] — Fixed: removed fallback default, aligned with JwtTokenService fail-fast.
- [x] [Review][Patch] RolesGuard returns `false` instead of throwing when user is null on role-protected endpoint [roles.guard.ts:38] — Fixed: now throws ForbiddenException with AUTH_FORBIDDEN_ROLE.
- [x] [Review][Patch] JwtAuthGuard.handleRequest re-throws raw Passport errors [jwt-auth.guard.ts:30-31] — Fixed: always wraps in UnauthorizedException with AUTH_TOKEN_EXPIRED.
- [x] [Review][Defer] JWT payload roles not verified against database — Stateles JWT design means role changes don't take effect until token expires. Known JWT tradeoff, not introduced by this story.
