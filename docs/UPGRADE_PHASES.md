# Upgrade Phases

Date baseline: 2026-03-05
Owner: App Team

## Phase 1 - UX Fluidity (In Progress)
- Persist selected view (`?view=` + local storage) so users continue where they left off.
- Add keyboard shortcuts for faster daily workflow.
- Add smoother transition between views.
- Improve task interaction feel with optimistic delete/status update.
- Publish update visibility on login page and central update log.
- [Done] Replace native `alert/confirm` with app-level dialog/toast on admin, profile, and notes workflows.
- [Done] Standardize main toast rendering with shared component + expose keyboard shortcut hint on desktop toolbar.

## Phase 2 - API Security Hardening (In Progress)
- [Done] Move API auth checks to server-side token validation for protected routes.
- [Done] Remove trust on client body identifiers (`requesterId/userId`) in admin delete workflow.
- [Done] Add route-level admin guard for delete-member endpoint.
- [Done] Update client-side API calls to include bearer token.
- [Done] Add rate limiting for notify endpoints.
- [Done] Add central audit trail table for sensitive actions.
- [Done] Add distributed rate-limit backend (Upstash Redis REST) with in-memory fallback.

## Phase 3 - Data Schema Reliability (In Progress)
- [Done] Complete `supabase/schema.sql` for fresh install parity (including `notes` table + RLS).
- [Done] Add migration-safe scripts for existing database upgrades.
- [Done] Add schema validation checklist for staging and production.
- [Next] Normalize policy creation style across the whole schema file (full idempotent re-run support).

## Phase 4 - Notification Consistency (In Progress)
- [Done] Normalize reminder schedule across `vercel.json`, UI text, API comments, and README.
- [Done] Add timezone policy reference (WIB) and exact cron mapping.
- [Next] Add delivery health checks and fallback reporting.

## Phase 5 - QA and Observability (In Progress)
- [Done] Add smoke tests for auth, CRUD tasks, chat, notes, and admin actions.
- [Done] Add regression checklist for mobile and desktop navigation.
- [Done] Add baseline monitoring hooks with health endpoint (`/api/health/system`).
- [Next] Add automated smoke run script for CI/staging.
