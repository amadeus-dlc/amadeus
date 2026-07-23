# Logical Components — clean-env-e2e

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 論理コンポーネント

| コンポーネント | 実装位置 | 由来 |
|---|---|---|
| CleanEnv 合成/破棄ヘルパー | tests/e2e/ の新設 serial テストファイル内 | business-logic-model のクリーン環境合成 |
| fake herdr / fake agmsg shim | **beforeEach で CleanEnv 一式(binDir の shim 含む)とともに再生成**(afterEach 全削除との対) | business-logic-model の fake seam(t-team-msg 様式) |
| ケーステーブル(5ケース) | 同テスト内の単一データ構造 | scalability-requirements のテーブル駆動 |
| 隔離 assert 群 | 同テスト冒頭 | security-requirements の隔離の完全性 |
| DA 到達確認 | lcov 実測(実装受け入れ手順) | reliability-requirements / FR-6c |

## 配置根拠

- 全て tests/e2e/ 側 — 本番コード変更ゼロ(tech-stack-decisions / performance-requirements の予算内方針と対)。新規テスト番号は実装時予約
