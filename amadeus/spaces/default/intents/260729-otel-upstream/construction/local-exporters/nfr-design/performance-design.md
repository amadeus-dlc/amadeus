# Performance Design — U4: local-exporters

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（sync append 回帰なし・即時観測可能性・dispatch 追加コスト・redaction 性能予算）を business-logic-model.md の dispatch シーケンス上で実現する設計。

## dispatch 経路の設計

- Logger Provider → AuditLogExporter の dispatch は同期関数呼出しで即時実行し、Span 終了・batch timer・flush を待たない（FR-EVT-2、BR-3）。Promise 化・イベントループ経由の遅延を置かない
- AuditLogExporter の append は lock 取得（mkdir lock）→ sequence 採番 → U3 v2 codec encode → 同期 append → idempotency 記録の一直線で、現行 `appendAuditEntry` と同構造を維持する（BR-1/BR-2）

## redaction の性能設計

- write-time 層（emit 時）と export 境界層（append 直前）の redaction はともに O(属性数 × パターン数) の線形走査に留め、パターン（正規表現）のコンパイルは起動時 1 回に限定する（performance-requirements.md § redaction の性能予算）
- 層の省略による性能稼ぎを禁止し（BR-9 は譲渡不可）、予算超過時はパターン集合の見直しで対処する
- telemetry 系（Span/Log/Metric）の append 失敗はリトライ・待機なしの即時 return（fail-open、BR-5）

## 計測設計

- U1 の計測基盤で本番 Exporter の p50/p95 を cold/warm で再計測し、Registry 検証＋redaction 適用込みの emit 1 回あたり end-to-end が Phase 1 ADR 予算内であることを確認する（NFR-1、Q2-A）
- Exporter 契約テスト（append 直後に reader から観測）で batch timer・OTLP flush 介在ゼロを構造的に固定する（FR-JRN-3）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:26Z
- **Iteration:** 1
- **Scope decision:** none

READY: full requirement→design trace; component/interface cross-check clean; BR-1..16 references resolve.

### Findings

- None
