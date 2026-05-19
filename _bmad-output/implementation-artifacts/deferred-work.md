# Deferred Work

## Deferred from: code review of 1-1-user-module-aggregate-value-objects-schema (2026-05-12)

- Password validation too weak — only checks non-empty after trim, no min/max length. Validation requirements TBD at application layer per spec.
- `UserEmail` regex rejects internationalized emails (RFC 6531). Business requirement unclear, current scope uses ASCII emails.
- `delete()`/`restore()` don't emit domain events. Pre-existing pattern from Product entity, not introduced by this change.

## Deferred from: code review of 1-4-jwt-authentication-login-refresh-token-management (2026-05-12)

- Rate limiting on login (AC#7) — deferred to Story 1-5 (global auth guards story)
- Expired tokens no cleanup mechanism — table grows unboundedly, needs cron job
- Refresh token TTL hardcoded (7 days) — not configurable via ConfigService
- No DB indexes on tokenHash/userId columns — performance concern as table grows
- Unbounded refresh tokens per user — no limit on concurrent sessions
- No logout/revocation endpoint — not in scope for 1-4

## Deferred from: code review of 3-1-worklog-module-aggregate-value-objects-domain-services (2026-05-18)

- TOCTOU on edit window check — check-then-act pattern in updateContent/deleteWithCheck. Handled by optimistic concurrency at infrastructure level (version field).
- No IBusinessDayCalculator infrastructure implementation — out of scope for domain-only story. Interface defined, concrete impl with Vietnamese holidays deferred to infrastructure story.
- No domain-level C-7 enforcement (employee ownership) — application layer concern, enforced at query/handler level.
- No C-3 uniqueness enforcement (project+employee+executionDate) — noted in schema comment, deferred to DB migration + application handler check.
- ExecutionDate validation skipped in isWithinEditWindow path — by design for reconstitute path, follows same pattern as Project entity.
- Schema isDeleted boolean vs entity deletedAt date dual source — follows existing Project entity pattern, repository handles mapping.

## Deferred from: code review of 3-2-worklog-crud-create-update-delete-voi-3-day-lock-rule (2026-05-18)

- Fragile DomainException message matching — handlers use `.toLowerCase().includes('locked'/'future')` to catch and re-throw. If entity error messages change, mapping silently breaks. Consider error codes or custom exception subtypes on the domain entity.
- ~~Read DAO hardcodes `isEditable: true, editWindowClosesAt: ''`~~ — FIXED in story 3-4 (read DAO now injects calculator).
- Holidays hardcoded to 2026 only — after Dec 31 2026 no Vietnamese holidays recognized. Needs annual update process or external data source.
- TOCTOU race in duplicate check — concurrent requests could pass app-level check before DB constraint catches it. DB 23505 catch provides safety net with slightly less detail in error response. Acceptable at current scale.
- Projection `processedEvents` Set grows indefinitely — memory leak. Set is unused for idempotency check. Stub projection to be rewritten for stories 3.4+.
- Repository `delete()` method bypasses domain logic — standalone delete(id) does direct DB soft-delete without entity's delete(calculator, metadata). Follows existing ProjectRepository pattern — pre-existing architectural issue.

## Deferred from: code review of 3-3-manager-unlock-override-mo-khoa-worklog-da-het-han (2026-05-18)

- Fragile `msg.includes('deleted')` string matching in unlock handler — same deferred pattern from Story 3-2. Entity throws 'Cannot modify deleted WorkLog', handler matches on 'deleted'. If entity message changes, mapping silently breaks.

## Deferred from: code review of 3-4-worklog-list-query-voi-phan-quyen (2026-05-18)

- ~~Read DAO hardcodes isEditable/editWindowClosesAt~~ — FIXED in story 3-4 (read DAO now injects calculator). Remove from previous deferred list.
- `isWithinWindow` returns true for future executionDates — `countBusinessDaysBetween(future, now)` returns 0, so `0 <= 3 = true`. Entity prevents future-dated creation, so only exploitable via direct DB manipulation.
- Test mocks use `{ id: 'user-1' }` but controller sends `user.userId` — test debt from stories 3-2/3-3. Handler tests bypass controller so they pass, but no controller-level tests exist. Should update mocks to `{ userId: 'user-1', role: 'employee' }` when controller tests are added.

## Deferred from: code review of 3-6-calendar-view-api (2026-05-19)

- Timezone-dependent Date construction patterns — pre-existing codebase issue (new Date with local timezone in handler, DAO query ranges). Not introduced by this story.
- `user` typed as `any` in all controllers — no compile-time auth contract. Pre-existing pattern across entire project.
- Multiple work logs on same day silently overwrite in calendar handler Map — unique constraint deferred to future DB migration. Handler produces best-effort result.
- Holidays hardcoded for 2026 only — already deferred from story 3-2 review. Will silently break in 2027+.
- Future business days without WorkLog indistinguishable from locked gaps (both isEditable: false) — deferred: add a status field or isFuture flag in a future story. Frontend can infer from date > today in the meantime.

## Deferred from: code review of 3-7-summary-view-api (2026-05-19)

- Timezone-dependent Date construction patterns — pre-existing codebase issue (new Date with local timezone in handler, DAO query ranges). Not introduced by this story.
- Holidays hardcoded for 2026 only — already deferred from story 3-2 review. Will silently break in 2027+.

## Deferred from: code review of 3-8-monthly-report-api (2026-05-19)

- `user` typed as `any` in controllers — no compile-time auth contract. Pre-existing project-wide pattern.
- `userRole` field in GetMonthlyReportQuery unused by handler — informational only, controller enforces C-7 before construction.
- `parseInt` silently truncates trailing non-numeric chars (e.g., `?month=5abc`) — same pattern in WorkLogController, pre-existing.
- `parsePagination` doesn't clamp page upper bound or reject decimals — same pattern in WorkLogController, pre-existing.
- MAX_PAGE_LIMIT silently capped, not communicated to client — same in WorkLogController, pre-existing.
- `totalPages=0` when total=0 — mathematically correct, test-verified, matches project API contract convention.
- Timezone-dependent Date construction in DAO — pre-existing in `findByEmployeeAndMonth`, affects date range boundaries.
- Non-manager roles treated identically to employee — project-wide role check pattern (`=== 'manager'`), pre-existing.
- Count/data race under concurrent writes — same `Promise.all` pattern in `findAll`, pre-existing.
