## Summary

- Remove the unused Team Mode launcher `team-up.sh` and its Codex safety-wait helper
- Drop launcher-driven tests and rewrite Team Mode docs so they no longer teach a live launcher
- Keep `team-msg.sh`; replace doctor trust repair copy that recommended the removed CLI

Closes the reproduction path for #2970 by deletion rather than a bash 3.2 empty-array guard.

## Test plan

- [x] `bun test tests/unit/t-remove-team-up-absence.test.ts`
- [x] `bun test tests/integration/t226-migration-doctor-heartbeats.test.ts`
- [x] `bun run typecheck`
- [x] `bun run build` (no remaining `team-up.sh` in dist / self-install)
