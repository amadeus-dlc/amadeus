# Code Generation Plan — U3 Target State And Manifest

> Stage: construction / code-generation  
> Unit: U3 Target State And Manifest

## Scope

U3 implements read-only target state detection, installer manifest schema/read contract, sentinel fallback classification, optional `kiro` / `kiro-ide` ambiguity resolution, and target snapshots for downstream planning. It must not resolve source versions, decide overwrite policy, copy files, write manifests, or verify post-install readiness.

## Plan

- [x] Step 1: Add U3 target and manifest domain types.
  - Traceability: US-002, US-005, US-006, US-007, FR-006, FR-013, BR-U3-001 through BR-U3-004.
  - Add `InstallerManifest`, `TargetDetection`, `TargetSnapshot`, `SentinelSet`, `ManifestReadResult`, diagnostics payloads, and manifest validation error classifications.
  - Reuse U1 `Harness` and U2 `DistributionFile` types.

- [x] Step 2: Define narrowed read-only ports.
  - Traceability: BR-U3-015 through BR-U3-018, infrastructure service boundary.
  - Add `TargetManifestReadPort` with `readManifestForDetection(targetPath)` and `TargetReadOnlyFilePort` with read-only `exists`, `readFile`, and `md5` behavior.
  - Add optional `PromptPort` only for `kiro` / `kiro-ide` ambiguity.
  - Avoid depending on any broad filesystem port that exposes write/copy/rename methods.

- [x] Step 3: Implement manifest schema validation and store read adapter.
  - Traceability: FR-013, BR-U3-001 through BR-U3-007.
  - Validate schema version, package/distribution/source fields, ISO timestamp, harness, and `files[]` relative path/class/required/md5 entries.
  - Treat absent, unreadable, and invalid manifests as non-installed for detection while preserving diagnostics.
  - Return requested-harness mismatch as a classified no-write error.

- [x] Step 4: Implement sentinel detection and target classification.
  - Traceability: FR-006, BR-U3-008 through BR-U3-014.
  - Use fixed sentinel path tables for `claude`, `codex`, `kiro`, and `kiro-ide`.
  - Classify selected harness as `manual-or-unknown`, `partial`, or `none`.
  - Infer a harness when no harness is requested and exactly one sentinel set fully matches.
  - Return or resolve `kiro` / `kiro-ide` ambiguity inside detection using `PromptPort` only when prompts are allowed.

- [x] Step 5: Implement unsupported layout detection without recursive scans.
  - Traceability: FR-006, BR-U3-011, performance/security design.
  - Detect unsupported layout only from the current first-release sentinel surface; do not add backward-compatibility handling for legacy `core/` or `harness/` paths.
  - Do not create, follow as compatibility, or recommend symbolic links for `core/` or `harness/`.
  - Return `unsupported-layout` with reason diagnostics and no writes.

- [x] Step 6: Implement target snapshot builder.
  - Traceability: US-007, FR-009, BR-U3-015 through BR-U3-018.
  - Read only expected paths from distribution metadata and valid manifest context.
  - For readable existing files, record md5; for unreadable existing files, keep `exists: true` and omit md5.
  - Include diagnostics for expected file count, unknown md5 count, and normalized unreadable file reasons.

- [x] Step 7: Connect U3 to the application boundary without applying changes.
  - Traceability: US-005, US-006, FR-005, FR-006, FR-011.
  - Extend `executeSetupCommand` so after U2 source load it detects target state and builds a snapshot when target is supplied.
  - Preserve `downstream-not-implemented` stop before U4 planning/U5 apply.
  - Keep no-write behavior for missing target/harness and all detection failures.

- [x] Step 8: Add focused U3 unit tests for manifest behavior.
  - Traceability: FR-013, BR-U3-001 through BR-U3-007.
  - Cover valid manifest-installed, harness inference, harness mismatch no-write error, invalid manifest fallback, unreadable manifest diagnostics, and path validation rejection.

- [x] Step 9: Add focused U3 unit tests for sentinel classification and ambiguity.
  - Traceability: FR-006, FR-011, BR-U3-008 through BR-U3-014.
  - Cover complete/manual, partial, none, unsupported layout, no-harness inference, non-interactive ambiguous `kiro` / `kiro-ide`, and prompt-resolved ambiguity.

- [x] Step 10: Add focused U3 snapshot and service tests.
  - Traceability: US-007, FR-009, BR-U3-015 through BR-U3-018.
  - Cover expected-path-only reads, readable md5, unreadable md5 omission, no recursive scans, no writes, and service flow stopping before planning/apply.

- [x] Step 11: Update package/test coverage surfaces as needed.
  - Traceability: FR-016 and final TypeScript test goal.
  - Add U3 tests under `tests/unit/`, keep `packages/setup/**` in typecheck/lint, and avoid runtime dependency additions.

- [x] Step 12: Run focused verification.
  - Traceability: Testing Posture, final goal.
  - Run U1-U3 focused tests, `bun run typecheck`, `bun run lint`, package metadata check, and `git diff --check`.

## Non-Goals

- Do not implement U4 operation planning, overwrite/backup/conflict policy, or downgrade/already-up-to-date decisions.
- Do not implement U5 file apply, manifest write sequencing, post-install verification, or reporter UX beyond classified U3 boundary errors.
- Do not implement CI workflow YAML, release workflow YAML, or docs updates in U3.
- Do not scan the entire target tree or introduce a persistent cache.
- Do not implement `core/` or `harness/` symlink/backward-compatibility behavior.

## Verification Expectations

- Manifest and sentinel tests prove target detection without target writes.
- Snapshot tests prove expected-path-only reads and md5 behavior.
- Application service tests prove source load can feed detection/snapshot and still stop before target mutation.
- Generated TypeScript passes focused tests, root typecheck, and lint.
