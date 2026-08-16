# Business Rules — unit d6-investigation

- R-1(FR-13): 調査は実測のみ — 修正・是正コードを書かない(発見欠陥は Issue 起票で分離、クロスレビュー 2 名成立まで実装バッチへ入れない)
- R-2: 一次記録は record(investigation-report.md)。件数・再現は取得コマンド併記(numbers-from-command-output-only)
- R-3: 帰属切り分けは同一条件ベース比較(c1-ablation 準拠)— 空振りが新実装(U5)で消えるかは本 unit の対象外(U5 の受け入れで扱う)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T18:01:25Z
- **Iteration:** 1
- **Scope decision:** none

d6-investigation は FR-13/ADR-11 どおり調査専用(修正コード不可・欠陥は別Issue分離)に閉じ、U5受け入れ範囲との重複も明示的に除外。(fd-rev-d verdict の kind-aware primary への再永続化 — 内容は当該レビュー時点から無変更)

### Findings

- None
