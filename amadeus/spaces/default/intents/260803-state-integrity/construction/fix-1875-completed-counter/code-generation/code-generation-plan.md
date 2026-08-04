# Code Generation Plan — Bolt B

## 目的

Issue #1875 の `Completed` を EXECUTE 実効ステージの完了数（定義 E）へ統一し、すべての更新経路と approve 検証器を共有 writer `rebuildDerivedPlanFields` の算出結果へ揃える。

## 実装方針

1. 公開 seam に、SKIP 実効行が `[x]` でも `Completed` に含めないことを示す狭い回帰テストを追加し、現行実装で Red を実測する。
2. `checkbox`、`advance`、`finalize`、`complete-workflow`、`approve`、stage jump、scope change、初期化 seed の各書き手を `rebuildDerivedPlanFields` 経由へ集約する。
3. approve の commit 検証を、共有 writer で再構築した正準値との比較へ変更し、書き込み側と独立した検証として機能させる。
4. 生の `[x]` 数を契約としていた既存 E2E テスト 3 本を、EXECUTE 実効行だけを数える契約へ改訂する。
5. stage protocol の `Completed` 説明を定義 E と実際の全更新経路に合わせる。
6. targeted test で Green を実測し、最後に `bun run build` を実行する。build 成功後は追加のローカルテストを実行しない。

## 成功条件

- SKIP 実効の `[x]` 行を含む state でも、対象経路の `Completed` と `completed_count` が EXECUTE 実効完了数で一致する。
- `setField(..., "Completed", ...)` の実行時 writer は `rebuildDerivedPlanFields` の 1 箇所へ集約される（テンプレート初期値を除く）。
- approve 検証器が共有 writer の正準値と state フィールドを比較する。
- 既存 3 テストと stage protocol が定義 E を明示する。
- targeted test が Green、`bun run build` が成功する。

## 非対象

- Bolt A の監査ロック変更。
- `resyncOneIntent` の Stage Progress 節外 checkbox 走査問題。
- 生成された `dist/` および self-install 配布面のコミット対象化。
