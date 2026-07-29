# Performance Design — U10: diagnostic-logs

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（emit レイテンシ・batch 禁止・fail-open 遅延・相関採取コスト）を実現する設計。

## emit 経路の設計

- `emitDiagnostic` は現行 telemetry buffer 書込（O_APPEND 1 行）と同型の 1 回の同期 append のみ行い、それ以外の I/O・timer を持たない。呼出し側関数内で発生する FS 操作回数を実装検査で固定する
- batch timer・flush を置かず、emit 完了時に同一 process の reader から即時観測可能とする（BR-8、FR-JRN-3 の Store 版）。emit 直後 read 検証テストで固定
- traceId／spanId の採取は active Context からの参照取得のみとし、ID 生成・sha256 計算・Span 終了待ちを emit 経路に入れない（BR-3）

## fail-open の遅延設計

- Store 書込失敗時の復帰は例外握りつぶしのみ。retry・queue・二次 emit を行わない（BR-2/BR-10）ため、失敗経路の追加遅延は catch 処理の定数時間に留まる
- 強制失敗テストで復帰までの追加操作がないことを固定する

## 計測設計

- p50/p95 を現行 buffer 書込と比較計測し、結果は Phase 1 ADR の数値予算の入力とする（NFR-1・Q2-A）。数値予算自体は ADR で確定
- hot path にネットワーク I/O・Collector 依存を導入しない（FR-EXP-2 系統、NFR-2 準拠）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:27Z
- **Iteration:** 1
- **Scope decision:** none

READY: all four requirement sets fully addressed; logical-components resolves cleanly.

### Findings

- None
