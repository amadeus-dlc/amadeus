# Logical Components — team-launcher-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 論理コンポーネント

| コンポーネント | 実装位置 | 由来 |
|---|---|---|
| require_prerequisites()(bash 関数) | packages/framework/core/tools/team-up.sh 冒頭 | business-logic-model / reliability-requirements のフェイルファスト |
| detectTeamPrerequisites(純関数 seam) | packages/framework/core/tools/amadeus-utility.ts(doctor 節)へ export 追加 | business-logic-model / security-requirements の PathProbe 注入 |
| PrereqTool / PrereqStatus / PathProbe 型 | 同上(amadeus-utility.ts 内) | FD ドメイン型 |
| BR-7 整合テスト | tests/unit(新設 — 番号は実装時予約) | tech-stack-decisions の決定 |
| prerequisite 検査 integration テスト | tests/integration(fake PATH) | reliability-requirements の検証設計 |
| 移動3ファイル | packages/framework/core/tools/(git mv) | scalability-requirements の搬送のみ方針 |

## 配置根拠

- 本番コードへの追加は require_prerequisites(bash ~40行)と doctor 節(~30-60行)のみ — performance-requirements の定数回性質を実装位置でも保証(検査ロジックの分散なし)

## consumes 外参照の直読照合(レビュー Major2 対応)

- nfr-requirements/tech-stack-decisions が言及する「BR-7 割付節の FD 側同期是正」の所在は U3 FD **business-rules.md**(本ステージ consumes 宣言外)— conductor 正本直読 2026-07-23 で実在確認: 割付節 verbatim「**BR-7 は機械整合テスト(集合一致 assert)+docs ガード**(※iter1 レビュー Minor2 の是正で…同期是正 — review-fix-propagation 類型の申告)」。BR-7 整合テスト(本ファイルの論理コンポーネント表)はこの是正済み割付に基づく
