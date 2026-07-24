# 発見されたルール

## Mandated

- ALWAYS treat an explicit `auto-mirror: auto` value as standing consent only for the active Intent's bounded mirror create, sync, and provenance-verified close operations.
- ALWAYS keep the Intent record as the source of truth and synchronize the GitHub mirror in one direction from record to Issue.
- ALWAYS make mirror retries idempotent across partial GitHub success and local-state write failure.
- ALWAYS verify Amadeus ownership provenance and workflow landing before automatically closing a mirror Issue.
- ALWAYS continue the workflow after GitHub availability, authentication, permission, rate-limit, or command failures while recording a visible unsynchronized warning and retry state.
- ALWAYS update the framework source, all six harness distributions, self-install surfaces, tests, and paired English/Japanese documentation in the same change.
- ALWAYS validate TypeScript with strict typecheck, Biome lint, relevant tests, coverage gates, complexity checks, and distribution drift checks required by the changed paths.

## Forbidden

- NEVER accept legacy boolean values for `auto-mirror`.
- NEVER extend `auto-mirror: auto` consent to Pull Request merge, release, publish, deployment, or unrelated external actions.
- NEVER automatically edit or close an Issue whose Amadeus ownership provenance is absent or inconsistent.
- NEVER treat a GitHub mirror failure as permission to silently lose synchronization state or permanently stop the AI-DLC workflow.
- NEVER add a backward-compatibility shim, generic tracker transport, scheduler, daemon, or unrelated large-module refactor for this Intent.
- NEVER edit `dist/` or self-install copies as independent sources of truth.
