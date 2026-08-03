# Logical Components — execution-observability-baseline

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Component Inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| Execution Contract | typed identity、Fact、measurement、termination | pure validation |
| Lifecycle Coordinator | single-writer、reserve／claim／confirm／finish | per-intent mutation |
| Audit Repository | canonical JSONL batch commit | durable write |
| Projection Coordinator | state/runtime barrier、rebuild receipt | derived state |
| Harness Capability Port | native origin／effect fact | harness adapter |
| OTel Adapter | best-effort telemetry | non-blocking sink |
| Baseline Runner／Projector | fixed workloadとmanifest | evidence only |

## Dependency Direction

Engine→Lifecycle Coordinator→Execution Contract／Audit Repository。Coordinator→Projection Coordinator→state/runtime、Coordinator→Harness Port、event→OTel／Baseline projectorとする。projection、adapter、benchmarkからcanonical mutationへ逆依存しない。
