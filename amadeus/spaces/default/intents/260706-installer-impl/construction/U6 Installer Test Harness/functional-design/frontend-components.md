# Frontend Components — U6 Installer Test Harness

> Stage: functional-design / Unit: `U6 Installer Test Harness`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Applicability

U6 has no end-user frontend. Its user-facing surface is contributor-facing test output and snapshot diffs.

## Test Output Components

| Component | Purpose |
|---|---|
| Test runner summary | Shows pass/fail counts for installer tests. |
| Coverage registry report | Shows FR/US coverage and ratchet status. |
| Snapshot diff | Shows CLI output drift for review. |
| Fixture failure diagnostics | Shows temp target/source fixture failure reason. |

## Output Rules

- Test output must be useful in CI logs.
- Snapshot diffs normalize temp paths and timestamps unless the case explicitly tests them.
- Coverage registry failures name missing FR/US identifiers.
- Fixture failures distinguish setup failure from installer behavior failure.

## Traceability

- `requirements.md` FR-016 and `team-practices.md` make installer tests blocking gates.
- `unit-of-work-story-map.md` maps U6 to US-001 through US-012.
- `services.md` and `component-methods.md` define the contracts U6 exercises.

