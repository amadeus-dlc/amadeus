# Business Rules — U5 Apply Verify And UX

> Stage: functional-design / Unit: `U5 Apply Verify And UX`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Apply Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U5-001 | FileOperationPlan is rendered before any write. | `requirements.md` FR-008 |
| BR-U5-002 | `canApply: false` plans must not mutate target files. | `component-methods.md` `applyPlan` |
| BR-U5-003 | File Applier executes operations in plan order and does not recalculate policy. | `components.md` File Applier |
| BR-U5-004 | `backup` must complete before dependent `update` or `force-update`. | `requirements.md` FR-009/FR-010 |
| BR-U5-005 | Mutating operations copy from operation `sourcePath`; U5 does not infer source location. | `component-methods.md` `FileOperation` |
| BR-U5-006 | `conflict` is no-write and must not be executed as a mutation. | `component-methods.md` `FileOperationPlan` |
| BR-U5-006a | Manifest write and verification run only when `ApplyResult.ok === true`. | `component-methods.md` `ApplyResult` |
| BR-U5-006b | Backup/copy failure returns `ApplyResult.ok: false` with failed phase and failed operation, and manifest write remains `not-started`. | `component-methods.md` `ApplyResult` |

## Prompt Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U5-007 | `--yes` suppresses prompts and confirmations. | `requirements.md` FR-010/FR-011 |
| BR-U5-008 | Confirmation default is no-write. | `mockups.md` M2 |
| BR-U5-009 | Missing harness/target prompts are allowed only in interactive mode. | `requirements.md` CLI Contract |
| BR-U5-010 | Prompt Adapter is never called when prompts are disallowed. | `component-methods.md` `PromptPort` |

## Manifest Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U5-011 | Manifest write happens only after file apply succeeds. | `services.md` Lifecycle Characteristics |
| BR-U5-012 | Manifest write is atomic through temp file and rename. | `component-methods.md` `writeManifest` |
| BR-U5-013 | Manifest write failure after apply is `manifest-write-failed`, not file-copy failure. | project memory application-design:c8 |
| BR-U5-014 | Manifest write failure returns non-zero and reports applied operations. | `services.md` Lifecycle Characteristics |

## Verification Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U5-015 | Required files are checked from manifest entries. | `requirements.md` FR-014 |
| BR-U5-016 | Harness directory and tools directory must exist. | `requirements.md` FR-014 |
| BR-U5-017 | Active-space memory shell must exist. | `requirements.md` FR-014 |
| BR-U5-018 | Absence of state/intent in fresh install is tolerated. | `components.md` Verifier |

## Reporter Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U5-019 | Default output is human-readable plain text. | project memory refined-mockups:c6 |
| BR-U5-020 | Plan table columns are `Operation`, `Files`, and `Example`. | `mockups.md` M2/M3/M4 |
| BR-U5-021 | Errors include classified reason, no-change guarantee when true, and one next action. | `requirements.md` FR-011 |
| BR-U5-022 | Force-applied operations are marked. | `requirements.md` FR-008 |
| BR-U5-023 | Backup paths are visible before apply and in final result. | `requirements.md` FR-009 |

## Testable Invariants

- Declined confirmation leaves target unchanged.
- `--yes` with conflict and no force renders no-write.
- `--force` plan executes backup before force-update.
- Backup or copy failure prevents manifest write.
- Manifest write failure after copy exits non-zero and reports copied files.
- Verification failure exits non-zero with failed check names.
- Reporter snapshots are generated from `FileOperationPlan`, not independent policy.
