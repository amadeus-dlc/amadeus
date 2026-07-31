# Performance Requirements — U4: local-exporters

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標（NFR-1 準拠）

| 項目 | 目標 | 測定方法 |
|---|---|---|
| canonical Event の sync append レイテンシ | 現行 `appendAuditEntry` 同等を上回る回帰なし。数値予算（cold/warm）は Phase 1 実測後に ADR で確定（Q2-A）。本 Unit はその ADR 予算への適合が完了条件 | U1 skeleton の計測基盤で本番 Exporter の p50/p95 を再計測し ADR 予算と比較 |
| emit → reader 観測可能性 | 同一 process 内で emit 完了時に即時読取可能（FR-JRN-3）。batch timer・OTLP flush 介在ゼロは構造要件として固定 | Exporter 契約テスト（append 直後 read で観測） |
| dispatch 経路の追加コスト | Logger Provider → AuditLogExporter の即時 dispatch が U1 実測を悪化させない（Registry 検証＋redaction 適用込みで ADR 予算内） | emit 1 回あたりの end-to-end 計測を cold/warm で取得 |

## redaction の性能予算

- 二層 redaction（write-time＋export 境界、FR-DST-3）は sync append の hot path 上にあるため、層ごとのパターン検査は O(属性数 × パターン数) の線形走査に留め、正規表現のコンパイルは起動時 1 回に限定する
- redaction 処理を含めた emit 全体が NFR-1 の ADR 予算内に収まることを計測で確認する。予算超過時はパターン集合の見直しで対処し、層の省略は行わない（BR-9 は譲渡不可）
- telemetry 系（Span/Log/Metric）の append も同期だが、失敗時リトライ・待機を持たない（fail-open は即時 return、BR-5）

## 制約

- hot path にネットワーク I/O・バッチ待ち・非同期 flush を導入しない（NFR-2、BR-1/BR-2）
- 計測結果は NFR-1 ADR 更新の入力とし、予算超過は hard gate の不合格条件とする

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: coverage, quantified-or-deferred targets, BR consistency, FR-DST-2 all verified; no findings.

### Findings

- None
