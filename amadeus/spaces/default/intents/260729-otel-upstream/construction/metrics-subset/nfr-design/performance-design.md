# Performance Design — U9: metrics-subset

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（計測オーバーヘッド・同期 append 回帰なし・即時観測可能性）を実現する設計。

## 計測経路の設計

- Counter の `add()`／Histogram の `record()` は、active Context からの IDs 参照取得＋集計値の更新＋exporter への同期受け渡しのみ。ID 生成・timer・キューを計測経路に入れない（business-logic-model.md § 計測と Trace Context 相関）
- Metric Store への出力は現行 telemetry buffer（lockless O_APPEND 1 行書込）同等の 1 回の同期 append とし、batch timer・network flush を持たない（FR-EXP-5、NFR-2）
- 計測経路は同期・短命 process 前提に閉じ、非同期 flush の持込を禁止する（FR-EXP-6）

## 即時観測可能性の設計

- 計測完了時に同一 process 内で Metric Store から当該 record を即時読取可能とする（FR-JRN-3 相当）。export 直後の read 検証テストで固定

## 計測設計

- Provider 有無での代表 CLI 実行時間比較（U1 の起動オーバーヘッド計測と同一手法）で計測呼出しのオーバーヘッドを評価する
- cold/warm の p50/p95 を skeleton 計測面で現行 buffer 書込と比較する。数値予算は Phase 1 ADR で確定（NFR-1・Q2-A）、予算超過は hard gate 不合格条件
- hot path で retry・queue を導入しない（BR-3/BR-7）。失敗時は record を捨てて後続計測を継続するため、失敗経路の追加コストは定数時間

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:27Z
- **Iteration:** 1
- **Scope decision:** none

READY: all targets covered; registerMeterProvider/getAmadeusMeter resolve; concrete mechanisms; no contradictions.

### Findings

- None
