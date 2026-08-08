# Business Rules — u5-measurement-report

上流入力(consumes 全数): requirements.md(FR-4 の規則化)、components.md(N/A 注記の継承)、component-methods.md(コード変更なし確認)、unit-of-work.md(境界)、unit-of-work-story-map.md(物語保証)、services.md(読取のみ)。

## 規則

- **BR-U5-1(述語)**: 計測は `INTENT_AUTONOMY_TRANSACTION_COMMITTED` / `INTENT_AUTONOMY_HUMAN_REQUIRED` / `QUESTION_ANSWERED.Resolution Route` のみで行い、legacy `AUTONOMY_MODE_SET` を新規計測に使わない
- **BR-U5-2(ベースライン)**: 比較対象は C1・C3(第三者再現可能)のみ。C2 は引用しない
- **BR-U5-3(計測 ref)**: すべての数値に clone/SHA/述語/測定時刻を併記。数値はコマンド出力からの転記のみ(numbers-from-command-output-only)。派生値は算出式併記(derived-value-shows-formula)
- **BR-U5-4(スキーマ正規化)**: 集計は `(.attributes.Event // .event)` 正規化を必須とし、スクリプト全文をレポートへ逐語掲載
- **BR-U5-5(依存確認)**: u1・u2・u3 の着地(新イベント・属性の実在)を計測前に grep で確認してから実行 — 未着地面の計測は「PENDING(閉包条件併記)」として分離し PASS と代用しない(deployment-execution:c3 の分類規律)
- **BR-U5-6(repo 外実行)**: スクリプトは repo 外 scratch で実行し、audit/record を汚染しない(scratch-script-discipline)

## 受け入れ基準への写像

| BR | FR | 検証形 |
|---|---|---|
| BR-U5-1/2/3/4 | FR-4a/4b/4c | レポート実体の reviewer 実読+スクリプト再実行可能性 |
| BR-U5-5 | FR-4c(適用後) | 着地 grep の記録 |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:53:10Z
- **Iteration:** 1
- **Scope decision:** none

FR-4a〜4c の述語・ベースライン・計測ref・PENDING 分離・スキーマ正規化・scratch 規律をすべて確認。指摘なし

### Findings

- None
