# Infrastructure Design Questions — harness-provenance

上流入力(consumes 全数): performance-design.md, security-design.md, scalability-design.md, reliability-design.md, logical-components.md, components.md, services.md, business-logic-model.md

## Q1. Deployment/infrastructure方針は?

[Answer]: A — 新規compute/network/storage/cloud resourceを作らず、既存local Bun CLI、GitHub Actions、manifest package/promote配布面だけを利用する（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. Infrastructureなし。既存CI/distributionをdeployment boundaryとする（推奨）
- B. 将来用cloud monitoring基盤を追加
- X. Other

## Q2. Monitoringとrollbackは?

[Answer]: A — state Harnessを一次観測、memoryを補助観測とし外部monitoringは追加しない。rollbackはcode revert+package/promote再生成+drift checkとする（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. 既存repo/CI運用を使用（推奨）
- B. dashboard/alertingを新設
- X. Other
