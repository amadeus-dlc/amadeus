# Refined Mockups Memory

## Interpretations

- 2026-07-07T05:23:44Z — CLI product treated as developer experience rather than GUI; refined mockups are terminal transcripts, state tables, and interaction specs derived from `wireframes.md`, `user-flow.md`, `stories.md`, `requirements.md`, and `team-practices.md`.
- 2026-07-07T05:23:44Z — Older rough-mockup `init` wording is superseded by requirements Q7; refined artifacts use `install` and `upgrade` only, with no first-release `init` alias.
- 2026-07-07T05:32:00Z — Product Lead review required package metadata/layout, resolver edge cases, force matrix, and CI/release failure states to be represented as developer-visible UX rather than deferred only to implementation design.
- 2026-07-07T05:41:00Z — Product Lead second review found two blocking inconsistencies: `--yes --force` transcript lacked the required resolved plan block, and README install guidance was trace-claimed but not mocked.

## Deviations

- 2026-07-07T05:23:44Z — Component-level specification template is adapted from visual UI components to CLI interaction components because this stage has no GUI surface.

## Tradeoffs

- 2026-07-07T05:23:44Z — Plain-text output is preferred over rich TTY output to keep CI logs, screen readers, and snapshot tests aligned.
- 2026-07-07T05:32:00Z — Added maintainer/contributor-facing DX mockups even though the primary user is a new OSS installer user, because FR-003, FR-016, and FR-017 are user-visible to package maintainers and CI owners.
- 2026-07-07T05:41:00Z — Applied reviewer fixes without a third reviewer pass because the stage reviewer budget was two iterations; reran deterministic sensors instead.

## Open questions

- 2026-07-07T05:23:44Z — Exact per-harness manifest file lists remain for Functional Design; refined mockups specify the report and manifest fields but not the full file inventory.
