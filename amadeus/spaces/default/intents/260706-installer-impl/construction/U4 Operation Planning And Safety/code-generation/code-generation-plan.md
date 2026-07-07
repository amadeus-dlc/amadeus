# Code Generation Plan — U4 Operation Planning And Safety

> Stage: construction / code-generation  
> Unit: U4 Operation Planning And Safety

## Scope

U4 implements deterministic operation planning from U1 command intent, U2 source metadata, and U3 target detection/snapshot. It produces a `FileOperationPlan` before any target mutation. U4 must not prompt, render final UX text, copy files, write backups, write manifests, verify final readiness, read the live filesystem directly, or introduce legacy `core/` / `harness/` compatibility behavior.

## Plan

- [ ] Step 1: Add U4 plan domain types.
  - Traceability: US-002, US-004, US-005, US-006, US-007, FR-005, FR-006, FR-008, FR-009, FR-010, FR-011.
  - Add `FileOperationPlan`, `FileOperation`, `PlanningContext`, `InteractionMode`, no-write reason codes, confirmation reason codes, and backup path value types.
  - Reuse U1 `SetupCommand` / `Harness`, U2 `ResolvedVersion` / `DistributionFile` / `LoadedDistribution`, and U3 `TargetDetection` / `TargetSnapshot`.

- [ ] Step 2: Implement version and target-state no-write policies.
  - Traceability: BR-U4-015 through BR-U4-023.
  - Stop `upgrade` for `none`, `unsupported-layout`, unresolved `ambiguous-harness`, equal version, downgrade, and installed-newer-than-latest before file planning.
  - Treat `partial` as no-write unless `--force` is supplied.
  - Keep all no-write plans `canApply: false` with stable reason codes and zero executable write operations.

- [ ] Step 3: Implement file classification and collision policy.
  - Traceability: BR-U4-005 through BR-U4-014.
  - Source metadata class wins; `user-preserved` always skips.
  - Absent target file emits `add`.
  - Existing owned file emits update/force-update according to collision policy.
  - Existing shared file compares snapshot md5 against previous manifest/source md5; changed or unknown md5 requires backup before replacement.
  - `--yes` suppresses confirmation but not validation; `--force` bypasses collision prompts but never bypasses backups.

- [ ] Step 4: Implement backup path builder.
  - Traceability: BR-U4-024 through BR-U4-027.
  - Use one operation timestamp per plan in UTC basic `YYYYMMDDTHHMMSSZ`.
  - Build `<originalPath>.<timestamp>.bk`, preserving directory/basename.
  - Use injected `backupPathExists` predicate only for backup candidates, appending `.1`, `.2`, etc. before `.bk` on collisions.
  - Do not read the filesystem directly.

- [ ] Step 5: Implement install planner.
  - Traceability: FR-005, FR-008, FR-009, FR-010, FR-011.
  - Produce add/update/skip/backup/conflict/force-update operations from source metadata and target snapshot.
  - For non-interactive collision without `--force`, emit conflict-only no-write plan.
  - For interactive confirmation-required collisions, emit executable backup/update operations and set `requiresConfirmation: true`.
  - For `--force`, emit backup before force-update for changed/unknown shared files.

- [ ] Step 6: Implement upgrade planner.
  - Traceability: FR-006, FR-008, FR-009, FR-010.
  - Apply version and target-state policies before file planning.
  - For `manifest-installed`, compare installed manifest version and source version.
  - For `manual-or-unknown` and forced `partial`, use conservative shared-file backup policy.
  - Produce a `FileOperationPlan` that U5 can apply without recalculating policy.

- [ ] Step 7: Add plan invariant validation.
  - Traceability: BR-U4-001 through BR-U4-004a, security design.
  - Reject or downgrade unsafe plan candidates before returning: `canApply:false` requires no-write reason, `conflict` only appears in no-write plans, backup precedes dependent update/force-update, and mutating copy operations include `sourcePath` and `sourceMd5`.

- [ ] Step 8: Connect U4 to the application boundary without applying changes.
  - Traceability: FR-008, services plan-before-write contract.
  - Extend `executeSetupCommand` so after U2 source load and U3 snapshot it builds a `FileOperationPlan`.
  - Still stop before U5 apply/manifest write with `downstream-not-implemented`.
  - Include enough diagnostics in the boundary error/details for tests to assert plan creation without rendering final UX.

- [ ] Step 9: Add focused U4 unit tests for install planning.
  - Traceability: US-002, US-004, US-007, FR-005, FR-008, FR-009, FR-010, FR-011.
  - Cover clean add plan, user-preserved skip, shared unchanged update, shared changed non-interactive conflict no-write, interactive confirmation plan, and `--yes --force` backup before force-update.

- [ ] Step 10: Add focused U4 unit tests for upgrade planning.
  - Traceability: US-005, US-006, FR-006.
  - Cover target none, unsupported layout, ambiguous harness, partial no-force, partial force conservative plan, already-up-to-date, downgrade unsupported, installed-newer-than-latest, and newer explicit upgrade.

- [ ] Step 11: Add focused U4 unit tests for backup and invariant behavior.
  - Traceability: BR-U4-024 through BR-U4-028.
  - Cover UTC basic timestamp, collision suffixes, one timestamp for multiple backups, predicate only called for backup candidates, conflict not executable, and sourcePath/sourceMd5 on copy operations.

- [ ] Step 12: Update package/test coverage surfaces as needed.
  - Traceability: FR-016 and final TypeScript test goal.
  - Add U4 tests under `tests/unit/`, keep `packages/setup/**` in typecheck/lint, and avoid runtime dependency additions.

- [ ] Step 13: Run focused verification.
  - Traceability: Testing Posture, final goal.
  - Run U1-U4 focused tests, `bun run typecheck`, `bun run lint`, package metadata check, and `git diff --check`.

## Non-Goals

- Do not implement U5 file apply, backup writes, prompt handling, final reporter wording, manifest writes, or post-install verification.
- Do not implement CI workflow YAML, release workflow YAML, or docs updates in U4.
- Do not read the live filesystem directly from planner logic; use only injected predicates and U3 snapshots.
- Do not add `core/` / `harness/` symlink or backward-compatibility behavior.

## Verification Expectations

- Planner tests prove no target mutation and deterministic plan output.
- Safety tests prove no unsafe `canApply:true` plan for collisions, unsupported states, downgrade, or unresolved ambiguity.
- Backup tests prove backup-before-update ordering and portable paths.
- Generated TypeScript passes focused tests, root typecheck, and lint.
