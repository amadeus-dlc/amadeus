# Security Requirements — U4 Operation Planning And Safety

> Stage: construction / nfr-requirements  
> Unit: U4 Operation Planning And Safety  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U4 security covers destructive-operation prevention at the planning layer: file class policy, non-interactive no-write, `--force` limits, backup-before-overwrite ordering, downgrade prevention, and plan traceability. U4 does not write files; its security value is preventing U5 from receiving an unsafe executable plan.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| user customization overwritten silently | changed/unknown shared files require backup before update/force-update | plan invariant test |
| `--force` bypasses backup | `--force` bypasses prompt only; backup remains required | force fixture |
| `--yes` turns collision into apply | `--yes` suppresses prompts but collision without force is no-write | non-interactive fixture |
| conflict operation accidentally executed | `conflict` appears only in `canApply:false` no-write plans | plan schema test |
| downgrade corrupts installation | downgrade request returns no-write | version fixture |
| user-preserved path overwritten | `user-preserved` always emits `skip` | classifier fixture |
| unsafe source copy path missing | mutating operations must carry `sourcePath` | plan schema test |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| source metadata | installer source integrity data | used for class/md5/sourcePath only |
| target snapshot | target-local structural/hash data | no file contents, policy input only |
| operation plan | safety-critical internal contract | rendered before writes, consumed by U5 |
| backup path | target-local safety artifact path | planned only, not written by U4 |
| noWriteReason | user-visible diagnostic input | stable reason code for reporter |

## Controls

- `canApply:false` blocks U5 mutation.
- Every changed/unknown shared overwrite has a preceding `backup` operation.
- Confirmation-gated apply uses executable operations plus `requiresConfirmation:true`, not `conflict`.
- Non-interactive collision without `--force` is no-write.
- `--force` never fills missing harness/target and never suppresses backup.
- U4 must not recalculate target state from live filesystem.
- U4 must not render final wording that could drift from Reporter snapshots.

## Compliance Mapping

U4 does not process regulated personal data. Compliance concerns are safety evidence and traceability: every installer-owned file operation must be explainable from the pre-apply report and manifest path planning, satisfying `requirements.md` NFR-003.

## Upstream Coverage

- `business-logic-model.md`: planning workflow and output contract define trust boundaries.
- `business-rules.md`: no-write, file class, force/yes, and backup rules define security controls.
- `requirements.md`: FR-008, FR-009, FR-010, FR-011, NFR-002, NFR-003, and NFR-004 define security-relevant acceptance.
- `technology-stack.md`: Bun/TypeScript and CI baseline inform tests.
