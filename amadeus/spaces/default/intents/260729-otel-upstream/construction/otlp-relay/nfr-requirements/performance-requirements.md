# Performance Requirements — U11: otlp-relay

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| flush の bounded time | `flushSignals()` は単回起動で無期限に待機しない。1 HTTP 送信に `AbortSignal.timeout` を適用し、timeout 値は既存 Projector 実装の実測値を上限に Phase 1 計測後 ADR で確定する | Collector 停止 fixture で flush が timeout 内に成功 exit するテスト（BR-10） |
| session-end への影響 | flush は session-end trigger からの best-effort 実行で、失敗・timeout ともに exit は成功。session-end 遅延を起こさない（NFR-2、BR-13） | Collector 停止・到達不能の両 fixture で workflow 結果不変を検証（VER-3） |
| batch 読取 | `batchSize` 上限で Store を読取り、1 flush あたりの処理量を制限する。数値上限は既存 Projector の既定値を踏襲し Phase 1 計測後 ADR で確定 | 大量 fixture で batch 単位の分割処理を検証 |
| lock 競合時 | lock 取得失敗は待機なしで即時終了（BR-9）。lock 待ちによる session-end ブロックは発生しない | lock 保持状態での即時終了テスト |

## 制約

- flush 内で workflow 本体への同期呼び戻し・状態遷移への介在を行わない（BR-6、BR-13）
- retention/rotation は送信済み record のみを対象とし、未送信 record の走査で flush を遅延させない（BR-11）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: requirement IDs covered with quantified or Phase-1-deferred targets; no BR-1..15 contradictions; FR-DST-2 recorded.

### Findings

- None
