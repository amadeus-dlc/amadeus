# Logical Components — U4 Operation Planning And Safety

> Stage: construction / nfr-design  
> Unit: U4 Operation Planning And Safety

## Component Inventory

| Component | Responsibility | Failure Domain |
|---|---|---|
| `OperationPlanner` | orchestrates install/upgrade planning and returns `FileOperationPlan` | plan contract only |
| `VersionPolicy` | evaluates equal/downgrade/installed-newer/newer version branches | version no-write decisions |
| `TargetStatePolicy` | maps U3 `TargetDetection` states to apply/no-write planning branch | target-state decisions |
| `FileClassifier` | chooses `owned` / `shared` / `user-preserved` from metadata and fallback rules | file policy |
| `CollisionPolicy` | handles existing target rows, `--yes`, `--force`, prompt mode, and confirmation gates | overwrite safety |
| `BackupPlanner` | builds backup operations and deterministic backup paths | backup ordering and path collision |
| `OperationBuilder` | emits `add` / `update` / `skip` / `backup` / `conflict` / `force-update` operations | operation schema |
| `PlanValidator` | asserts plan invariants before returning | unsafe `canApply:true` prevention |

## Boundaries

`OperationPlanner` consumes U1 command/mode, U2 resolved version and distribution files, U3 target detection and snapshot, and Application Service supplied timestamp/predicate. It does not prompt, render final text, read live filesystem, hash files, copy files, write backups, write manifests, verify readiness, publish releases, dispatch GitHub Actions, or run npm publish.

`BackupPlanner` can call only the injected `backupPathExists` predicate. It must not receive filesystem adapters directly.

`PlanValidator` runs inside U4 before returning a plan. It rejects executable conflict operations, missing no-write reasons, missing confirmation reasons, missing `sourcePath` on source-copy operations (`add` / `update` / `force-update`), missing `backupPath` on `backup`, and backup ordering violations.

## Data Flow

1. Application Service builds `PlanningContext`.
2. `OperationPlanner` validates required command/harness/target values.
3. `TargetStatePolicy` handles `none` / `partial` / `unsupported-layout` / `ambiguous-harness` no-write branches.
4. `VersionPolicy` handles manifest-installed version branches.
5. `FileClassifier` and `CollisionPolicy` evaluate source metadata against snapshot rows.
6. `BackupPlanner` inserts backup operations before dependent overwrite operations.
7. `OperationBuilder` creates ordered `FileOperation[]`.
8. `PlanValidator` verifies invariants.
9. Reporter/Prompt/U5 receive the same `FileOperationPlan`.

## Failure Domains

Version policy defects can produce wrong no-write or upgrade decisions but cannot mutate files without U5 honoring `canApply`. Tests cover version fixtures.

Collision policy defects are safety-critical because they can omit backup or conflict. Tests must cover shared changed/unknown md5, `--yes`, `--force`, and confirmation modes.

Backup planner defects can produce duplicate or unsafe backup paths. Tests cover one timestamp and suffix ordering.

Plan validator defects reduce defense in depth. It should be small and exhaustive over operation kinds.

## Infrastructure Bridge

U4 has no cloud or runtime infrastructure. Its CI bridge is pure unit tests, benchmark fixtures, and invariant checks. U7 quality gates should include planner branch coverage because U4 is safety-critical.

## Upstream Coverage

- `performance-requirements.md`: components keep planning pure, bounded, and benchmarkable.
- `security-requirements.md`: destructive-operation prevention、force/yes limits、traceability map to policies and validator.
- `scalability-requirements.md`: no shared mutable planner state、capacity targets、growth guardrails map to component boundaries.
- `reliability-requirements.md`: deterministic output、ordering invariants、no-write/confirmation reasons map to plan validator.
- `tech-stack-decisions.md`: TypeScript/Bun、pure functions、injected predicate、one timestamp per plan map to components.
- `business-logic-model.md`: planning inputs、install/upgrade planning、backup path workflow、output contract、integration boundaries を component boundaries に反映した。
