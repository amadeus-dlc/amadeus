# Accessibility Checklist — インストーラの実装

> Stage: refined-mockups / Upstream: `wireframes.md`, `user-flow.md`, `stories.md`, `requirements.md`, `team-practices.md`  
> Target: CLI and GitHub Actions developer experience. WCAG concepts are adapted to terminal output where browser semantics do not apply.

## Checklist

| Area | Requirement | Status | Evidence |
|---|---|---|---|
| Keyboard-only operation | Interactive prompts can be completed through typed values or single-key confirmation | Planned | Harness choices are numbered; apply prompt accepts `y` or Enter |
| No color-only meaning | Success, failure, backup, conflict, and skipped states are represented by words | Planned | `done`, `Error:`, `backup`, `conflict`, `skip` are textual |
| Screen-reader order | Output is line-oriented and meaningful in reading order | Planned | Header, plan, operations, result, next action appear in order |
| CI log readability | Canonical output avoids spinners and cursor control | Planned | Progress lines end with `done` |
| Default safety | Confirmation defaults to no-write | Planned | `[y/N]` is used for apply prompts |
| Error recovery | Error blocks include classified reason and one next action | Planned | Network, multiple harness, collision, downgrade examples |
| Non-interactive clarity | Missing required flags fail before target mutation | Planned | `--yes` and non-TTY semantics documented |
| Force clarity | Force-applied writes remain textually paired with backups for shared files | Planned | `force-update` rows appear with matching `backup` rows |
| Resolver clarity | Ignored duplicate/prerelease tags are explained with text labels | Planned | Version resolver edge-case examples |
| Security gate clarity | CI failures name the gate and policy outcome without exposing secret values | Planned | Secret scan and OSV/audit gate examples |
| Table readability | Tables use stable columns and concise path examples | Planned | `Operation`, `Files`, `Example` table pattern |
| Localization readiness | Text is centralized enough for future message catalog | Deferred | `--lang ja` rough idea remains future design; not part of first refined contract |
| GitHub Actions accessibility | Workflow and validation names are plain text, not icon-only | Planned | Release workflow mockup uses named validations |
| Documentation readability | README commands are copyable one-line code blocks with caveats in prose | Planned | README guidance mockup |

## Acceptance Notes

- CLI output does not use ARIA roles because the surface is not browser-based.
- Accessibility depends on predictable text, keyboard operation, no color-only meaning, and avoiding animated output as the canonical state.
- Snapshot tests should assert text shape for validation errors, reports, and success messages to prevent regression.
- If rich TTY styling is later added, it must be additive and preserve the plain-text canonical output.

## Risks

| Risk | Mitigation |
|---|---|
| Long paths make tables hard to read | Keep examples compact and allow wrapping; full report can list paths line-by-line if needed |
| Prompt helper library may rely on arrow keys | Always support numeric or typed value fallback |
| Colors or symbols may drift into tests | Treat words as authoritative and assert them in CLI tests |
| Localization can create inconsistent messages | Keep message keys or helper functions centralized during implementation |
