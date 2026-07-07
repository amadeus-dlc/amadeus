# Business Rules — U4 Operation Planning And Safety

> Stage: functional-design / Unit: `U4 Operation Planning And Safety`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Planning Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U4-001 | Planner must produce `FileOperationPlan` before any target write. | `requirements.md` FR-008, `services.md` |
| BR-U4-002 | Planner is pure policy logic over command, source metadata, target detection, and snapshot. | `components.md` Operation Planner |
| BR-U4-003 | Planner must not prompt, render final text, copy files, write backups, write manifest, or verify install. | `component-dependency.md` Forbidden Dependencies |
| BR-U4-004 | `canApply: false` means U5 must not mutate target files. | `component-methods.md` `applyPlan` |
| BR-U4-004a | `conflict` operations are no-write only. Interactive confirmation uses executable `backup` + `update` operations plus `requiresConfirmation: true`. | `component-methods.md` `FileOperationPlan` |

## File Classification Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U4-005 | Source metadata wins over fallback path policy. | `components.md` File Classifier |
| BR-U4-006 | File classes are exactly `owned`, `shared`, and `user-preserved`. | `requirements.md` FR-009 |
| BR-U4-007 | `user-preserved` paths are skipped and never overwritten. | `requirements.md` FR-009 |
| BR-U4-008 | Existing shared file with unknown previous md5 is treated as user-modified. | `requirements.md` FR-009 |
| BR-U4-009 | Existing shared file with changed md5 is backed up before replacement. | `requirements.md` FR-009 |

## `--yes` And `--force` Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U4-010 | `--yes` suppresses prompts but does not suppress validation or plan rendering. | `requirements.md` FR-010/FR-011 |
| BR-U4-011 | `--force` bypasses collision prompts but does not imply `--yes`. | `requirements.md` FR-010 |
| BR-U4-012 | `--force` does not fill missing harness or target in non-interactive mode. | `requirements.md` FR-010 |
| BR-U4-013 | `--force` never bypasses backup for changed or unknown shared files. | `requirements.md` FR-010 |
| BR-U4-014 | Non-interactive collision without `--force` is no-write. | `requirements.md` FR-011 |

## Upgrade Version Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U4-015 | Installed version equal to resolved/requested version is already-up-to-date no-write. | `requirements.md` FR-006 |
| BR-U4-016 | Requested version older than installed version is downgrade-unsupported no-write. | `requirements.md` FR-006 |
| BR-U4-017 | Installed version newer than default latest stable is installed-newer-than-latest no-write. | `requirements.md` FR-006 |
| BR-U4-018 | A newer explicit version may produce an upgrade plan. | `requirements.md` FR-006 |

## Target State Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U4-019 | `none` upgrade returns no-write instruction to run `install`. | `requirements.md` FR-006 |
| BR-U4-020 | `unsupported-layout` returns no-write unsupported-layout error. | `requirements.md` FR-006 |
| BR-U4-021 | `partial` in non-interactive mode is no-write unless `--force` is present. | `requirements.md` FR-006 |
| BR-U4-022 | `manual-or-unknown` uses conservative shared-file backup policy. | `requirements.md` FR-006/FR-009 |
| BR-U4-023 | `ambiguous-harness` is no-write if U3 did not resolve it through prompt. | `component-methods.md` Harness / Target Validation Matrix |

## Backup Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U4-024 | A backup operation must precede every force-update of changed or unknown shared file. | `requirements.md` FR-009/FR-010 |
| BR-U4-025 | All backups in one operation share one operation-start timestamp. | `requirements.md` FR-009 |
| BR-U4-026 | Backup timestamp uses Windows-safe UTC basic format `YYYYMMDDTHHMMSSZ`. | `component-methods.md` `buildBackupPath` |
| BR-U4-027 | Backup path collision appends `.1`, `.2`, etc before `.bk` using an injected `backupPathExists` predicate, not direct filesystem reads from U4. | `component-methods.md` `buildBackupPath` |
| BR-U4-028 | Mutating operations carry `sourcePath` so U5 can apply the approved plan without receiving a separate distribution object. | `component-methods.md` `FileOperation` |

## Testable Invariants

- Every plan has command, harness, target, resolved version, manifest path, operations, and `canApply`.
- No-write plans contain a reason and no write operations are executed by U5.
- `backup` appears before dependent `force-update`.
- `backup` appears before confirmation-gated `update` of changed or unknown shared files.
- `--yes --force` still backs up changed shared files.
- `--yes` without `--force` fails collision no-write.
- Unknown md5 on shared file is treated as changed.
