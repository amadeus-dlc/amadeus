# Security Requirements — U5 Apply Verify And UX

> Stage: construction / nfr-requirements  
> Unit: U5 Apply Verify And UX  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U5 security covers safe execution of an approved `FileOperationPlan`, prompt suppression, non-destructive backup enforcement, manifest write sequencing, verification diagnostics, and user-visible reporting. U5 must not widen U4's policy decisions or infer new write permissions from live target state.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| no-write plan mutates target | `canApply:false` stops before File Applier mutation ports | no-write integration test |
| policy is recalculated during apply | U5 consumes operation `sourcePath` and plan fields only | fake port test rejects snapshot/policy calls |
| changed shared file overwritten before backup | dependent `backup` must complete before `update` or `force-update` | operation order test |
| `--yes` or non-TTY still prompts | Prompt Adapter is never called when prompts are disallowed | prompt spy test |
| declined confirmation mutates files | default/declined confirmation returns no-write | prompt fixture |
| manifest claims success after partial copy | manifest write remains `not-started` when `ApplyResult.ok === false` | failure fixture |
| manifest write failure hides applied files | result is `manifest-write-failed` and reports applied operations | manifest fault fixture |
| report leaks file contents or environment secrets | Reporter emits paths, classes, reason codes, and next action only | snapshot review |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| `FileOperationPlan` | safety-critical internal contract | rendered before writes and executed without policy recalculation |
| source files | distribution content | copied from approved `sourcePath`; contents are not printed |
| target paths | local filesystem metadata | printed only as paths/operation examples |
| backup paths | user customization preservation evidence | shown before apply and in final result |
| manifest | installer state and traceability data | atomically written after successful apply |
| diagnostics | operational metadata | no environment dump or file content excerpt |

## Controls

- `canApply:false` prevents all target mutations and manifest writes.
- `conflict` and `skip` are never executed as mutating operations.
- `backup` must be durable before the dependent copy operation starts.
- `--force` bypasses confirmation only; it must not bypass shared-file backup.
- Confirmation default is no-write.
- Manifest write starts only after `ApplyResult.ok === true`.
- Verification uses manifest entries and readiness checks; it must not silently repair target files.
- Reporter includes exactly one concrete next action for classified errors.

## Compliance Mapping

U5 does not process regulated personal data. Compliance value is safety, auditability, and user customization preservation under `requirements.md` NFR-002 and NFR-003. Evidence comes from the pre-apply report, backup records, manifest entries, and classified result diagnostics.

## Upstream Coverage

- `business-logic-model.md`: U5 trust boundaries and sequencing define security controls.
- `business-rules.md`: no-write, prompt, manifest, verification, and reporter rules define security invariants.
- `requirements.md`: FR-008, FR-009, FR-010, FR-011, FR-013, FR-014, NFR-002, NFR-003, NFR-004, and NFR-006 define security-relevant acceptance.
- `technology-stack.md`: Bun/TypeScript and package test path inform verification approach.

