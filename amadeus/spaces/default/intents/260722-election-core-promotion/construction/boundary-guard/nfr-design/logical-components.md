# Logical Components — boundary-guard

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 論理コンポーネント

| コンポーネント | 実装位置 | 由来 |
|---|---|---|
| scanDistributionTreeForScriptsRefs(述語1・純関数) | tests/unit の新設テストファイル内 export | business-logic-model 述語1 |
| findDuplicatedAssets(述語2・純関数) | 同上 | business-logic-model 述語2 |
| AllowRule+parse コンパニオン | 同上(型+スマートコンストラクタ) | security-requirements / FD ドメイン型 |
| SCAN_ROOTS canonical 定数 | 同上の単一 export | scalability-requirements の roots 設計 |
| FS 走査+live assert | tests/integration の新設テスト | reliability-requirements の検証設計 |
| fixture(落ちる実証) | tests/fixtures/ | performance-requirements の予算内検証と両立する固定入力 |

## 配置根拠

- 全て tests/ 側 — 本番コード(packages/framework)への追加ゼロ(tech-stack-decisions の新規依存ゼロと対)
