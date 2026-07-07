# Business Logic Model — U6 Installer Test Harness

> Stage: functional-design / Unit: `U6 Installer Test Harness`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U6 designs deterministic tests and fixtures for U1 through U5. It does not implement runtime installer behavior; it supplies fake ports, temp target builders, source archive fixtures, manifest fixtures, and smoke commands that make the installer contracts verifiable without live GitHub access or real user projects.

## Test Layers

| Layer | Purpose | Examples |
|---|---|---|
| Unit tests | Pure parser/resolver/planner behavior | command parsing, SemVer ordering, backup path, FileOperationPlan |
| Integration tests | Ports + temp filesystem behavior | manifest-first detection, target snapshot, apply + manifest write |
| Smoke tests | Executable CLI behavior | `--help`, clean install to temp target, no-write collision |
| Snapshot tests | Stable plain-text UX | plan table, classified errors, success output |

## Fixture Workflow

1. Build fake tag source with stable, prerelease, malformed, and duplicate tags.
2. Build fake archive source with success, transient-then-success, and failure-after-retry outcomes.
3. Build source distribution fixture with `dist/<harness>/` and optional metadata.
4. Build temp target fixture for clean, manifest-installed, manual-or-unknown, partial, none, unsupported, and ambiguous harness states.
5. Run U1-U5 behavior through fake ports and temp filesystem.
6. Assert exit codes, no-write guarantees, FileOperationPlan, manifest content, backup paths, and rendered output.

## Coverage Registry Workflow

1. Each installer test declares the requirement/story it covers.
2. Coverage registry maps tests to FR/US identifiers.
3. Registry freshness check fails when a Must requirement lacks a test mapping.
4. Ratchet check fails when mapped coverage decreases.

## Failure Modes Covered

- `init` rejected.
- Bun-required message for npx without Bun.
- no stable SemVer tag.
- archive fetch fails after adapter-owned retry.
- missing `dist/<harness>/`.
- invalid present metadata.
- non-interactive missing harness/target.
- collision without force no-write.
- changed shared file backup before force-update.
- manifest write failure after copy.
- verification failure after apply.

## Integration Boundaries

- U6 consumes contracts from `component-methods.md` and `services.md`.
- U6 supplies commands and fixture outputs to U7 CI And Package Gates.
- U6 must not require live GitHub, npm credentials, or a real user project.

