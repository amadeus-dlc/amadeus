# Logical Components — convergence-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Component Inventory

| Component | Responsibility |
|---|---|
| Budget Policy Resolver | default／hard cap／snapshot validation |
| Budget Coordinator | atomic reserveとreceipt |
| Budget Index | canonical foldとO(1) lookup |
| Retry Classifier V1 | 4-field exact match |
| Retry Scheduler Port | bounded backoff |
| Termination Factory | shared reason payload |
| Stop／Swarm Adapters | existing surface fact mappingのみ |

## Isolation

Stop／Swarm→Budget Coordinator→Policy／Classifier→Audit Repositoryとし、adapterはcounterを所有しない。scheduler failureとrenderer failureはcanonical mutationから隔離する。
