# Shared Infrastructure — U5 Apply Verify And UX

> Stage: construction / infrastructure-design  
> Unit: U5 Apply Verify And UX

## Shared Resource Summary

U5 creates no shared cloud infrastructure. The shared surfaces are local contracts and CI fixtures: `FileOperationPlan`, `ApplyResult`, `VerificationResult`, manifest path/schema use, reporter snapshots, and fake-port call traces.

## Shared Contracts

| Contract | Shared with | Ownership |
|---|---|---|
| `FileOperationPlan` | U4 planner, Reporter, FileApplier | U4 owns policy; U5 consumes |
| `ApplyResult` | ResultClassifier, Reporter, tests | U5 owns apply evidence |
| `VerificationResult` | ResultClassifier, Reporter, tests | U5 owns readiness evidence |
| installer manifest path | U3 detector, U5 ManifestStore, future upgrade | Application Service/ManifestStore writes after apply |
| reporter snapshots | U6/U7 quality gates and docs | U5 owns output shape |
| fake-port call traces | U6/U7 tests | U5 owns mutation-order evidence |
| root validation scripts | U7 CI and release workflow | must include `packages/setup/**/*.ts` in typecheck/lint |

## Access Boundaries

U4 may define whether a plan is executable. U5 may apply only that plan. U5 may not mutate a no-write plan into an executable one, reorder operations for policy reasons, or recalculate file class/version/target-state decisions.

Reporter and ResultClassifier may consume operation summaries and diagnostics. They must not inspect target filesystem state to supplement missing policy data.

## Shared State

The installer manifest is the only persistent installer-owned state written by U5. Backups are target-local artifacts created only when the approved plan contains `backup` operations. Process-wide cache, daemon state, target locks, databases, and queues are not shared infrastructure.

## Cross-Unit Dependencies

| Unit | Dependency on U5 |
|---|---|
| U6 Test Coverage And Quality Gates | implements temp-dir, fault injection, reporter snapshot, and call-order tests |
| U7 CI And Release Automation | makes U5 mutation-boundary tests blocking in PR CI |
| U8 Documentation And Operator Guidance | documents no-write guarantees, backup paths, manifest-write-failed, verification failures, and next steps |

## Non-Shared Infrastructure

U5 does not share cloud accounts, IAM roles, secrets, queues, caches, databases, load balancers, or service discovery. It also does not share runtime telemetry infrastructure.

## Upstream Coverage

- `performance-design.md`: shared contracts stay bounded to local render/apply/manifest/verify data.
- `security-design.md`: no-write and no-policy-recalculation boundaries define shared access rules.
- `scalability-design.md`: no shared mutable state preserves single invocation behavior.
- `reliability-design.md`: shared result contracts encode outcome states and diagnostics.
- `logical-components.md`: ResultClassifier, ApplyResult, VerificationResult, Reporter, and fake ports define shared evidence.
- `components.md`: File Applier, Manifest Store, Verifier, Reporter, Prompt Adapter, and Application Service ownership remains separated.
- `services.md`: manifest lifecycle and GitHub Actions PR gates are the shared infrastructure surfaces.
- `business-logic-model.md`: integration boundaries and error handling define cross-unit dependencies.
