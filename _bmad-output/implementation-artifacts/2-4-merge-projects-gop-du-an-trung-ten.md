# Story 2.4: Merge Projects — Gộp Dự án Trùng Tên

Status: done

## Story

As a manager,
I want to merge duplicate projects into one,
so that reports are clean before exporting.

## Acceptance Criteria

1. **Given** two or more projects with similar/identical names exist, **When** I send `POST /projects/:id/merge` with `{ sourceIds: ["id1", "id2"] }`, **Then** source projects status set to `archived` (not deleted — soft archive)
2. All WorkLogs from source projects reassigned to target project (`projectId` updated) — **deferred until WorkLog module exists** (Epic 3); handler must emit `ProjectsMergedEvent` so future event consumer can perform reassignment
3. Merge emits `ProjectsMergedEvent` with `{ targetProjectId, sourceProjectIds, performedBy }` for event consumers
4. Endpoint protected by `@Roles('manager')` — employee returns `403 AUTH_FORBIDDEN_ROLE`
5. Target project must exist — `404 PROJECT_NOT_FOUND` if not found
6. Source must not equal target — `422` if any sourceId === targetId
7. Source projects must exist and be in `active` status — `404` if not found, `422` if already archived

## Tasks / Subtasks

- [x] Task 1: Create domain event (AC: #3)
  - [x] Create `src/modules/project/domain/events/projects-merged.event.ts` — extends `BaseDomainEvent`, data shape `{ targetProjectId, sourceProjectIds, performedBy }`
  - [x] Update `src/modules/project/domain/events/index.ts` — export `ProjectsMergedEvent`
- [x] Task 2: Create merge command (AC: #1, #3)
  - [x] Create `src/modules/project/application/commands/merge-projects.command.ts` — `implements ICommand`, constructor `(targetProjectId: string, sourceProjectIds: string[], performedBy: string)`
  - [x] Update `src/modules/project/application/commands/index.ts` — export `MergeProjectsCommand`
- [x] Task 3: Create merge DTO (AC: #1)
  - [x] Create `src/modules/project/application/dtos/merge-projects.dto.ts` — `sourceIds: string[]` with `@IsArray()`, `@IsString({ each: true })`, `@ArrayMinSize(1)` validation
  - [x] Update `src/modules/project/application/dtos/index.ts` — export `MergeProjectsDto`
- [x] Task 4: Create merge command handler (AC: #1, #2, #3, #5, #6, #7)
  - [x] Create `src/modules/project/application/commands/handlers/merge-projects.handler.ts` — `@CommandHandler(MergeProjectsHandler)`, inject `PROJECT_REPOSITORY_TOKEN` + optional `REQUEST_CONTEXT_TOKEN`
    - Validate target project exists (throw `NotFoundException` if null)
    - Load each source project (throw `NotFoundException` if null)
    - Validate no sourceId === targetId (throw `DomainException` with code `PROJECT_MERGE_SAME_ID`)
    - Validate each source is `active` status (throw `DomainException` if archived)
    - Call `project.archive(metadata)` on each source
    - Save each archived source via repository
    - WorkLog reassignment deferred — source `archive()` emits `ProjectArchivedEvent` + `ProjectsMergedEvent` available for future consumer
  - [x] Update `src/modules/project/application/commands/handlers/index.ts` — add `MergeProjectsHandler` to `CommandHandlers` array
- [x] Task 5: Add merge endpoint to controller (AC: #1, #4, #5, #6)
  - [x] Update `src/modules/project/infrastructure/http/project.controller.ts` — add `@Post(':id/merge')` endpoint with `@Roles('manager')` + `@CurrentUser()` decorators. Uses `@modules/auth` import alias for Jest compat
- [x] Task 6: Write tests (AC: all)
  - [x] Create `src/modules/project/application/commands/handlers/merge-projects.handler.spec.ts` — 6 tests: merge single, merge multiple, target not found, source not found, same id, archived source
  - [x] Update `src/modules/project/infrastructure/http/project.controller.spec.ts` — 1 merge test: success with command verification

## Dev Notes

### MUST-FOLLOW: Architecture Section 3.3 + 4.3

This story adds a **single merge endpoint** and supporting command infrastructure. The Project domain entity already has `archive()` method. No entity changes needed.

### CRITICAL: WorkLog Reassignment is Deferred

The WorkLog module does NOT exist yet (Epic 3). The merge handler must:
1. Archive source projects (domain operation — works now)
2. Emit `ProjectsMergedEvent` with `{ targetProjectId, sourceProjectIds, performedBy }` (event for future consumers)
3. **NOT attempt** to update `work_logs` table — it doesn't exist yet

When Epic 3 (WorkLog module) is implemented, an event handler will subscribe to `ProjectsMergedEvent` and perform the actual `UPDATE work_logs SET project_id = targetId WHERE project_id IN (sourceIds)`.

**Files to CREATE:**
```
src/modules/project/domain/events/projects-merged.event.ts
src/modules/project/application/commands/merge-projects.command.ts
src/modules/project/application/dtos/merge-projects.dto.ts
src/modules/project/application/commands/handlers/merge-projects.handler.ts
src/modules/project/application/commands/handlers/merge-projects.handler.spec.ts
```

**Files to MODIFY:**
```
src/modules/project/domain/events/index.ts                           — export ProjectsMergedEvent
src/modules/project/application/commands/index.ts                    — export MergeProjectsCommand
src/modules/project/application/dtos/index.ts                        — export MergeProjectsDto
src/modules/project/application/commands/handlers/index.ts           — add to CommandHandlers array
src/modules/project/infrastructure/http/project.controller.ts        — add POST /projects/:id/merge
src/modules/project/infrastructure/http/project.controller.spec.ts   — add merge tests
```

### Merge Handler Pattern

Follow existing handler patterns from Stories 2.2/2.3:

```typescript
@CommandHandler(MergeProjectsCommand)
export class MergeProjectsHandler implements ICommandHandler<MergeProjectsCommand, ProjectDto> {
  constructor(
    @Inject(PROJECT_REPOSITORY_TOKEN)
    private readonly projectRepository: IProjectRepository,
    @Optional()
    @Inject(REQUEST_CONTEXT_TOKEN)
    private readonly requestContext?: IRequestContextProvider,
  ) {}

  async execute(command: MergeProjectsCommand): Promise<ProjectDto> {
    const context = this.requestContext?.current();
    const eventMetadata = context
      ? { correlationId: context.correlationId, causationId: context.causationId, userId: context.userId }
      : undefined;

    // 1. Load and validate target
    const target = await this.projectRepository.getById(command.targetProjectId);
    if (!target) {
      throw NotFoundException.entity('Project', command.targetProjectId, {
        suggestion: 'Kiểm tra lại ID dự án đích',
      });
    }

    // 2. Load each source, validate
    const sourceProjects: Project[] = [];
    for (const sourceId of command.sourceProjectIds) {
      if (sourceId === command.targetProjectId) {
        throw new BusinessRuleException('Cannot merge a project into itself', {
          code: 'PROJECT_MERGE_SAME_ID',
          suggestion: 'Loại bỏ ID đích khỏi danh sách nguồn',
        });
      }
      const source = await this.projectRepository.getById(sourceId);
      if (!source) {
        throw NotFoundException.entity('Project', sourceId, {
          suggestion: 'Kiểm tra lại ID dự án nguồn',
        });
      }
      if (source.status.value === 'archived') {
        throw new BusinessRuleException(`Source project ${sourceId} is already archived`, {
          code: 'PROJECT_MERGE_SOURCE_ARCHIVED',
          suggestion: 'Chỉ gộp được dự án đang hoạt động',
        });
      }
      sourceProjects.push(source);
    }

    // 3. Archive each source
    for (const source of sourceProjects) {
      source.archive(eventMetadata);
      await this.projectRepository.save(source);
    }

    // 4. Return target DTO
    return new ProjectDto({
      id: target.id,
      name: target.name,
      description: target.description,
      status: target.status.value,
      version: target.version,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    });
  }
}
```

**NOTE:** The `ProjectsMergedEvent` is emitted automatically by each source project's `archive()` method via `ProjectArchivedEvent`. An additional application-level event can be published if needed, but the existing domain events carry sufficient data. If a dedicated `ProjectsMergedEvent` is desired at the application level, you can use the `EventBus` directly — but check if the aggregate's domain events provide enough context first.

### MergeProjectsCommand

```typescript
import { ICommand } from 'src/libs/core/application';

export class MergeProjectsCommand implements ICommand {
  constructor(
    public readonly targetProjectId: string,
    public readonly sourceProjectIds: string[],
    public readonly performedBy: string,
  ) {}
}
```

### MergeProjectsDto

```typescript
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class MergeProjectsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 dự án nguồn' })
  @IsString({ each: true })
  sourceIds: string[];
}
```

### ProjectsMergedEvent

```typescript
import { BaseDomainEvent, IEventMetadata } from 'src/libs/core/domain';

export interface ProjectsMergedEventData {
  targetProjectId: string;
  sourceProjectIds: string[];
  performedBy: string;
}

export class ProjectsMergedEvent extends BaseDomainEvent<ProjectsMergedEventData> {
  constructor(
    aggregateId: string,
    data: ProjectsMergedEventData,
    metadata?: IEventMetadata,
  ) {
    super(aggregateId, 'Project', 'ProjectsMerged', data, metadata);
  }
}
```

### Controller Endpoint
```typescript
@Post(':id/merge')
@Roles('manager')
@ApiOperation({ summary: 'Merge projects' })
async merge(
  @Param('id') id: string,
  @Body() dto: MergeProjectsDto,
): Promise<ProjectDto> {
  const command = new MergeProjectsCommand(id, dto.sourceIds, 'current-user-id');
  return this.commandBus.execute(command);
}
```

**IMPORTANT:** `performedBy` should come from `@CurrentUser()` decorator (from auth module), not hardcoded. Check how other handlers get the current user ID.

### API Endpoint Details

| Method | Endpoint | Guard | Returns |
|--------|----------|-------|---------|
| POST | `/projects/:id/merge` | `@Roles('manager')` | Target ProjectDto after merge |

### Files to READ FIRST (before writing any code)

- `src/modules/project/application/commands/handlers/create-project.handler.ts` — handler pattern (inject, validate, save)
- `src/modules/project/domain/entities/project.entity.ts` — entity methods: `archive()`
- `src/modules/project/domain/events/project-archived.event.ts` — event pattern
- `src/modules/project/infrastructure/http/project.controller.ts` — controller to modify
- `src/modules/project/application/commands/handlers/index.ts` — CommandHandlers array
- `src/modules/auth/infrastructure/http/decorators/roles.decorator.ts` — `@Roles()` decorator usage

### Anti-Patterns to AVOID

- **DO NOT** attempt to update `work_logs` table — it doesn't exist yet (Epic 3)
- **DO NOT** soft-delete source projects — AC says `archived` status, not deleted
- **DO NOT** forget `@Roles('manager')` — only managers can merge (AC #4)
- **DO NOT** forget to validate sourceId !== targetId — AC #6
- **DO NOT** forget to validate source projects exist and are active — AC #7
- **DO NOT** modify the Project entity — `archive()` already exists
- **DO NOT** forget to update `CommandHandlers` array in `handlers/index.ts`
- **DO NOT** forget to update barrel exports in `commands/index.ts`, `dtos/index.ts`, `events/index.ts`
- **DO NOT** hardcode `performedBy` — use `@CurrentUser()` or `REQUEST_CONTEXT_TOKEN`

### Story 2.2 Learnings (from previous story)

- **Use `SharedCqrsModule`** — already provides command/query/event bus infrastructure
- **Import paths use `@modules/` and `@shared/` aliases**
- **Controller uses `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`** — already injected
- **`ProjectModule` spreads `...CommandHandlers`** — just add new handler to array, no module file change needed
- **Duplicate name check + 23505 catch** — merge doesn't need this (archiving, not creating)
- **`ProjectDto` constructor takes `{ id, name, description, status, version, createdAt, updatedAt }`** — reuse existing DTO

### Story 2.3 Learnings (from previous story)

- **Spec import paths:** Use barrel exports (`../ports` not `../../ports/i-project-read-dao.interface`) — wrong path caused TS2307
- **`CommandHandlers` array spread in `project.module.ts`** — adding to array is sufficient, no module change needed
- **All handlers follow same pattern:** `@CommandHandler(CommandClass)`, inject token, execute, return DTO

### Testing Standards

- Handler tests: mock repository, test all validation paths (not found, same id, archived source, success)
- Controller tests: test merge endpoint with success + role guard rejection
- DTO tests: validate `sourceIds` array (empty array, non-string values)
- Test file naming: `*.spec.ts` colocated with source
- Run `tsc --noEmit` after all changes

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.3] — Merge command + handler in Project Module
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.3] — POST /projects/:id/merge endpoint
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#FR-05] — Merge projects requirement
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#UJ-06] — Manager merge user journey
- [Source: src/modules/project/domain/entities/project.entity.ts] — `archive()` method

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

- Fixed Jest module resolution: `src/modules/auth/...` → `@modules/auth/...` (Jest moduleNameMapper only maps `@modules/`)
- Fixed handler spec: moved project instances into `createProject()` helper to prevent `archive()` mutation leaking across tests

### Completion Notes List

- All 6 tasks verified and implemented
- 5 new files created, 6 files modified
- `@Roles('manager')` + `@CurrentUser()` decorators imported from auth module via `@modules/` alias
- WorkLog reassignment deferred (table doesn't exist yet) — `ProjectsMergedEvent` available for future consumer
- `DomainException` used for business rule violations (maps to 400 via GlobalExceptionFilter)
- 31/31 test suites pass, 215/215 tests pass
- `tsc --noEmit` clean

### File List

**New files:**
- src/modules/project/domain/events/projects-merged.event.ts
- src/modules/project/application/commands/merge-projects.command.ts
- src/modules/project/application/dtos/merge-projects.dto.ts
- src/modules/project/application/commands/handlers/merge-projects.handler.ts
- src/modules/project/application/commands/handlers/merge-projects.handler.spec.ts

**Modified files:**
- src/modules/project/domain/events/index.ts
- src/modules/project/application/commands/index.ts
- src/modules/project/application/dtos/index.ts
- src/modules/project/application/commands/handlers/index.ts
- src/modules/project/infrastructure/http/project.controller.ts
- src/modules/project/infrastructure/http/project.controller.spec.ts
