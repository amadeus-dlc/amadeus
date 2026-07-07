# Deployment Architecture — U4 Operation Planning And Safety

> Stage: construction / infrastructure-design  
> Unit: U4 Operation Planning And Safety

## Architecture Summary

U4 has no hosted deployment. It runs inside the local `amadeus-setup` process as the operation planning boundary that converts resolved source metadata and target state into a deterministic `FileOperationPlan`.

The deployment unit is `packages/setup/` only. U4 does not require a runtime server, daemon, queue, database, target lock service, cloud account, or background worker. It must be deterministic enough for GitHub Actions to validate the same inputs with fake ports and fixtures.

## Runtime Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| `OperationPlanner` | local in-process domain module | builds install/upgrade plans; no external side effects |
| `VersionPolicy` | local pure policy module | stops equal/downgrade/installed-newer branches before file planning |
| `TargetStatePolicy` | local pure policy module | maps U3 target states to apply/no-write branches |
| `CollisionPolicy` | local pure policy module | handles `--yes`, `--force`, prompt-required, and no-write collision outcomes |
| `BackupPlanner` | local pure helper with injected predicate | builds backup paths and suffixes; no filesystem adapter |
| `PlanValidator` | local invariant check | prevents unsafe executable plans before returning |
| CI fixtures | GitHub Actions PR checks | branch fixtures, invariant tests, and benchmark checks |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | run planner unit tests and fixture benchmarks with fake source/target inputs |
| GitHub Actions PR | enforce planner branch coverage, invariant tests, typecheck, lint, and installer smoke/integration gates |
| user target machine | execute one synchronous planning pass before any report, prompt, or apply step |

There is no dev/staging/prod hosted runtime. The only production execution environment is the user's local CLI process.

## Storage And Network

U4 writes no persistent storage and uses no network. It consumes source metadata from U2 and target detection/snapshot from U3 as in-memory values supplied by the Application Service.

Backup path collision checks use only an injected `backupPathExists` predicate. The planner itself must not receive filesystem read/write adapters, create backups, copy files, write manifests, or verify target readiness.

## Deployment Failure Containment

| Failure | Deployment response |
|---|---|
| missing required harness/target | return `canApply:false` with stable no-write reason |
| unsupported or ambiguous target state | return no-write plan before file operations |
| collision without allowed overwrite path | return conflict-only no-write plan |
| changed/unknown shared file with force/confirmation | include `backup` before `force-update` / `update` |
| malformed plan candidate | reject through `PlanValidator`, never return unsafe `canApply:true` |

## Upstream Coverage

- `performance-design.md`: deployment path stays pure, bounded, and benchmarkable with source/snapshot maps.
- `security-design.md`: destructive-operation prevention and source integrity shape the local topology.
- `scalability-design.md`: no daemon/cache/shared mutable state and capacity targets define runtime scale.
- `reliability-design.md`: plan states, reason codes, ordering invariants, and portable backup paths define failure containment.
- `logical-components.md`: planner, policies, backup planner, operation builder, and validator map directly to deployment surfaces.
- `components.md`: Operation Planner is deployed under `packages/setup/` while File Applier, Reporter, Prompt Adapter, and Manifest Store remain downstream.
- `services.md`: Planning Service remains local in-process and feeds Reporter/Applier through `FileOperationPlan`.
- `business-logic-model.md`: install/upgrade workflows and backup path workflow define the deployment flow.
