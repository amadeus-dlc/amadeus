# Performance Requirements — U3: journal-v2

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

本 Unit は filesystem に触れない純粋 codec 層（serialize／parse／merge／converter／View）。I/O コストは呼出し側（U4・U6）の責務であり、ここでは codec 計算量と v1 との性能同等性だけを扱う。

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| serialize／parse レイテンシ | 現行 v1 codec（`serialize`／`parse` 1行処理）を上回る回帰なし（NFR-1 準拠、比較基準）。数値予算は Phase 1 実測後に ADR で確定 | 同一 record 集合の v1/v2 codec ベンチ（p50/p95）を比較 |
| キー順固定 serialize | 同一 record の2回 serialize が byte 同一（BR-2 の wire 不変条件）。実行時コストは v1 codec と同一次のキーソート＋ `JSON.stringify` 1 回に限定 | round-trip property test＋ベンチ |
| merge 計算量 | shard 総行数 N に対し O(N log N)（dedup は idempotency key の Map 参照 O(N)、順序付けは timestamp＋key tie-break の 1 回ソート）。shard 数・投入順に依らず同じ計算量 | property test で shard 投入順をシャッフルし結果同値を確認（BR-6） |
| reader decode | 行単位の `parseJournalLine` 分岐（schemaVersion 読取）が v1-only shard で v1 現行 reader と同等のスループット。v2 分岐追加で v1 経路を劣化させない | v1 実 fixture 全行 decode の回帰テスト＋ベンチ |

## 制約

- codec 層は同期・純粋関数に留め、timer・バッファリング・I/O を持ち込まない（NFR-2、services.md の通信契約どおり I/O は呼出し側）
- merge・View は入力 record 列をメモリ上で1回走査して処理する。record 数に比例しない定数倍以上の複製・再帰走査を禁止
- 計測結果は Phase 1 ADR の入力とし、v1 比の有意な回帰は不合格条件とする

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: coverage/quantification/structure verified; no findings.

### Findings

- None
