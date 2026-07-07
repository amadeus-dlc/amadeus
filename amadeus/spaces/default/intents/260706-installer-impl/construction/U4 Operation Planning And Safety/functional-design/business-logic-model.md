# Business Logic Model — U4 Operation Planning And Safety

> Stage: functional-design / Unit: `U4 Operation Planning And Safety`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U4 converts source distribution metadata and target snapshots into a deterministic `FileOperationPlan`. It owns file classification, install/upgrade planning, version-state decisions, no-write outcomes, `--yes`/`--force` policy, conflict classification, and backup path planning. It does not prompt, render final wording, copy files, write backups, write manifests, or verify post-apply readiness.

Primary stories from `unit-of-work-story-map.md`:

- US-002: clean install gets an add plan.
- US-004: non-interactive install fails safely without required flags or force.
- US-005: manifest-installed upgrade compares versions and plans updates.
- US-006: manual/partial/none/unsupported states are handled conservatively.
- US-007: changed or unknown shared files are backed up before replacement.

## Planning Inputs

| Input | Producer | Use |
|---|---|---|
| `SetupCommand` | U1 | command, harness, target, version, yes, force |
| `InteractionMode` | U1/Application Service | prompt suppression and confirmation policy |
| `ResolvedVersion` | U2 | source version and tag |
| `DistributionFile[]` | U2 | file class, required flag, source md5 |
| `TargetDetection` | U3 | target state and manifest context |
| `TargetSnapshot` | U3 | existing files and md5 when available |
| `ClockPort.operationTimestamp()` | Application Service | single operation timestamp for backup paths |

## Install Planning Workflow

1. Validate command has resolved harness and target.
2. Read target snapshot for source distribution paths.
3. For each source file, classify as `owned`, `shared`, or `user-preserved`.
4. If target file is absent, emit `add`.
5. If target file exists at a `user-preserved` path, emit `skip`.
6. If target file exists at an `owned` path, emit `update` or `force-update` depending on collision policy.
7. If target file exists at a `shared` path and md5 matches expected previous md5, emit `update`.
8. If target file exists at a `shared` path and md5 differs or is unknown:
   - without `--force` in non-interactive mode, emit `conflict` and set `canApply: false`;
   - with confirmation required, emit executable ordered operations (`backup` before `update`) and set `requiresConfirmation: true`;
   - with `--force`, emit `backup` before `force-update`.
9. Return `FileOperationPlan` before any writes.

## Upgrade Planning Workflow

1. Read `TargetDetection`.
2. For `none`, return no-write plan with instruction to run `install`.
3. For `unsupported-layout`, return no-write plan.
4. For `ambiguous-harness`, return no-write plan unless already resolved by U3 prompt.
5. For `partial`, return no-write in non-interactive mode unless `--force` is supplied.
6. For `manifest-installed`, compare installed version and resolved/requested version:
   - equal: already-up-to-date no-write;
   - requested older: downgrade-unsupported no-write;
   - installed newer than default latest: installed-newer-than-latest no-write;
   - newer target version: continue planning.
7. For `manual-or-unknown`, use source metadata and `TargetSnapshot`; treat unknown shared existing files as user-modified.
8. Emit add/update/skip/backup/conflict/force-update operations.
9. Return `FileOperationPlan`.

## Backup Path Workflow

1. Use one operation-start timestamp for every backup in a plan.
2. Format timestamp as UTC basic `YYYYMMDDTHHMMSSZ`.
3. Preserve original path directory and basename.
4. Build backup path as `<originalPath>.<timestamp>.bk`.
5. Check collision through the injected `backupPathExists` predicate used by `buildBackupPath`; U4 does not read the filesystem directly.
6. If backup path exists, append `.1`, `.2`, and so on before `.bk`.
7. Planner emits backup operations before any update/force-update that depends on them.

## Decision Tree

| Condition | Plan Result |
|---|---|
| missing required non-interactive harness or target | validation no-write |
| clean install target | add operations, can apply |
| install collision without force in non-interactive mode | conflict operations, `canApply: false` |
| install collision with force | backup then force-update for changed/unknown shared files |
| upgrade target none | no-write, run install |
| upgrade unsupported layout | no-write, unsupported-layout |
| upgrade up-to-date | no-write, already-up-to-date |
| upgrade downgrade request | no-write, downgrade-unsupported |
| manual-or-unknown shared file unknown md5 | backup before copy if applying |

## Output Contract

`FileOperationPlan` is the single contract between policy, reporting, prompting, apply, and manifest generation. Mutating operations carry `sourcePath` so File Applier can copy from the approved source without receiving a separate distribution object. Reporter renders the plan before writes. File Applier executes it without recalculating policy.

## Integration Boundaries

- U4 consumes `ResolvedVersion` and `DistributionFile[]` from U2.
- U4 consumes `TargetDetection` and `TargetSnapshot` from U3.
- U4 supplies `FileOperationPlan` to U5.
- `component-methods.md` defines `planInstall`, `planUpgrade`, `classifyFile`, `buildBackupPath`, `FileOperation`, and `FileOperationPlan`.
- `services.md` requires plan rendering before target mutation.
