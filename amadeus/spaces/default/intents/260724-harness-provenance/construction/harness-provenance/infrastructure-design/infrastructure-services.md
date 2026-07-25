# Infrastructure Services — harness-provenance

上流入力(consumes 全数): performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, components.md, services.md, business-logic-model.md

## Service mapping

services.mdは独立serviceをN/Aとし、components.mdとlogical-components.mdは既存2module内の同期責務を定義する。business-logic-model.mdもenv・固定mapping・filesystem probeだけを使う。performance-design.md、security-design.md、scalability-design.md、reliability-design.mdを満たす新規infrastructure serviceはない。

## Inventory

| Category | Selection |
|---|---|
| Compute | existing local Bun runtime |
| Storage | existing Markdown state/repository |
| Database/cache/queue/search | N/A |
| Load balancer/CDN/DNS/service discovery | N/A |
| Secrets manager | N/A。credentialを新規処理しない |
| External API | N/A |

## Boundaries

`process.env`は既存process入力でありshared infrastructureではない。non-env resolution cacheはmodule-local 1件で、外部cache serviceへ昇格させない。全配布面はmanifest packagerが所有する。
