# Reliability Requirements — U4 Operation Planning And Safety

> Stage: construction / nfr-requirements  
> Unit: U4 Operation Planning And Safety  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U4 reliability means deterministic, explainable `FileOperationPlan` output for every command/target/version branch. A reliable U4 plan must either be executable by U5 without policy recalculation or block mutation with a precise no-write reason.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| missing required non-interactive values | `canApply:false`, validation no-write | plan fixture |
| clean install | `add` operations and `canApply:true` | plan fixture |
| non-interactive collision without force | `conflict`, `canApply:false` | plan fixture |
| interactive collision requiring confirmation | `backup` before `update`, `requiresConfirmation:true` | plan fixture |
| force collision on changed shared file | `backup` before `force-update` | force fixture |
| already up-to-date | no-write reason `already-up-to-date` | version fixture |
| downgrade | no-write reason `downgrade-unsupported` | version fixture |
| target none on upgrade | no-write reason instructs install | target fixture |
| unknown shared md5 | treated as changed and backup planned | snapshot fixture |

## Failure Handling

- Planner should return no-write plans for policy failures rather than throwing unexpected exceptions.
- Unexpected malformed input may throw or return classified developer error, but must not produce `canApply:true`.
- `canApply:false` plans must include `noWriteReason`.
- `requiresConfirmation:true` plans must include `confirmationReason`.
- Plans with mutating operations must include `sourcePath` on each mutating operation.

## Ordering Reliability

The following invariants are mandatory:

- `backup` precedes dependent `update` or `force-update`.
- `conflict` operations are never executable operations.
- `user-preserved` operations are `skip`.
- one operation timestamp is used for every backup path in one plan.
- backup path collision suffixes are deterministic.
- plan rendering can explain every add/update/skip/backup/conflict/force-update.

## Portability Reliability

U4 must satisfy `requirements.md` NFR-004 for backup names and paths:

| Surface | Requirement | Verification |
|---|---|---|
| Backup timestamp | UTC basic `YYYYMMDDTHHMMSSZ`, no `:` | backup path fixture |
| Backup path | same directory/basename plus timestamp and suffix | path fixture |
| Collision suffix | `.1`, `.2`, etc before `.bk` | collision fixture |
| Path separators | use platform path APIs for filesystem paths; operation paths remain portable relative paths | portability fixture |
| Paths with spaces | backup path preserves basename and directory | temp fixture |

## Observability And Diagnostics

- Every no-write branch has a stable reason code.
- Every backup has a reason.
- Every forced operation is distinguishable from safe update.
- Reporter can render the plan without recalculating policy.
- U5 can apply the plan without receiving hidden policy inputs.

## Upstream Coverage

- `business-logic-model.md`: decision tree and output contract define reliability outcomes.
- `business-rules.md`: testable invariants define pass/fail conditions.
- `requirements.md`: FR-005, FR-006, FR-008, FR-009, FR-010, FR-011, NFR-002, NFR-003, and NFR-004 define reliability behavior.
- `technology-stack.md`: Bun-based CI and package scripts define how reliability checks run.
