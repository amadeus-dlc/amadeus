# Business Logic Model — unit d6-investigation

- 入力: RFC 付録 B の空振り実測(phase-gate 重複発火・無応答承認)+ 現行ゲート提示/承認経路のコード
- 処理: (1) 重複発火の発生点(同一ゲートの再 ask 経路)を実測特定 (2) 「人間が答えないまま承認が通る」経路の帰属(別経路承認の正体 — 再実行時の状態、grant、または欠陥)を切り分け (3) 判定: 欠陥(Issue 起票・クロスレビューへ)/ 仕様どおり(根拠記録)
- 出力: `<record>/construction/d6-investigation/investigation-report.md`(機序・file:line・再現手順・判定)
- エラー経路: 再現不能の場合は「再現条件不足」として観測ログの追加取得条件を記録(推測起票しない — P2)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:28:57Z
- **Iteration:** 1
- **Scope decision:** none

d6-investigation は FR-13/ADR-11 どおり調査専用(修正コード不可・欠陥は別Issue分離)に閉じ、U5受け入れ範囲との重複も明示的に除外。

### Findings

- None
