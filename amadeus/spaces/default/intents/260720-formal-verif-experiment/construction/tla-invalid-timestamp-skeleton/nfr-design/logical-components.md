# Logical Components — tla-invalid-timestamp-skeleton

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。専用integration skeletonだけを所有し、final root、Arm S、fan-out、promotion、eligibilityを所有しない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `SkeletonCoordinator` | exactly-2 local/CI lifecycleとstop | U1 dispatcher、deadlines |
| `CompositionPolicy` | baseline→Arm T→#1252 overlay | U2 grant、Git port |
| `CompositionStore` | CompositionHead commit/recovery/RETIRED lifecycle | isolated worktree |
| `SkeletonReservationStore` | physical capacityとlifecycle | filesystem、liveness |
| `LocalAttemptRunner` | U4 over U3 evidence実行 | U3/U4 public ports |
| `CiRunTracker` | bounded poll/same-run retries | provider metadata port |
| `CiArtifactVerifier` | trust root、archive、2-row bijection | streaming archive port |
| `SkeletonOutcomeStore` | pass/fail transactionとStopReceipt | U1 ledger |

## Dependency direction

Coordinatorは専用SkeletonCommandだけを使い、U8 rootへimportされない。CI verifierはlocal successを代用せず、OutcomeStoreはdeterministic failureだけをdomain eventにする。U3/U4の未再review履歴を保持しintegration readinessを先取りしない。

## Test seams

Git/grant/process/evidence/CI/filesystem/clockをport化し、composition、exact attempts、archive、transaction lookup、failure stopをtemporary repositoriesで検証する。
