# Schema Validation Checklist

Date: 2026-03-05
Scope: Phase 3 (Data Schema Reliability)

## Before applying SQL
- Backup production database.
- Confirm project env points to correct Supabase project.
- Ensure at least one active admin exists in `public.profiles`.

## Apply order
1. Run `supabase/schema.sql` for fresh baseline.
2. For existing deployments, run `supabase/migrations/2026-03-05-phase3-schema-reliability.sql`.
3. Run validation script `supabase/scripts/phase3-validation.sql`.

## Table checks
- `public.notes` exists with columns:
  - `id, title, content, category, note_type, pinned, created_by, updated_by, created_at, updated_at`
- `public.audit_logs` exists with columns:
  - `id, action, actor_id, target_id, route, status, details, created_at`

## Policy checks
- `public.notes` policies:
  - `notes: read all`
  - `notes: insert own`
  - `notes: update own`
  - `notes: delete own`
  - `notes: admin update any`
  - `notes: admin delete any`
- `public.audit_logs` policies:
  - `audit_logs: read own`
  - `audit_logs: admin read all`

## Functional smoke checks
- Member can create/edit/delete own note.
- Member cannot edit/delete note created by other member.
- Admin can edit/delete note created by any member.
- Sensitive API actions write rows into `public.audit_logs`.
- Existing app flows (`NotesView`, `ChatView`, task workflows) still work without SQL errors.
