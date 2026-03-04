# Observability Baseline

Date: 2026-03-05

## Health endpoint
- Path: `GET /api/health/system`
- Output includes:
  - database connectivity status and latency
  - key configuration presence (Supabase, VAPID, SMTP, Telegram, cron)
  - active rate-limit backend (`redis` or `memory`)

## Access control
- If `HEALTHCHECK_SECRET` is set:
  - must send header `Authorization: Bearer <HEALTHCHECK_SECRET>`
- If not set:
  - endpoint is open (recommended only for internal/dev environments)

## Operational usage
- Run on deploy verification and periodic checks.
- Treat HTTP `503` as degraded service.
- Use payload `checks.database.error` and config flags for first-level triage.

## Current logging baseline
- Sensitive API actions are persisted in `public.audit_logs`.
- Rate-limit blocks are logged as audit events with `status = blocked`.

