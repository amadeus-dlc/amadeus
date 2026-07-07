# Code Generation Plan — U1 Setup Package Shell

> Stage: construction / code-generation  
> Unit: U1 Setup Package Shell

## Scope

U1 implements the executable package shell for `@amadeus-dlc/setup`: package metadata, bin exposure, Bun-first startup, best-effort Node/npm wrapper delegation to Bun, command parsing, help/error rendering, and package metadata validation. It must not resolve versions, fetch archives, inspect target files, plan operations, apply files, or write manifests.

## Plan

- [x] Step 1: Create `packages/setup/` package structure.
  - Traceability: US-001, US-009, FR-001, FR-003, BR-U1-001, BR-U1-016, BR-U1-017.
  - Add `packages/setup/package.json` with `name: "@amadeus-dlc/setup"`, bin `amadeus-setup`, license metadata, repository metadata, and runtime `files` allowlist.
  - Add source directories under `packages/setup/src/{bin,cli,application,maintainer}` without moving existing `core/`, `harness/`, `dist/`, or `scripts`.

- [x] Step 2: Implement command/domain types and parser.
  - Traceability: US-002, US-003, US-004, FR-004, FR-011, BR-U1-002, BR-U1-003, BR-U1-005, BR-U1-006.
  - Add `SetupCommand`, `SetupError`, `ParseResult`, supported harness values, and parser for `install`, `upgrade`, help, `--harness`, `--target`, `--version`, `--yes`, and `--force`.
  - Reject `init`, unknown commands, duplicate `--harness`, unsupported harness, and multiple action commands before any service delegation.

- [x] Step 3: Implement help and error renderers.
  - Traceability: US-001, US-004, FR-001, FR-002, FR-011, BR-U1-004, BR-U1-012.
  - Help lists only `install` and `upgrade`, states Bun requirement, describes `bunx`, best-effort `npx`, supported harnesses, and `--yes` / `--force`.
  - Error rendering is human-readable, secret-safe, includes one next action, and does not print stack traces for classified user errors.

- [x] Step 4: Implement Bun entrypoint and Node/npm wrapper.
  - Traceability: US-001, FR-001, FR-002, BR-U1-007, BR-U1-008, BR-U1-009, BR-U1-010, BR-U1-011.
  - Bun entrypoint calls `runSetup(argv, env, deps)` and maps `EntrypointResult` to stdout/stderr/exit code.
  - Node wrapper detects Bun through PATH using argv-array spawn, delegates with inherited stdio when available, and emits `bun-required` when unavailable.

- [x] Step 5: Implement minimal setup application service boundary.
  - Traceability: US-002, US-004, FR-005, FR-006, BR-U1-013, BR-U1-014, BR-U1-015.
  - For U1, valid `install` / `upgrade` commands delegate to a boundary that returns a classified `not-implemented-in-this-slice` result without target access.
  - Preserve parsed `yes` and `force` flags for downstream U2-U5 without applying planning or collision policy in U1.

- [x] Step 6: Implement package metadata validation script.
  - Traceability: US-009, FR-001, FR-003, BR-U1-016, BR-U1-018, BR-U1-019, BR-U1-020.
  - Add maintainer check for package name, bin, license, repository, files allowlist, root dev-only boundary, and absence of unrelated workspace state.
  - Produce structured result suitable for U7/U8 gates.

- [x] Step 7: Add U1 unit tests.
  - Traceability: US-001, US-002, US-004, US-009, FR-001, FR-002, FR-003, FR-004, FR-011.
  - Cover help output, `init` rejection, unknown command, duplicate harness, unsupported harness, flag preservation, no target access on parser/help/error paths, package metadata check, and Bun-required wrapper behavior.
  - Place tests under `tests/unit/` or `tests/setup/` using Bun test conventions and existing `covers:` registry style.

- [x] Step 8: Add U1 smoke test surface.
  - Traceability: US-001, FR-001, FR-002.
  - Add a smoke test or test helper that runs the package entrypoint for `--help` and validates stable stdout/stderr/exit behavior without repository clone assumptions.

- [x] Step 9: Extend root validation scope for setup package TypeScript.
  - Traceability: U5/U6/U7 infrastructure design, FR-016, user final goal.
  - Update `tsconfig.json` to include `packages/setup/src/**/*.ts`.
  - Update `package.json` `lint` script so `packages/setup/` is checked in addition to `tests/`.
  - Ensure `bun run check` fails on setup package typecheck/lint errors.

- [x] Step 10: Run focused verification.
  - Traceability: FR-016, Testing Posture.
  - Run `bun run typecheck`, `bun run lint`, focused U1 tests, and `git diff --check`.
  - Record any intentionally deferred U2-U5 behavior in `code-summary.md`.

## Non-Goals

- Do not implement GitHub tag resolution, archive fetch/extraction, target detection, operation planning, file apply, manifest write, verification, CI workflow YAML, release workflow YAML, or docs updates in U1.
- Do not convert the root `package.json` into the publishable installer package.
- Do not move existing root `core/`, `harness/`, `dist/`, or `scripts` paths.

## Verification Expectations

- `bun run typecheck` includes generated `packages/setup/src/**/*.ts`.
- `bun run lint` checks generated setup package sources.
- Focused tests demonstrate that help and parser errors never access target files.
- `amadeus-setup --help` lists `install` and `upgrade`, and does not list `init`.
