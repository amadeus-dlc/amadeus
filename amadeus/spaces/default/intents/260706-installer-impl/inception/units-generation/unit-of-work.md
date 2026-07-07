# Unit Of Work — インストーラの実装

> Stage: units-generation / Intent: `260706-installer-impl`  
> Upstream: `application-design/components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `decisions.md`, `requirements-analysis/requirements.md`, `user-stories/stories.md`

## Decomposition Summary

`@amadeus-dlc/setup` は `packages/setup/` 配下の単一 publishable package として実装する。unit は deployable service ではなく、Construction が参照する capability-slice である。各 unit は必要な CLI/application/domain/adapter/test/docs 断面をまたいでよいが、Stage 2.7 では配送順や critical path を決めない。

| Unit | Name | Complexity | Deployment Model | Primary Boundary |
|---|---|---:|---|---|
| U1 | Setup Package Shell | M | standalone package foundation | package metadata, bin, parser, runtime startup |
| U2 | Version And Distribution Source | M | embedded in setup package | stable tag resolution, GitHub archive, extraction, metadata |
| U3 | Target State And Manifest | M | embedded in setup package | manifest schema/store, target detection, target snapshot |
| U4 | Operation Planning And Safety | L | embedded in setup package | file classification, operation plan, force/yes/backup/no-write policy |
| U5 | Apply Verify And UX | L | embedded in setup package | apply, prompt/report, manifest write after apply, verification |
| U6 | Installer Test Harness | M | repo test support | unit/integration/smoke fixtures for installer behavior |
| U7 | CI And Package Gates | M | repository CI support | blocking installer PR gates and package validation |
| U8 | Manual Release And Docs | M | repository release/docs support | workflow_dispatch release and user-facing docs |

## Unit Definitions

### U1: Setup Package Shell

- Owns `packages/setup/package.json`, package metadata, files allowlist, license/repository metadata, and bin exposure for `amadeus-setup`.
- Implements Bun-first process entry, best-effort `npx` delegation when Bun exists, and Bun-required failure when it does not.
- Implements command grammar for `install` and `upgrade`; rejects `init`, unknown commands, duplicate or unsupported harness values.
- Establishes source tree conventions under `packages/setup/src/**` without changing root package into the publishable installer.
- Traceability: FR-001, FR-002, FR-003, FR-004, US-001, US-004, ADR-001, ADR-002.

### U2: Version And Distribution Source

- Owns stable SemVer tag resolution from `https://github.com/amadeus-dlc/amadeus`.
- Excludes prereleases by default, permits explicit prerelease requests, prefers `vX.Y.Z` over duplicate `X.Y.Z`, and reports ignored duplicates.
- Owns GitHub tag/archive ports and adapters, one retry for transient archive fetch failure, archive extraction, and selected `dist/<harness>/` loading.
- Owns source distribution metadata reading, including first-release fallback from `dist/<harness>/` path policy.
- Traceability: FR-007, FR-012, US-008, US-012, ADR-003.

### U3: Target State And Manifest

- Owns installer manifest schema and storage at `amadeus/.installer/amadeus-setup-manifest.json`.
- Implements manifest-first upgrade detection; manifest harness wins when valid.
- Implements sentinel classification for `manifest-installed`, `manual-or-unknown`, `partial`, `none`, `unsupported-layout`, and `ambiguous-harness`.
- Captures target snapshots for planner input without performing writes.
- Handles `kiro` / `kiro-ide` no-manifest ambiguity as promptable in interactive mode and no-write in non-interactive mode.
- Traceability: FR-006, FR-013, US-005, US-006, AD-OQ-004.

### U4: Operation Planning And Safety

- Owns `FileOperationPlan` as the central safety contract shared by reporter and applier.
- Implements `planInstall`, `planUpgrade`, `classifyFile`, and backup path generation.
- Enforces `--yes` and non-TTY validation, collision aborts, `--force` behavior, backup-before-force-update, downgrade rejection, already-up-to-date, installed-newer-than-latest, partial install no-write policy, and unsupported layout no-write policy.
- Keeps planning pure where possible so filesystem/network/prompt effects remain behind value objects and ports.
- Traceability: FR-005, FR-006, FR-008, FR-009, FR-010, FR-011, US-002, US-004, US-005, US-006, US-007, ADR-004.

### U5: Apply Verify And UX

- Owns applying an approved `FileOperationPlan` without recalculating policy.
- Writes backups before overwriting changed or unknown shared files.
- Calls manifest write after apply succeeds and classifies manifest write failure separately from file-copy failure.
- Implements prompt adapter for harness/target/confirmation only when prompts are allowed.
- Implements canonical plain-text plan/result/error rendering and post-install verification checks.
- Traceability: FR-005, FR-008, FR-013, FR-014, US-002, US-003, US-005, US-007.

### U6: Installer Test Harness

- Owns deterministic unit, integration, and smoke test fixtures for `packages/setup`.
- Covers command parsing, Bun/npx startup behavior, SemVer resolver edge cases, target detection, manifest-first upgrade, `kiro`/`kiro-ide` ambiguity, backup filename portability, non-interactive validation, no-write guarantees, plan/report consistency, apply/manifest/verify outcomes, and network retry behavior.
- Provides temp target fixtures and fake ports/adapters so domain policy can be tested without real GitHub or user project mutation.
- Traceability: NFR-001, NFR-002, NFR-003, NFR-004, US-001..US-012.

### U7: CI And Package Gates

- Owns installer-related PR gate selection for `packages/setup/**`, installer docs/tests, release workflow, package metadata, and installer-owned CI configuration.
- Wires blocking package dry-run, smoke/integration tests, coverage registry/ratchet, typecheck/lint, `dist:check`, `promote:self:check`, dependency audit or OSV, secret scan, and package metadata validation.
- Requires explicit rationale for High/Critical vulnerability allowlist entries and runtime dependency additions.
- Traceability: FR-016, US-010, ADR-005.

### U8: Manual Release And Docs

- Owns manually triggered GitHub Actions release surface for installer publication.
- Defaults release tag input to latest stable SemVer tag when omitted, and includes package build, package dry-run, SBOM/provenance, publish validation, and post-publish verification hooks.
- Updates root README and setup package docs so `amadeus-setup install` / `upgrade` are the primary path, with Bun requirement and best-effort `npx` caveat.
- Keeps local manual npm publish and automatic `main` publish out of the first release.
- Traceability: FR-015, FR-017, US-009, US-011, US-013, ADR-005.

## Boundary Notes

- The units intentionally do not move existing `core/`, `harness/`, `dist/`, or `scripts/` paths.
- `scripts/package.ts` remains an upstream producer of trusted `dist/<harness>/`; no unit imports it as runtime logic.
- CI/release/docs are included because they carry Must acceptance criteria, not because they are runtime components.
- Stage 2.8 Delivery Planning will choose Bolt grouping and sequence from the DAG; this file only names implementable units.

