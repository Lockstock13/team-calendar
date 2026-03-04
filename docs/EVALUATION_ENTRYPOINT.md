# Evaluation Entrypoint

Before evaluating any requested file/module, read these in order:

1. `docs/UPDATE_LOG.md`
2. `docs/UPGRADE_PHASES.md`

Purpose:
- Ensure every evaluation uses the latest upgrade context.
- Prevent repeated findings that are already planned or in progress.

Evaluation rule:
- If a finding is already tracked in the log/phase docs, mark it as "known/planned" and only add delta impact.
- If a finding is new, append it into `docs/UPDATE_LOG.md` in the next update entry.

