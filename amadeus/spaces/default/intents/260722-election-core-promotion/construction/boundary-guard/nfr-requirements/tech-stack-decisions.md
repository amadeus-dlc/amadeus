# Tech Stack Decisions — boundary-guard

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## 技術スタック決定

- 新規依存ゼロ: Bun+TypeScript+既存テストランナー(technology-stack の現行スタック表の枠内)。新規ツール・ライブラリの導入なし(requirements NFR 群と Bun-only Forbidden に整合)

## 決定事項

- テスト配置: 判定 = tests/unit(純関数)、FS 走査 = tests/integration(fs-tests-integration-first — business-logic-model の層分割の再確認)。business-rules の検証割付(BR-1/2/3 = unit、BR-5/6 = integration)と1:1 対応
- 採番: 新規テスト番号は実装時に最新帯を確認して予約(swarm-test-number-reservation)
