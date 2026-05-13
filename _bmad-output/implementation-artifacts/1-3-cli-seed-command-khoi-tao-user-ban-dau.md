# Story 1.3: CLI Seed Command — Khởi tạo User ban đầu

Status: done

## Story

As an admin,
I want to run a CLI command to create the initial manager user,
so that the system has at least one manager to start using.

## Acceptance Criteria

1. **Given** UserModule with create-user command handler, **When** I run the CLI seed command with `--email`, `--password`, `--fullName`, `--role`, **Then** a user is created in the database with bcrypt-hashed password (salt >= 10)
2. Running seed with an existing email does NOT duplicate — returns a friendly error message and exits with code 1
3. Password is hashed with bcrypt using the same `IHashService` as the API create endpoint (Story 1-2)
4. The command defaults `--role` to `manager` if not specified
5. The command outputs the created user's ID, email, fullName, and role on success
6. Missing required arguments (`--email`, `--password`, `--fullName`) produce a clear usage error

## Tasks / Subtasks

- [x] Task 1: Install `@nestjs/command` dependency (if not already installed)
  - [x] Run `bun add nest-commander` — this is the NestJS CLI command package (note: package name is `nest-commander`, import is `@nestjs/command` or `nest-commander`)
- [x] Task 2: Create the seed CLI command (AC: #1, #4, #6)
  - [x] Create `src/modules/user/infrastructure/cli/seed.command.ts` — extends `CommandRunner` from `nest-commander`
  - [x] Use `@Command({ name: 'seed:user', ... })` decorator
  - [x] Use `@Option()` decorators for `--email`, `--password`, `--fullName`, `--role` (defaults to `manager`)
  - [x] Validate required args; print usage error and exit(1) if missing
  - [x] Create `src/modules/user/infrastructure/cli/index.ts` barrel
- [x] Task 3: Implement seed logic via CommandBus (AC: #1, #2, #3, #5)
  - [x] Inject `CommandBus` and dispatch `CreateUserCommand` with the provided arguments
  - [x] On success: log user info (id, email, fullName, role) — NEVER log the password
  - [x] On `ConflictException` (duplicate email): log friendly message, exit(1)
  - [x] On other errors: log error message, exit(1)
- [x] Task 4: Register seed command in UserModule (AC: #1)
  - [x] Import `CommandModule` from `nest-commander` in `UserModule`
  - [x] Register `SeedCommand` as a provider in `UserModule`
- [x] Task 5: Add convenience npm script (AC: #1)
  - [x] Add `"seed:user"` script to `package.json`
- [x] Task 6: Write tests (AC: #1, #2, #5)
  - [x] Unit test `SeedCommand.run()` — success case, duplicate email case, missing args case
  - [x] Verify CommandBus receives correct `CreateUserCommand`

## Dev Notes

### MUST-FOLLOW: Use nest-commander Package

Use `nest-commander` package (NestJS CLI command framework). This integrates with NestJS's module system and DI container natively — the seed command runs as a first-class NestJS provider.

**Install:** `bun add nest-commander`

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';

@Command({ name: 'seed:user', description: 'Create an initial user' })
export class SeedCommand extends CommandRunner {
  constructor(private readonly commandBus: CommandBus) { super(); }

  async run(
    passedParams: string[],
    options: { email?: string; password?: string; fullName?: string; role?: string },
  ): Promise<void> {
    const { email, password, fullName, role = 'manager' } = options;
    if (!email || !password || !fullName) {
      console.error('❌ Missing required arguments.');
      console.error('Usage: ...');
      process.exit(1);
    }

    try {
      const result = await this.commandBus.execute(
        new CreateUserCommand(email, password, fullName, role),
      );
      console.log('✅ User created:');
      console.log(`   id: ${result.id}`);
      console.log(`   email: ${result.email}`);
      console.log(`   fullName: ${result.fullName}`);
      console.log(`   role: ${result.role}`);
    } catch (error) {
      if (error instanceof ConflictException) {
        console.error(`❌ User with email "${email}" already exists.`);
        process.exit(1);
      }
      console.error('❌ Failed to create user:', error.message);
      process.exit(1);
    }
  }

  @Option({ flags: '-e, --email <email>', description: 'User email (required)' })
  parseEmail(val: string) { return val; }

  @Option({ flags: '-p, --password <password>', description: 'User password (required)' })
  parsePassword(val: string) { return val; }

  @Option({ flags: '-n, --fullName <name>', description: 'Full name (required)' })
  parseFullName(val: string) { return val; }

  @Option({ flags: '-r, --role <role>', description: 'Role: employee|manager', defaultValue: 'manager' })
  parseRole(val: string) { return val; }
}
```

### REUSE Existing CQRS Pipeline — Do NOT Recreate

The seed command is just a different entry point to the **same** CQRS pipeline:

```
SeedCommand → CommandBus → CreateUserHandler → UserRepository → DB
                              ↑
                         BcryptHashService (password hashing, salt >= 10)
                         ConflictException (duplicate email check)
                         UserCreatedEvent → UserReadModelProjection
```

**Reuse these exactly (DO NOT recreate):**
- `CreateUserCommand` — `src/modules/user/application/commands/create-user.command.ts`
- `CreateUserHandler` — `src/modules/user/application/commands/handlers/create-user.handler.ts`
- `IUserRepository` — email uniqueness check already implemented
- `BcryptHashService` — password hashing with salt >= 10 already implemented
- `User.create()` — domain entity factory with validation and event emission

By dispatching `CreateUserCommand` through `CommandBus`, you get for free:
- Email uniqueness validation (ConflictException on duplicate)
- Password bcrypt hashing (via IHashService)
- Domain event emission (UserCreatedEvent)
- Read model projection update (UserReadModelProjection)

### Files to READ FIRST

- `src/modules/user/application/commands/create-user.command.ts` — command class to dispatch
- `src/modules/user/application/commands/handlers/create-user.handler.ts` — handler with all validation
- `src/modules/user/user.module.ts` — current DI wiring (must add SeedCommand provider)
- `src/modules/user/constants/tokens.ts` — DI tokens

### Module Registration

The `SeedCommand` must be registered as a provider in `UserModule`. Import `CommandModule` from `nest-commander`:

```typescript
// user.module.ts — add:
import { CommandModule } from 'nest-commander';
import { SeedCommand } from './infrastructure/cli';

@Module({
  imports: [SharedCqrsModule, CommandModule],
  providers: [
    // ... existing providers ...
    SeedCommand,
  ],
  // ... rest unchanged ...
})
```

### CLI Execution

Run via nest CLI:
```bash
npx nest command seed:user --email admin@example.com --password Admin@123 --fullName "Admin User"
```

With short flags (role defaults to manager):
```bash
npx nest command seed:user -e admin@example.com -p Admin@123 -n "Admin User"
```

Create employee:
```bash
npx nest command seed:user -e employee@example.com -p Pass@123 -n "Employee" -r employee
```

### Package Manager: bun

This project uses `bun@1.1.0` (see `package.json` → `packageManager`). When installing:
```bash
bun add nest-commander
```

### NPM Script

Add to `package.json` scripts:
```json
"seed:user": "nest command seed:user"
```

Usage: `bun run seed:user -- --email admin@example.com --password Admin@123 --fullName "Admin User"`

### Security Considerations

- **NEVER log the password** — only print id, email, fullName, role on success
- Password is passed as CLI argument — visible in process list. Acceptable for admin initialization on trusted machine
- `UserDto` (returned by `CreateUserHandler`) never includes password — safe to log

### REQUEST_CONTEXT_TOKEN in CLI Context

`CreateUserHandler` injects `REQUEST_CONTEXT_TOKEN` as `@Optional()`. When running from CLI (no HTTP request), this will be `undefined`:

```typescript
// In CreateUserHandler:
const context = this.requestContext?.current();  // undefined from CLI
const eventMetadata = context ? { ... } : undefined;  // undefined → events created without correlation IDs
```

This is safe. Events will be created without correlation/causation IDs, which is acceptable for CLI operations.

### ConflictException Import

`CreateUserHandler` throws `ConflictException` from `src/libs/core/common`. Import it in the seed command to catch:

```typescript
import { ConflictException } from 'src/libs/core/common';
```

Check the exact export path by reading `src/libs/core/common/index.ts`.

### Import Aliases

```
src/libs/core/domain → @core/domain
src/libs/core/common → @core/common
src/libs/shared → @shared/...
src/modules/* → @modules/*
```

### Testing Strategy

For `SeedCommand`, unit test by mocking `CommandBus`:

```typescript
// seed.command.spec.ts
describe('SeedCommand', () => {
  let command: SeedCommand;
  let commandBus: CommandBus;

  beforeEach(() => {
    commandBus = { execute: jest.fn() } as any;
    command = new SeedCommand(commandBus);
  });

  it('should dispatch CreateUserCommand with correct args', async () => {
    commandBus.execute = jest.fn().mockResolvedValue({ id: '123', email: 'a@b.c', ... });
    await command.run([], { email: 'a@b.c', password: 'pass', fullName: 'Test', role: 'manager' });
    expect(commandBus.execute).toHaveBeenCalledWith(
      new CreateUserCommand('a@b.c', 'pass', 'Test', 'manager'),
    );
  });

  it('should exit(1) on missing required args', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(command.run([], { email: 'a@b.c' })).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should handle duplicate email', async () => {
    commandBus.execute = jest.fn().mockRejectedValue(new ConflictException('duplicate'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(
      command.run([], { email: 'a@b.c', password: 'pass', fullName: 'Test' }),
    ).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});
```

### Anti-Patterns to AVOID

- **DO NOT** duplicate user creation logic — dispatch `CreateUserCommand` through `CommandBus`
- **DO NOT** hash passwords manually — `CreateUserHandler` already uses `IHashService`
- **DO NOT** access the database directly — go through the CQRS pipeline
- **DO NOT** silently fail on duplicate email — exit(1) with clear message
- **DO NOT** log the password in any output — only print non-sensitive user fields
- **DO NOT** use `process.exit(0)` on error — use `process.exit(1)` for failures
- **DO NOT** create a standalone script with `NestFactory.createApplicationContext()` — use `nest-commander` for proper NestJS integration
- **DO NOT** put CLI files outside the user module — keep in `src/modules/user/infrastructure/cli/`

### Story 1-2 Review Findings Relevant to This Story

- **CreateUserHandler uses `randomUUID()`** — IDs generated automatically in handler, not passed from CLI
- **`ConflictException.duplicate('User', 'email', email)`** — exact error to catch for duplicate email
- **`HASH_SERVICE_TOKEN` exported from UserModule** — available via DI for CommandBus pipeline
- **`UserReadModelProjection` subscribes to `UserCreatedEvent`** — will automatically update read model when seed creates a user

### File Structure — Files to Create/Modify

**New files:**
```
src/modules/user/infrastructure/cli/seed.command.ts    (new — CLI seed command)
src/modules/user/infrastructure/cli/seed.command.spec.ts (new — unit tests)
src/modules/user/infrastructure/cli/index.ts            (new — barrel)
```

**Modified files:**
```
src/modules/user/user.module.ts  (add CommandModule import, SeedCommand provider)
package.json                     (add "seed:user" script, add nest-commander dependency)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.2] — User module structure
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#Section 5.6] — FR-06 auth requirements
- [Source: src/modules/user/application/commands/handlers/create-user.handler.ts] — Handler to reuse
- [Source: src/modules/user/application/commands/create-user.command.ts] — Command to dispatch
- [Source: src/modules/user/user.module.ts] — Module DI wiring to update
- [Source: src/modules/user/constants/tokens.ts] — DI tokens
- [Source: src/modules/user/infrastructure/services/bcrypt-hash.service.ts] — Bcrypt implementation
- [Source: _bmad-output/implementation-artifacts/1-2-user-crud-commands-queries-api-endpoints.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

glm-5[1m]

### Debug Log References

- Story specified importing `CommandModule` from `nest-commander` — actual export is `CommandRunnerModule`. Used `CommandRunnerModule` for correct import.
- Story specified `CommandBus` injection directly — actual project pattern uses `ICommandBus` via `COMMAND_BUS_TOKEN` DI injection. Updated to match existing controller pattern.
- Pre-existing compile errors from missing Product/Order modules — not introduced by this story.

### Completion Notes List

- Task 1: Installed `nest-commander@3.20.1` via npm
- Task 2: Created `SeedCommand` extending `CommandRunner` with `@Option()` decorators for `-e`, `-p`, `-n`, `-r` flags; role defaults to `manager`
- Task 3: Command dispatches `CreateUserCommand` via `ICommandBus` (injected via `COMMAND_BUS_TOKEN`), catches `ConflictException` for duplicate email, handles generic errors
- Task 4: Registered `SeedCommand` in `UserModule` with `CommandRunnerModule` import
- Task 5: Added `"seed:user": "nest command seed:user"` script to package.json
- Task 6: 11 unit tests covering success, role defaults, duplicate email, missing args, password not logged, unexpected errors
- Total: 87 tests pass (11 new), 0 regressions

### File List

- `src/modules/user/infrastructure/cli/seed.command.ts` (new)
- `src/modules/user/infrastructure/cli/seed.command.spec.ts` (new)
- `src/modules/user/infrastructure/cli/index.ts` (new)
- `src/modules/user/user.module.ts` (modified — added CommandRunnerModule import, SeedCommand provider)
- `package.json` (modified — added nest-commander dependency, seed:user script)

### Review Findings

- [x] [Review][Patch] CLI validates role against `['employee', 'manager']` in `parseRole()` before dispatching command. [`seed.command.ts`]
- [x] [Review][Patch] Generic catch uses `error instanceof Error ? error.message : String(error)`. [`seed.command.ts`]
- [x] [Review][Defer] Password length not validated at CLI level — help text says "min 8 chars" but only domain non-empty check runs. Deferred: domain-level password strength enhancement deferred from Story 1-1.
- [x] [Review][Defer] Email not normalized to lowercase — `Admin@Test.com` ≠ `admin@test.com`. Deferred: email normalization strategy needs product decision.
- [x] [Review][Defer] `findByEmail` + `isDeleted` filter frees soft-deleted user's email for reuse. Deferred: business logic gap needs product decision.
- [x] [Review][Defer] Test doesn't cover `DomainException` propagation from invalid email/role. Deferred: minor test coverage gap.
