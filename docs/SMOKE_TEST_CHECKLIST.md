# Smoke Test Checklist

Date: 2026-03-05
Scope: Phase 5 (QA and Observability)

## 1) Authentication
- Login with existing member account.
- Register new account.
- Logout then login again.
- Ensure inactive user is blocked from entering app.

## 2) Task Workflow
- Create new task with multiple assignees.
- Edit existing task title/date/assignees.
- Update status in list view (`todo -> in_progress -> done`).
- Delete task and verify no stale row remains.

## 3) Notes Workflow
- Create markdown note, edit, pin/unpin, delete.
- Create table note, add/remove row/column, save.
- Member cannot modify other member's note (expected blocked by RLS).
- Admin can modify/delete member note.

## 4) Chat Workflow
- Send message and verify realtime delivery.
- Verify unread badge increments outside chat view.
- Enter chat view and verify unread badge resets.

## 5) Admin Workflow
- Promote/demote member role.
- Activate/deactivate member.
- Delete member (not self) and verify success message.
- Verify sensitive actions produce rows in `public.audit_logs`.

## 6) Notification Workflow
- Trigger `/api/notify` via task create/update and verify no 401/429 unexpected.
- Trigger `/api/notify-chat` via chat send and verify no 401/429 unexpected.
- Verify reminder schedule reference is consistent (06:00 WIB / 23:00 UTC).

## 7) Health & Observability
- Call `GET /api/health/system`.
- Expected response:
  - `status` is `healthy` (or `degraded` with explicit reason).
  - `checks.database.ok = true`.
  - `checks.config.rate_limit_backend` reflects `redis` or `memory`.

## 8) Device Regression
- Desktop: keyboard shortcuts (`N`, `1..6`) work.
- Mobile: bottom nav, center FAB, and chat input behave correctly.
- Validate no blocking layout issues on narrow screens.

