# External Dependency Map — 260801-tla-multi-model

上流入力(consumes 全数): `bolt-plan.md`、`risk-and-sequencing-rationale.md`

## 外部依存

| 依存 | 種別 | 状態 | 影響 |
|---|---|---|---|
| docker + tla2tools.jar(CI runner) | 実行基盤 | 既存導入済み(formal-model-check ジョブで実績) | u5 の前提。新規導入なし |
| u7 実測値(208628 states / 89099 distinct / depth 18) | 基準データ | intent 260731-formal-verif-value-chain の e2e-evidence に記録 | u5 AC2 の基準 |
| GitHub Actions workflow_dispatch | 運用 | 既存(ci.yml:511) | u5 の実行方式。トリガ変更なし(C2) |
| npm 依存の追加 | なし | NFR-4 | 新規外部依存ゼロ |

## ブロッカー

なし(全依存が既存・手元で充足)。
