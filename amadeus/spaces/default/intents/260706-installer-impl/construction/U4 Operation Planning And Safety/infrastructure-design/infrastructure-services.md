# Infrastructure Services — U4 Operation Planning And Safety

> Stage: construction / infrastructure-design  
> Unit: U4 Operation Planning And Safety

## Service Inventory

U4 introduces no managed service. It uses local service boundaries inside the setup package:

| Boundary | Role | External access |
|---|---|---|
| Planning Service | builds `FileOperationPlan` from command, version, source metadata, target detection, and snapshot | none |
| Backup Path Predicate | reports whether a proposed backup path already exists | injected predicate only |
| Clock Port | supplies one operation timestamp per plan | injected value/call from Application Service |
| Plan Validator | enforces executable/no-write invariants | none |
| fake source/target fixtures | CI branch coverage and invariant evidence | test only |

## Non-Service Decisions

The following are deliberately not infrastructure services for U4:

- database or manifest persistence;
- queue or background worker;
- filesystem watcher or target lock daemon;
- hosted metrics, tracing, or log collection;
- rollback service;
- release or npm publication service;
- GitHub tag/archive network access.

Those concerns are either upstream U2/U3, downstream U5/U8, or CI/release pipeline responsibilities.

## Port Contracts

| Port / value | Owner | Contract |
|---|---|---|
| `SetupCommand` | U1/Application Service | command, harness, target, version, `--yes`, `--force` |
| `ResolvedVersion` | U2 | source version/tag decision |
| `DistributionFile[]` | U2 | normalized path, class, required flag, source md5 |
| `TargetDetection` | U3 | manifest/manual/partial/none/unsupported/ambiguous target state |
| `TargetSnapshot` | U3 | expected file existence and md5 where available |
| `operationTimestamp` | Application Service | one UTC basic timestamp for every backup in the plan |
| `backupPathExists(path)` | Application Service adapter boundary | deterministic predicate used only by BackupPlanner |

## Failure Behavior

| Failure | Service result |
|---|---|
| command validation missing required values | no-write plan with `missing-harness` or `missing-target` |
| target state cannot be safely upgraded | no-write plan with target-state reason |
| version branch does not require file changes | no-write plan with version reason |
| collision cannot be applied safely | `canApply:false` with explanatory `conflict` operations |
| confirmation is required | executable plan with `requiresConfirmation:true` and `confirmationReason` |
| forced overwrite is allowed | executable plan with backup-before-`force-update` where required |
| backup path suffix collision | deterministic `.1`, `.2` suffix search through predicate |

## Service Ownership Boundaries

Reporter and Prompt Adapter may render or confirm the plan, but they do not recalculate policy. File Applier may apply only the returned plan, and Manifest Store is called only after apply succeeds. This prevents report/apply drift and keeps destructive-operation policy in one unit.

## Upstream Coverage

- `performance-design.md`: services avoid filesystem/network/prompt calls in the hot path.
- `security-design.md`: service contracts preserve no-write reasons, confirmation reasons, source paths, and backup requirements.
- `scalability-design.md`: stateless local services support parallel invocations without shared mutable state.
- `reliability-design.md`: failure behavior maps to stable reason codes and ordering invariants.
- `logical-components.md`: service boundaries represent OperationPlanner, policies, BackupPlanner, and PlanValidator.
- `components.md`: Operation Planner, Backup Planner/Writer, File Applier, Reporter, Prompt Adapter, and Manifest Store ownership is separated.
- `services.md`: Planning Service is the in-process producer for Reporter and Applier.
- `business-logic-model.md`: planning inputs, workflows, and output contract define all service inputs/outputs.
