# Domain Entities — U4 Operation Planning And Safety

> Stage: functional-design / Unit: `U4 Operation Planning And Safety`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Entity Overview

U4 entities are policy and planning value objects. They are deterministic outputs from source metadata plus target state. U4 does not mutate target files; U5 applies the plan.

## FileOperationPlan

| Attribute | Type | Rule |
|---|---|---|
| `command` | `install` / `upgrade` | Mirrors `SetupCommand`. |
| `harness` | harness | Resolved or inferred harness. |
| `target` | path | Target project root. |
| `resolvedVersion` | ResolvedVersion | Source distribution identity from U2. |
| `manifestPath` | path | Target manifest path. |
| `operations` | FileOperation[] | Ordered operations, including backups before dependent updates. |
| `canApply` | boolean | False blocks U5 mutation. |
| `noWriteReason` | optional string | Required when `canApply` is false. |
| `requiresConfirmation` | boolean | True when interactive user confirmation is required before U5 apply. |
| `confirmationReason` | optional string | Human-facing reason code for Prompt/Reporter; U4 does not render final wording. |

Lifecycle: created by `planInstall` / `planUpgrade`, rendered before writes, consumed by U5 File Applier.

## FileOperation

| Kind | Attributes | Meaning |
|---|---|---|
| `add` | path, class, sourcePath, sourceMd5 | Target file absent; add from approved source file. |
| `update` | path, class, sourcePath, previousMd5, sourceMd5 | Safe or confirmation-gated replacement. |
| `skip` | path, class, reason | Preserve or no-op. |
| `backup` | path, backupPath, reason | Backup must occur before overwrite. |
| `conflict` | path, class, reason | No-write conflict; not executed by File Applier. |
| `force-update` | path, class, sourcePath, backupPath, sourceMd5 | Apply after required backup when needed. |

## FileClass

| Class | Behavior |
|---|---|
| `owned` | May be updated after report; backup not required unless future metadata marks shared. |
| `shared` | Compare md5; changed or unknown requires backup before copy. |
| `user-preserved` | Always skip; never overwrite. |

## PlanningContext

| Attribute | Producer | Rule |
|---|---|---|
| `command` | U1 | Contains flags and command. |
| `mode` | U1/Application Service | Encodes interactive/non-interactive prompts and confirmations. |
| `distribution` | U2 | Source root and resolved version. |
| `metadata` | U2 | File classes and md5. |
| `targetDetection` | U3 | Target state and manifest context. |
| `targetSnapshot` | U3 | Existing file existence and md5 when readable. |
| `operationTimestamp` | ClockPort | One timestamp per plan. |
| `backupPathExists` | Application Service / filesystem adapter | Predicate used by `buildBackupPath`; keeps U4 from reading filesystem directly. |

## BackupPath

| Attribute | Rule |
|---|---|
| `originalPath` | Relative target path being backed up. |
| `timestamp` | UTC basic `YYYYMMDDTHHMMSSZ`. |
| `suffix` | `.bk`, with numeric collision suffix if needed. |
| `backupPath` | Same directory/basename plus timestamp and suffix. |

## Relationships

```text
SetupCommand + InteractionMode
  + ResolvedVersion + DistributionFile[]
  + TargetDetection + TargetSnapshot
  + operation timestamp
  -> planInstall | planUpgrade
  -> FileOperationPlan
  -> Reporter / Prompt / File Applier
```

## State Boundaries

- U4 does not read live filesystem directly; it consumes U3 snapshots.
- U4 does not fetch archives; it consumes U2 metadata.
- U4 does not prompt; it encodes whether confirmation is required or plan cannot apply.
- U4 does not write backup files; it emits backup operations.
- U4 does not write manifest; U5/Application Service handle manifest after apply.
- U4 does not receive a separate distribution at apply time; mutating operations include `sourcePath`.

## Traceability

- `requirements.md` FR-005, FR-006, FR-008, FR-009, FR-010, and FR-011 define U4 behavior.
- `unit-of-work.md` U4 defines planning and safety ownership.
- `unit-of-work-story-map.md` maps U4 to US-002, US-004, US-005, US-006, and US-007.
- `components.md`, `component-methods.md`, and `services.md` define planner, classifier, and plan contract boundaries.
