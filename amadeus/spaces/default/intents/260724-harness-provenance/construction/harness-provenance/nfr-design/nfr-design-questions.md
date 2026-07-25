# NFR Design Questions — harness-provenance

上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

## Q1. NFR patternの適用方針は?

[Answer]: A — ローカル同期libraryに外部service向けpatternを導入せず、固定分岐・process cache・union parse・unknown degradation・既存test/drift guardで実現する（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. circuit breaker/retry/queue/外部cache/auto-scaleは非該当。既存2moduleとtest/distribution boundaryに閉じる（推奨）
- B. 将来を見越してresilience frameworkを導入
- X. Other

## Q2. 論理componentを増やすか?

[Answer]: A — 新規module/serviceを作らず、Detector内部resolver、Detector、Recorder、Verification fixturesの論理責務だけを既存file内で明示する（ユーザー指示: コード生成まで推奨、2026-07-25）

- A. 既存module内の論理責務として設計（推奨）
- B. 独立harness-provenance moduleを新設
- X. Other
