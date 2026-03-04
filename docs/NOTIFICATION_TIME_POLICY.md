# Notification Time Policy

Baseline date: 2026-03-05

## Canonical reminder schedule
- Local timezone: WIB (UTC+7)
- Daily reminder target: 06:00 WIB
- Vercel cron expression: `0 23 * * *` (23:00 UTC = 06:00 WIB next day)

## Consistency rule
All references must match this policy:
- `vercel.json`
- `app/api/cron/daily-reminder/route.js` comments
- user-facing text in `app/profile/page.js`
- docs in `README.md`

## Change procedure
If reminder time changes:
1. Update this policy file first.
2. Update cron schedule in `vercel.json`.
3. Update API comments + UI copy + README in the same commit.

