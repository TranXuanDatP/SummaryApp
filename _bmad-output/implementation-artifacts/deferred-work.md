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
