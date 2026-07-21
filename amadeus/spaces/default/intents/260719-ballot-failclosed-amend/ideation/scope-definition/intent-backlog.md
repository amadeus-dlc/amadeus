# Intent Backlog — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## バックログ(優先順)

依存関係: B-1 は独立。B-2 は B-3 の裁定に依存(M-4 = C-4 の設計選挙前提)。risk-first(scope-definition:c3)により、裁定依存の B-2/B-3 を先に確定させる設計ステージ順とする。

| # | アイテム | 対応 Must | 依存 | 概要 |
| --- | --- | --- | --- | --- |
| B-1 | submittedAt 二段検証(`invalid-timestamp` 分類追加+落ちる実証+後方互換 sweep) | M-1/M-2 | なし | `Ballot.parse` の 5→6 分類化。`scripts/amadeus-election-model.ts:184-204` が挿入点 |
| B-2 | amend 提出経路(parse の kind 対応+`ref` 検証+vote verb 疎通) | M-3 | B-3 裁定 | `AmendBallot` 生成経路の新設。store 共存受理(実装済み)への配線 |
| B-3 | amend tally 解決規則の選挙裁定+実装+閉包テスト | M-4 | 設計選挙 | tally(`model.ts:321-338`)の per-voter 解決。裁定は design 段で leader へ選挙依頼 |
| B-4 | 検証統合(typecheck / lint / --ci green、deslop、lcov 実測) | M-5 | B-1〜B-3 | PR 発行前の締め工程 |

## 除外バックログ(Won't 対応 — 起票・参照のみ)

- W-2/W-3 系(GoaLineCode 拡張・スパース parse)は e1 の #1226 intent が Issue 起票済み/予定 — 本 intent では起票も実装もしない(二重起票回避)。
- 境界疑義から新規発見が出た場合のみ Issue-first で起票し leader へ報告する。
