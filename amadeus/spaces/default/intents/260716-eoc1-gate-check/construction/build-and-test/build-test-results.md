# Build & Test Results — eoc1-gate-check

## 実行環境

bolt worktree(bolt/260716-eoc1-gate-check @ **deee44887** — e1 REVISE の enforcement cutoff 是正込み)、2026-07-16T16:55Z の fresh 実行。検証対象は `../eoc1-gate-guard/code-generation/code-generation-plan.md` の目録と `code-summary.md` の AC 表。

## 実測結果

| コマンド | 結果 | exit |
|---------|------|------|
| typecheck / lint | PASS | 0 / 0 |
| dist:check / promote:self:check | PASS(8コピー同期) | 0 / 0 |
| complexity-gate --check | PASS(新規違反0) | 0 |
| t-eoc1-gate-evidence(16 — cutoff テスト込み) | 16 pass / 0 fail | 0 |
| smoke | RESULT: PASS | 0 |

## 落ちる実証

変異注入3種(conductor: state 分岐無効化 / reviewer: 同+lib 反転)→ 赤転 → 復元 green(CG 記録参照)。

## ミラー整合

本線ミラー(1d5b6f4a7)は bolt 全20ファイル(cursor ツリー除く)と md5 全数一致。マーカー grep の 1 hit は registry テストの正当な fixture 文字列(conflict-garbage テスト)と確認。

## corpus sweep(e1 完成条件)

86 questions 中 pre-guard 68 skip / enforced 18 / **fail 0**(cutoff 適用後 — 旧様式の偽ブロックなし)。

## CI / dogfooding

PR #1106 CI 進行中(e1 レビュー+auto マージ運用)。dogfooding: CG(16:37:20Z)と B&T(**16:48:33Z — 監査 STAGE_AWAITING_APPROVAL 実 emit**)の gate-start 2回が新ガードを通過(0問様式分岐 — reviewer REVISE の先取り記入指摘を受け、B&T gate-start 実行後に確定記載へ是正)。
