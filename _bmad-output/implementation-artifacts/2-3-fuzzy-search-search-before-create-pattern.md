# Story 2.3: Fuzzy Search & Search-before-Create Pattern

Status: done

## Story

As an employee,
I want to search for existing projects by name before creating a new one,
so that I avoid creating duplicate projects.

## Acceptance Criteria

1. **Given** projects exist in the database, **When** I send `GET /projects/search?q=dự án alpha`, **Then** returns matching projects using fuzzy matching (`ILIKE`), ordered by relevance
2. Empty query `q=""` returns empty results — not all projects
3. Response format: `{ data: [...], total, page, totalPages }`
4. Search endpoint protected by `JwtAuthGuard` only — both roles can search (C-4)
5. UX pattern (UX-DR7): client shows results; "Create new" only visible when `data` is empty

## Tasks / Subtasks

- [x] Task 1: Create search query (AC: #1, #3)
  - [x] Create `src/modules/project/application/queries/search-projects.query.ts` — `extends IQuery<{data, total, page, totalPages}>`, constructor `(query: string, page: number, limit: number)`
  - [x] Update `src/modules/project/application/queries/index.ts` — export `SearchProjectsQuery`
- [x] Task 2: Add search to read DAO interface (AC: #1, #2)
  - [x] Update `src/modules/project/application/queries/ports/i-project-read-dao.interface.ts` — add `search(params: { query: string; page: number; limit: number }): Promise<{ data: ProjectDto[]; total: number }>`
- [x] Task 3: Implement search in read DAO (AC: #1, #2, #5)
  - [x] Update `src/modules/project/infrastructure/persistence/read/project-read-dao.ts` — add `search()` method using Drizzle `ilike()` with `%query%` pattern, `isDeleted: false` filter, ordered by `createdAt desc`
- [x] Task 4: Create search query handler (AC: #1, #3)
  - [x] Create `src/modules/project/application/queries/handlers/search-projects.handler.ts` — `@QueryHandler(SearchProjectsHandler)`, inject `PROJECT_READ_DAO_TOKEN`, call `search()`, compute `totalPages`, return paginated result
  - [x] Update `src/modules/project/application/queries/handlers/index.ts` — add `SearchProjectsHandler` to `QueryHandlers` array
- [x] Task 5: Add search endpoint to controller (AC: #1, #3, #4)
  - [x] Update `src/modules/project/infrastructure/http/project.controller.ts` — add `@Get('search')` endpoint BEFORE `@Get(':id')` (NestJS route order matters). Accepts `@Query('q') query: string` + pagination params. Returns paginated list. If `q` is empty or missing, returns `{ data: [], total: 0, page: 1, totalPages: 0 }`
- [x] Task 6: Write tests (AC: all)
  - [x] `search-projects.handler.spec.ts` — mock DAO, test with query, empty query
  - [x] Update `project.controller.spec.ts` — add search endpoint test

## Dev Notes

### MUST-FOLLOW: Architecture Section 3.3 + 4.2

This story adds a **single search endpoint** and supporting query infrastructure. The domain layer (entity, value objects, repository) does NOT change — this is purely application + infrastructure.

**Files to CREATE:**
```
src/modules/project/application/queries/search-projects.query.ts
src/modules/project/application/queries/handlers/search-projects.handler.ts
src/modules/project/application/queries/handlers/search-projects.handler.spec.ts
```

**Files to MODIFY:**
```
src/modules/project/application/queries/index.ts                           — export SearchProjectsQuery
src/modules/project/application/queries/handlers/index.ts                  — add to QueryHandlers array
src/modules/project/application/queries/ports/i-project-read-dao.interface.ts — add search() method
src/modules/project/infrastructure/persistence/read/project-read-dao.ts   — implement search()
src/modules/project/infrastructure/http/project.controller.ts              — add GET /projects/search
src/modules/project/infrastructure/http/project.controller.spec.ts         — add search test
```

### CRITICAL: Route Ordering in Controller

NestJS evaluates routes top-to-bottom. `@Get('search')` MUST be declared BEFORE `@Get(':id')` — otherwise `:id` captures "search" as an ID parameter. Place the search method between `getList()` and `getById()`.

### Search Implementation — ILIKE Pattern

Use Drizzle ORM's `ilike()` function for case-insensitive fuzzy matching:

```typescript
import { ilike } from 'drizzle-orm';

async search(params: { query: string; page: number; limit: number }): Promise<{ data: ProjectDto[]; total: number }> {
  const { query, page, limit } = params;
  const offset = (page - 1) * limit;

  const condition = and(
    ilike(projectsTable.name, `%${query}%`),
    eq(projectsTable.isDeleted, false),
  );

  const [dataResult, countResult] = await Promise.all([
    this.db.select().from(projectsTable)
      .where(condition)
      .orderBy(desc(projectsTable.createdAt))
      .limit(limit)
      .offset(offset),
    this.db.select({ count: count() }).from(projectsTable)
      .where(condition),
  ]);

  const total = countResult[0]?.count ?? 0;
  return { data: dataResult.map(r => this.mapToDto(r)), total: Number(total) };
}
```

Note: `ilike` is imported from `drizzle-orm` — add it to the existing import at top of `project-read-dao.ts`:
```typescript
import { eq, and, desc, count, ilike } from 'drizzle-orm';
```

### Empty Query Guard

Per AC #2, empty query returns empty results. Handle in controller (simplest place):

```typescript
@Get('search')
async search(
  @Query('q') q?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
): Promise<{ data: ProjectDto[]; total: number; page: number; totalPages: number }> {
  if (!q || q.trim().length === 0) {
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
  const { page: p, limit: l } = parsePagination(page, limit);
  const query = new SearchProjectsQuery(q.trim(), p, l);
  return this.queryBus.execute(query);
}
```

### Query Handler Pattern

Follow `GetProjectListHandler` pattern exactly:

```typescript
@QueryHandler(SearchProjectsQuery)
export class SearchProjectsHandler implements IQueryHandler<
  SearchProjectsQuery,
  { data: ProjectDto[]; total: number; page: number; totalPages: number }
> {
  constructor(
    @Inject(PROJECT_READ_DAO_TOKEN)
    private readonly projectReadDao: IProjectReadDao,
  ) {}

  async execute(query: SearchProjectsQuery): Promise<{
    data: ProjectDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { data, total } = await this.projectReadDao.search({
      query: query.query,
      page: query.page,
      limit: query.limit,
    });
    return { data, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
  }
}
```

### SearchProjectsQuery

```typescript
import { IQuery } from 'src/libs/core/application';
import { ProjectDto } from '../dtos';

export class SearchProjectsQuery extends IQuery<{
  data: ProjectDto[];
  total: number;
  page: number;
  totalPages: number;
}> {
  constructor(
    public readonly query: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {
    super();
  }
}
```

### IProjectReadDao — New Method

Add to existing interface:
```typescript
search(params: {
  query: string;
  page: number;
  limit: number;
}): Promise<{ data: ProjectDto[]; total: number }>;
```

### API Endpoint Details

| Method | Endpoint | Guard | Returns |
|--------|----------|-------|---------|
| GET | `/projects/search?q=` | `JwtAuthGuard` (any role) | `{ data, total, page, totalPages }` |

### Files to READ FIRST (before writing any code)

- `src/modules/project/application/queries/handlers/get-project-list.handler.ts` — query handler pattern
- `src/modules/project/infrastructure/persistence/read/project-read-dao.ts` — existing DAO to modify
- `src/modules/project/infrastructure/http/project.controller.ts` — controller to modify
- `src/modules/project/application/queries/ports/i-project-read-dao.interface.ts` — interface to modify

### Anti-Patterns to AVOID

- **DO NOT** install `pg_trgm` PostgreSQL extension — use `ILIKE` only (architecture allows either, ILIKE is simpler)
- **DO NOT** put `@Get('search')` AFTER `@Get(':id')` — NestJS will match `:id` first and "search" becomes an ID
- **DO NOT** return all projects when query is empty — AC #2 explicitly says empty returns empty
- **DO NOT** modify domain layer — no entity, value object, or repository changes needed
- **DO NOT** add `@Roles()` to search endpoint — both roles can search (C-4)
- **DO NOT** forget `isDeleted: false` filter in the search query
- **DO NOT** forget to update the `QueryHandlers` array in `handlers/index.ts` — the module won't register the handler otherwise
- **DO NOT** forget to update `project.module.ts` — it spreads `...QueryHandlers`, so adding to the array is sufficient (no module file change needed)

### Story 2.2 Learnings (from previous story)

- **Use `SharedCqrsModule`** — already provides command/query/event bus infrastructure
- **Import paths use `@modules/` and `@shared/` aliases**
- **`BaseReadDao` requires `executeQuery()` method** — already implemented
- **Controller uses `COMMAND_BUS_TOKEN` and `QUERY_BUS_TOKEN`** — already injected
- **`parsePagination()` helper already exists** in controller — reuse it
- **`mapToDto()` private method already exists** in `ProjectReadDao` — reuse it
- **Update handler has duplicate name check + 23505 catch** — search doesn't need this (read-only)
- **`UpdateProjectDto` allows `description: null`** via `ValidateIf` — no relevance to search
- **All read queries filter `isDeleted: false`** — search must follow same pattern
- **`ProjectModule` spreads `...QueryHandlers`** — just add new handler to array, no module change needed

### Testing Standards

- Handler tests: mock DAO, test with valid query, verify pagination
- Controller tests: add search endpoint test, test empty query returns empty
- No DTO validation tests needed (search has no request body)
- Test file naming: `*.spec.ts` colocated with source
- Run `tsc --noEmit` after all changes

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 3.3] — Project Module file listing with search-projects.query.ts
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#Section 4.2] — GET /projects/search?q= endpoint
- [Source: _bmad-output/planning-artifacts/architecture-task-management.md#AD-14] — Search-before-create pattern (C-5)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR7] — Search-before-create UX pattern
- [Source: _bmad-output/planning-artifacts/prd-task-management.md#C-5] — Search before create constraint

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (glm-5[1m])

### Debug Log References

- Fixed import path in `search-projects.handler.spec.ts`: `../../ports/i-project-read-dao.interface` → `../ports` (TS2307)

### Completion Notes List

- All 6 tasks verified as implemented correctly per AC
- Fixed 1 TypeScript compilation error in spec file (wrong relative import path)
- 30/30 test suites pass, 208/208 tests pass
- `tsc --noEmit` clean — 0 errors
- Route order correct: `@Get('search')` before `@Get(':id')`
- Empty query guard returns `{ data: [], total: 0, page: 1, totalPages: 0 }` (AC #2)
- `ilike` + `isDeleted: false` filter in DAO (AC #1)
- No domain layer changes — purely application + infrastructure

### File List

- `src/modules/project/application/queries/search-projects.query.ts` — created
- `src/modules/project/application/queries/index.ts` — modified (export added)
- `src/modules/project/application/queries/ports/i-project-read-dao.interface.ts` — modified (search method added)
- `src/modules/project/infrastructure/persistence/read/project-read-dao.ts` — modified (search implementation)
- `src/modules/project/application/queries/handlers/search-projects.handler.ts` — created
- `src/modules/project/application/queries/handlers/index.ts` — modified (QueryHandlers array)
- `src/modules/project/infrastructure/http/project.controller.ts` — modified (GET /projects/search)
- `src/modules/project/application/queries/handlers/search-projects.handler.spec.ts` — created (fixed import path)
- `src/modules/project/infrastructure/http/project.controller.spec.ts` — modified (search tests)
