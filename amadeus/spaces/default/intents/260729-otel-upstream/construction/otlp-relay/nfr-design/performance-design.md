# Performance Design — U11: otlp-relay

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（bounded time・session-end 非影響・batch 読取・lock 即時終了）を実現する設計。

## bounded time の設計

- `flushSignals()` は単回起動で無期限に待機しない。1 HTTP 送信に `AbortSignal.timeout` を適用する（既存スタックの実測済み様式、`packages/setup/src/ports/http.ts` 先例。tech-stack-decisions.md § timeout 機構）
- timeout 値は既存 Projector 実装の実測値を上限に Phase 1 計測後 ADR で確定する。確定までは既存 Projector の既定値を踏襲する
- Collector 停止 fixture で flush が timeout 内に成功 exit するテストを固定する（BR-10）

## session-end への非影響設計

- flush は session-end trigger からの best-effort 実行で、失敗・timeout ともに exit は成功。workflow 本体の状態遷移には介在せず、flush 内で workflow への同期呼び戻しを行わない（BR-6/BR-13、NFR-2）
- lock 取得失敗は待機なしで即時終了（diagnostics 記録のみ、BR-9）。lock 待ちによる session-end ブロックの経路を作らない

## batch 読取の設計

- Store 読取は cursor 以降を `batchSize` 上限で分割し、1 flush あたりの処理量を制限する。batchSize の数値上限は既存 Projector の既定値を踏襲し Phase 1 ADR で確定
- retention/rotation は送信済み record のみを対象とし、未送信 record の走査で flush を遅延させない（BR-11）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:22:01Z
- **Iteration:** 1
- **Scope decision:** none

READY: 全 NFR 要求目標が設計決定でカバーされ、logical-components は components/component-methods と整合、具体機構レベルで actionable、functional-design との矛盾なし、構造充足。

### Findings

- None
