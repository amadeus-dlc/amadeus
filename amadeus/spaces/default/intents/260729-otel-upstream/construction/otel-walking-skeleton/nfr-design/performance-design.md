# Performance Design — U1: otel-walking-skeleton

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（NFR-1 回帰なし・即時観測可能性・bundle 成立・起動オーバーヘッド）を、business-logic-model.md の処理シーケンス上で実現する設計。

## sync append 経路の設計

- canonical Event の永続化は「lock 取得（mkdir lock）→ sequence 採番 → 同期 append → idempotency 記録」の一直線とし、現行 `appendAuditEntry` と同一構造を維持する。キュー・バッファ・batch timer を経路に置かない（business-logic-model.md § canonical Event 発行、FR-JRN-3）
- Logger Provider から AuditLogExporter への dispatch は同期関数呼出し。Promise 化・イベントループ経由の遅延を入れない
- redaction（write-time 層）は emit 時に attrs へ 1 パス適用。パターンは起動時に 1 回コンパイルし、hot path で再コンパイルしない

## 計測設計

- skeleton 内に計測ハーネスを設け、sync append の cold（lock 初期状態）／warm（連続 append）で p50/p95 を採取し、同一計測条件の現行 `appendAuditEntry` と比較する。結果は Phase 1 ADR の数値予算の入力（NFR-1、Q2-A）
- 代表 CLI の起動時間を Provider 登録あり／なしで比較する起動オーバーヘッド計測を同ハーネスに含める（数値閾値は Phase 1 ADR で確定）
- bundle size は `bun build` 成果物の size 計測＋起動検証で確認し、API singleton の一意性をテストで固定（NFR-3）

## 起動コストの抑制

- bootstrap は RedactionPolicy・EventRegistry（最小集合）・FatalLatch の構築と 3 Provider 登録のみとし、重い初期化（fixture 読込・ネットワーク接続）を持たない
- Intent Context の復元（`restoreIntentContext()`）はファイル 1 回の読取に限定し、失敗しても起動を遅延させない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:26Z
- **Iteration:** 1
- **Scope decision:** none

READY: all NFR targets covered by concrete design decisions; logical-components matches inception contracts exactly; no contradiction with the failure contract.

### Findings

- None
