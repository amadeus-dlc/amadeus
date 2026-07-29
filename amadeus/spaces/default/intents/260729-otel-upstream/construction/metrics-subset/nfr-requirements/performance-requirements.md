# Performance Requirements — U9: metrics-subset

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| 計測呼出し（Counter increment／Histogram record）のオーバーヘッド | 呼出し側の処理を有意に遅延させない。数値予算（p50/p95）は NFR-1・Q2-A に従い Phase 1 計測後に ADR で確定 | Provider 有無での代表 CLI 実行時間比較（U1 の起動オーバーヘッド計測と同一手法） |
| Metric Store への同期 append | 現行 telemetry buffer（lockless O_APPEND 1 行書込）同等を上回る回帰なし。数値予算は Phase 1 ADR で確定 | cold/warm の p50/p95 を skeleton 内で計測し現行と比較 |
| 計測 → 観測可能性 | 計測完了時に同一 process 内で Metric Store から当該 record を即時読取可能（FR-JRN-3 相当、batch timer なし） | export 直後の read 検証テスト |

## 制約

- hot path で新たなネットワーク I/O・バッチ待ち・retry/queue を導入しない（BR-3、BR-7、NFR-2）
- 計測経路は同期・短命 process 前提に閉じる。非同期 flush の持込は禁止（FR-EXP-5、FR-EXP-6）
- 計測結果は Phase 1 ADR の入力とし、予算超過なら hard gate の不合格条件とする（requirements.md Constraints）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: requirement IDs covered without orphans, only Q2-A-sanctioned deferrals, zero-dependency + FR-DST-2 recorded.

### Findings

- None
