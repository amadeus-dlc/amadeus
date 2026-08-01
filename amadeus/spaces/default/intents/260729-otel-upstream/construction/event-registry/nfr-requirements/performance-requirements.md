# Performance Requirements — U2: event-registry

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| `getEventDef(name)` ルックアップ | 定数時間（Registry は固定 78 件の Map／レコード参照。emit hot path で線形走査・I/O を行わない） | 実装レビュー＋unit test でルックアップ経路を固定 |
| required attributes 実行時検証 | emit 呼出しあたり EventDef の属性リストとの照合のみ（最大でも属性数オーダーの比較）。数値予算は NFR-1・Q2-A に従い Phase 1 計測後に ADR で確定 | U1 の emit レイテンシ計測（cold/warm p50/p95）に内包 |
| drift guard の実行 | hot path から隔離。compile-time（型）・unit test・CI sensor の3層でのみ稼働し、CLI 実行時間へ影響しない | CI ジョブ時間の計測（既存 test:ci の許容範囲内であること） |

## 制約

- 4集合の機械抽出（静的 grep・codec 表の導出）はビルド／テスト時に限定し、実行時にファイル走査を行わない（VER-1 の3層構成どおり）
- 型生成（`RegisteredEventName` union）は compile-time のみのコストとし、ランタイムコードを増やさない
- 計測結果は Phase 1 ADR の入力とし、予算超過なら hard gate の不合格条件とする（requirements.md Constraints）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: all unit-relevant IDs (FR-EVT-1/7, FR-DST-3/4/5, NFR-1, VER-1/2/3) covered with Q2-A-consistent deferrals; no BR contradictions; FR-DST-2 recorded.

### Findings

- None
