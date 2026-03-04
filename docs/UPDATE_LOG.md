# Update Log

## 2026-03-05 - Phase 6 started (Startup Query Performance)
- Optimized startup task fetch strategy in `app/page.js`:
  - lightweight initial tasks query (date-windowed),
  - lazy full task sync only when report view is opened,
  - faster realtime refresh path based on loaded scope.
- Added client-side startup cache for tasks/users to show dashboard data instantly after refresh.
- Added DB performance migration:
  - `supabase/migrations/2026-03-05-phase6-startup-query-performance.sql`
  - indexes: `tasks_start_date_idx`, `tasks_created_by_idx`, `profiles_is_active_idx`.

## 2026-03-05 - Phase 1 continued (UI Feedback Consistency)
- Replaced native browser `confirm()` in notes delete flow with app-level `ConfirmDialog`.
- Added toast feedback for notes delete success and failure in `app/components/NotesView.jsx`.
- Completed phase-1 target to remove blocking native dialog behavior from core workflows.
- Standardized main-page toast rendering to shared `AppToast` component.
- Added desktop shortcut hint text in main toolbar (`N`, `1-6`) for faster user onboarding.

## 2026-03-05 - Phase 5 started (QA and Observability)
- Added health endpoint: `GET /api/health/system`.
- Added optional `HEALTHCHECK_SECRET` auth guard for health endpoint.
- Added smoke checklist: `docs/SMOKE_TEST_CHECKLIST.md`.
- Added observability baseline doc: `docs/OBSERVABILITY_BASELINE.md`.
- Updated README and `.env.local.example` for health/QA references.

## 2026-03-05 - Phase 4 started (Notification Consistency)
- Standardized daily reminder reference to 06:00 WIB (UTC+7).
- Synced cron comments in `app/api/cron/daily-reminder/route.js` with `vercel.json` (`0 23 * * *`).
- Updated user-facing reminder text in `app/profile/page.js` to 06.00 WIB.
- Added `docs/NOTIFICATION_TIME_POLICY.md` as single source of truth for reminder schedule/timezone.

## 2026-03-05 - Phase 3 started (Data Schema Reliability)
- Updated `supabase/schema.sql` with full `public.notes` table definition (fresh install parity).
- Added `notes` indexes and complete RLS policies (member own note + admin override).
- Added migration-safe SQL file: `supabase/migrations/2026-03-05-phase3-schema-reliability.sql`.
- Added validation checklist: `docs/SCHEMA_VALIDATION_CHECKLIST.md`.

## 2026-03-05 - Phase 2 continued (API Security Hardening)
- Added `lib/api-auth.js` for reusable server-side bearer token validation and admin guard.
- Hardened `/api/notify` to require authenticated user token and derive actor from server-side profile.
- Hardened `/api/notify-chat` to require authenticated user token and validate message content.
- Hardened `/api/push-subscribe` to update only authenticated user profile (no body `userId` trust).
- Hardened `/api/admin/delete-member` to enforce authenticated admin token; requester identity now server-derived.
- Updated client API calls (main page, admin page, chat view) to send `Authorization: Bearer <access_token>`.
- Added in-memory rate limiting for `/api/notify`, `/api/notify-chat`, and `/api/admin/delete-member`.
- Added `lib/audit-log.js` and audit event writes for sensitive/blocked actions.
- Added `audit_logs` schema block in `supabase/schema.sql` (table, indexes, RLS read policies).
- Added Upstash Redis REST support for distributed rate limiting with automatic fallback to in-memory mode.
- Added Upstash environment variable docs in `.env.local.example` and README.

## 2026-03-05 - Phase 1 started (UX Flow Upgrade)
- Added persistent view workflow (URL query + local storage memory).
- Added keyboard shortcuts for faster navigation.
- Added smoother view transition animation.
- Improved task action feel with optimistic updates and rollback on error.
- Added update information block on login page.
- Added formal upgrade roadmap in `docs/UPGRADE_PHASES.md`.

## Next planned entry
- API Security Hardening kickoff (Phase 2).
