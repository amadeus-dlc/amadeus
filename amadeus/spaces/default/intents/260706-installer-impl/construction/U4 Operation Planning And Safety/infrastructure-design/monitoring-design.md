# Monitoring Design — U4 Operation Planning And Safety

> Stage: construction / infrastructure-design  
> Unit: U4 Operation Planning And Safety

## Observability Scope

U4 has no hosted monitoring stack. Observability is deterministic CLI diagnostics, structured plan fields, and CI evidence. The planner must expose enough information for Reporter, tests, and future issue diagnosis without collecting telemetry from user machines.

## Runtime Diagnostics

| Signal | Producer | Consumer |
|---|---|---|
| `canApply` | `OperationPlanner` | Reporter, Prompt Adapter, File Applier |
| `noWriteReason` | policy modules / validator | Reporter and tests |
| `requiresConfirmation` / `confirmationReason` | CollisionPolicy | Prompt Adapter and tests |
| operation kind/path/sourcePath/backupPath | OperationBuilder | Reporter, File Applier, tests |
| backup suffix decisions | BackupPlanner | tests and verbose diagnostics when enabled |
| validation failure classification | PlanValidator | developer-facing error and failing tests |

Diagnostics must not include file contents, npm tokens, GitHub credentials, or absolute paths unless the user supplied the target path and the reporter already owns that display decision.

## CI Evidence

| Gate | Evidence |
|---|---|
| branch fixture tests | every target state, version branch, file class, collision branch |
| invariant tests | no unsafe `canApply:true`, no executable `conflict`, required source/backup paths |
| backup ordering tests | backup before update/force-update and one timestamp per plan |
| benchmark fixture | 2,000 files and 500 backup candidates within NFR budget |
| no dependency assertion | planner has no filesystem, network, prompt, reporter, applier, or manifest dependency |

These checks should be blocking in the installer PR gate because U4 owns destructive-operation prevention.

## Alerting Model

There is no production alerting service. Failures are surfaced synchronously:

- user-visible no-write report for safe operational failures;
- non-zero exit through Application Service when planner input is malformed or apply is blocked;
- CI failure for invariant, fixture, benchmark, typecheck, lint, dist drift, or self-install drift violations.

## Dashboards

No dashboard is required. Maintainer-facing visibility comes from GitHub Actions check summaries and test output. If a future dashboard is introduced, it must aggregate CI evidence only and must not require runtime telemetry from installer users.

## Incident Response

Planner incidents should be triaged from:

- failing fixture or invariant test name;
- `FileOperationPlan` snapshot fixture;
- reason code and operation list;
- source metadata and target snapshot fixture;
- GitHub Actions logs.

Runtime rollback is not designed in U4. If a plan is unsafe, U4 must return no-write before U5 runs.

## Upstream Coverage

- `performance-design.md`: benchmark evidence covers pure planning budgets.
- `security-design.md`: diagnostics preserve destructive-operation prevention and avoid content leakage.
- `scalability-design.md`: fixture dimensions track file count, backup count, target states, and file classes.
- `reliability-design.md`: reason codes, ordering invariants, and plan states become observable signals.
- `logical-components.md`: PlanValidator and BackupPlanner diagnostics map to component responsibilities.
- `components.md`: Reporter and Prompt Adapter consume plan fields without recalculating policy.
- `services.md`: GitHub Actions PR gates are the monitoring substrate for installer safety.
- `business-logic-model.md`: output contract and backup workflow define the diagnostic surface.
