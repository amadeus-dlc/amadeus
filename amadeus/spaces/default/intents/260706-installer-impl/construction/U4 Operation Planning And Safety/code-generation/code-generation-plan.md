# Code Generation Plan — U4 Operation Planning And Safety

> Stage: construction / code-generation  
> Unit: U4 Operation Planning And Safety

## Scope

U4 implements deterministic operation planning from U1 command intent, U2 source metadata, and U3 target detection/snapshot. It produces a `FileOperationPlan` before any target mutation. U4 must not prompt, render final UX text, copy files, write backups, write manifests, verify final readiness, read the live filesystem directly, or introduce legacy `core/` / `harness/` compatibility behavior.

## Plan

- [x] Step 1: Add U4 plan domain types.
- [x] Step 2: Implement version and target-state no-write policies.
- [x] Step 3: Implement file classification and collision policy.
- [x] Step 4: Implement backup path builder.
- [x] Step 5: Implement install planner.
- [x] Step 6: Implement upgrade planner.
- [x] Step 7: Add plan invariant validation.
- [x] Step 8: Connect U4 to the application boundary without applying changes.
- [x] Step 9: Add focused U4 unit tests for install planning.
- [x] Step 10: Add focused U4 unit tests for upgrade planning.
- [x] Step 11: Add focused U4 unit tests for backup and invariant behavior.
- [x] Step 12: Update package/test coverage surfaces as needed.
- [x] Step 13: Run focused verification.

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
