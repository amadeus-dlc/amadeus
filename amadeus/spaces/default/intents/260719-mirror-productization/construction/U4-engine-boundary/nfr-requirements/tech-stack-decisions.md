# Tech Stack Decisions — U4-engine-boundary

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## TS-U4-1: 追加依存ゼロ

amadeus-orchestrate.ts への内部分岐+U3 モジュール import のみ(technology-stack.md の構成不変)。新規 npm 依存なし。

## TS-U4-2: テスト配置

integration 層に境界×象限の全数 fixture(実 FS record — fs-tests-integration-first)、unit 層に MirrorBoundaryDecision 純関数。既存 next 消費テストの green 維持を同一 PR で検証。
