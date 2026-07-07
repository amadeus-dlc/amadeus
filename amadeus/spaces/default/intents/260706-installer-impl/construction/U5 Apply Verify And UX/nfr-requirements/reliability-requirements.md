# Reliability Requirements — U5 Apply Verify And UX

> Stage: construction / nfr-requirements  
> Unit: U5 Apply Verify And UX  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U5 reliability means deterministic, explainable outcomes from an approved `FileOperationPlan`: no-write stays no-write, partial apply is classified, manifest write is sequenced, verification reports exact failed checks, and user-facing output reflects the same operation evidence.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| `canApply:false` plan | render no-write and call no mutating ports | no-write fixture |
| declined confirmation | no mutation, no manifest write, stable no-write reason | prompt fixture |
| successful apply | every mutating operation completes in order and `ApplyResult.ok === true` | integration fixture |
| backup failure | stop before dependent copy, `ApplyResult.ok === false`, manifest `not-started` | backup fault fixture |
| copy failure | stop, report completed operations and backup records, manifest `not-started` | copy fault fixture |
| manifest write failure | classify as `manifest-write-failed`, exit non-zero, report applied files | manifest fault fixture |
| verification failure | exit non-zero with failed check names and applied-operation context | verify fault fixture |
| success report | includes harness, distribution version, source tag, target path, manifest path, backup paths, and next steps | reporter snapshot |

## Failure Handling

- Backup and copy failures must preserve completed operation evidence.
- Manifest write failure after successful file apply must not be collapsed into file-copy failure.
- Verification failure must not imply automatic rollback.
- Unexpected exceptions should be converted to classified errors when possible and must not write a success manifest.
- Reporter output must distinguish no-write, partial apply, manifest failure, verification failure, and success.

## Ordering Reliability

The following invariants are mandatory:

- plan is rendered before any target mutation.
- Prompt Adapter is called only when prompts or confirmations are allowed.
- `backup` precedes dependent `update` or `force-update`.
- manifest write starts only after `ApplyResult.ok === true`.
- verification starts only after manifest write succeeds.
- final report is generated from `ApplyResult`, manifest write result, and `VerificationResult`, not by recalculating policy.

## Portability Reliability

U5 must satisfy `requirements.md` NFR-004 on macOS, Linux, and Windows-compatible shells where Bun is available.

| Surface | Requirement | Verification |
|---|---|---|
| paths with spaces | copy, backup, manifest, and verification paths preserve spaces | temp fixture |
| path separators | filesystem paths use platform path APIs | portability fixture |
| atomic manifest write | temp file is written in manifest directory before rename | manifest fixture |
| backup names | U5 consumes U4-approved portable backup paths without adding unsafe characters | integration fixture |
| terminal output | plain text output remains readable without POSIX-only control assumptions | snapshot fixture |

## Observability And Diagnostics

- Every no-write branch includes a reason code, no-change guarantee, and one next action.
- Every failed apply includes failed phase, failed operation, completed operations, backup records, and diagnostics.
- Every manifest write failure includes manifest path and applied-operation summary.
- Every verification failure includes failed check names.
- Force-applied operations and backup paths remain visible in final output.

## Upstream Coverage

- `business-logic-model.md`: workflow sequencing defines reliability outcomes.
- `business-rules.md`: apply, prompt, manifest, verification, reporter, and invariant rules define pass/fail behavior.
- `requirements.md`: FR-005, FR-006, FR-008, FR-009, FR-010, FR-011, FR-013, FR-014, NFR-002, NFR-003, NFR-004, and NFR-006 define reliability acceptance.
- `technology-stack.md`: Bun-based CI and tests define the reliability verification path.

