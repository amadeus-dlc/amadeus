# Logical Components — bounded-unit-pool

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Component Inventory

| Component | Responsibility |
|---|---|
| Unit Plan Validator | DAG／Kahn stable order |
| Pool Policy Resolver | active／attempt／reconciliation caps |
| Unit Pool Scheduler | FIFO acquire |
| Pool Transition Coordinator | canonical IDsとatomic commit |
| Reconciliation Controller | bounded native probes |
| Driver Capability Port | dispatch／cancel facts |
| Pool Projector | queue／active／terminal／max active |

## Blast Radius

local Unit failureはdependent subtreeだけ、systemic failureはbatchをdraining、OTel failureは観測だけに隔離する。driverはschedulerやcounterを所有しない。
