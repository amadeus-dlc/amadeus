# Shared Infrastructure — U4 Operation Planning And Safety

> Stage: construction / infrastructure-design  
> Unit: U4 Operation Planning And Safety

## Shared Resource Summary

U4 creates no shared cloud infrastructure. The shared surface is the in-process `FileOperationPlan` contract and the CI fixture library used by downstream units.

## Shared Contracts

| Contract | Shared with | Ownership |
|---|---|---|
| `FileOperationPlan` | Reporter, Prompt Adapter, File Applier, Manifest Store sequencing | U4 owns schema and invariants |
| operation kinds | Reporter and U5 Applier | U4 owns policy; consumers render/apply |
| stable reason codes | Reporter, tests, future docs | U4 owns code set for planning failures |
| backup path format | U5 Backup Writer and user diagnostics | U4 owns path decision; U5 writes |
| fixture dimensions | U6/U7 quality gates | U4 defines branches; U6/U7 execute checks |

## Access Boundaries

Downstream consumers may read the plan but must not mutate it or recalculate planner policy. U5 may apply only executable operations. Reporter may render no-write and confirmation information. Prompt Adapter may ask for confirmation when `requiresConfirmation:true`, but it does not change operation ordering.

## Shared State

There is no process-wide shared state. The only persistent target state remains the installer manifest owned by Application Service/Manifest Store after U5 apply succeeds. U4 uses a per-call timestamp and local suffix counters only.

## Cross-Unit Dependencies

| Unit | Dependency on U4 |
|---|---|
| U5 File Application And Verification | applies `FileOperationPlan` without policy recalculation and writes backups/manifests downstream |
| U6 Test Coverage And Quality Gates | implements planner branch fixtures, invariant tests, and benchmark checks |
| U7 CI And Release Automation | makes installer planner checks blocking in PR CI |
| U8 Documentation And Operator Guidance | documents install/upgrade no-write reasons, confirmation behavior, and force/backup semantics |

## Non-Shared Infrastructure

U4 does not share databases, caches, queues, networks, load balancers, IAM roles, secrets, or hosted service discovery. Introducing any of those for planning would violate the local CLI and pure planner constraints.

## Upstream Coverage

- `performance-design.md`: shared contract remains in-memory and benchmarkable.
- `security-design.md`: plan traceability and destructive-operation prevention define shared access boundaries.
- `scalability-design.md`: no shared mutable state preserves parallel invocation behavior.
- `reliability-design.md`: shared reason codes and ordering invariants define downstream obligations.
- `logical-components.md`: OperationBuilder and PlanValidator define the shared contract.
- `components.md`: Reporter, Prompt Adapter, File Applier, Manifest Store, and Verifier consume but do not own U4 policy.
- `services.md`: Planning Service and GitHub Actions PR gates are the shared infrastructure surfaces.
- `business-logic-model.md`: output contract, integration boundaries, and backup path workflow define cross-unit dependencies.
