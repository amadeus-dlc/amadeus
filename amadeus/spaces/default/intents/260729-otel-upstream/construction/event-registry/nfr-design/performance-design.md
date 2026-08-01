# Performance Design — U2: event-registry

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（定数時間ルックアップ・実行時検証コスト限定・drift guard の hot path 隔離）を実現する設計。

## ルックアップの設計

- Registry は固定 78 件の EventDef を `Map<RegisteredEventName, EventDef>`（または frozen レコード）としてモジュールロード時に 1 回構築する。`getEventDef(name)` は Map 参照のみで、線形走査・I/O・動的 import を行わない
- Registry 定義は静的な定数リテラルとして宣言し、起動時のファイル読込・環境依存の解決を持たない

## 実行時検証の設計

- required attributes 照合は EventDef の属性リスト（配列）に対する key 存在チェックのみとし、属性数オーダーの比較で打ち止め。正規表現・深いバリデーションを emit hot path に置かない
- emit 全体のコストは U1 の emit レイテンシ計測（cold/warm p50/p95）に内包して評価し、数値予算は Phase 1 ADR で確定（NFR-1、Q2-A）

## drift guard の隔離設計

- 4集合の機械抽出（state machine 参照の静的 grep・Registry 定義・codec 定義表の導出）は unit test／CI sensor の実行時にのみ行い、CLI 実行経路から完全に隔離する
- 型生成（`RegisteredEventName` union）は compile-time のみのコストで、ランタイムコードを増やさない（tech-stack-decisions.md § 型による排除）
- drift guard の CI 実行は既存 `test:ci` の許容範囲内に収める。sensor manifest（`amadeus-event-registry-drift`）は PostToolUse 経路で発火し、対象ファイル非タッチ時はコストゼロ

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:26Z
- **Iteration:** 1
- **Scope decision:** none

READY: all four requirement docs' targets covered; logical-components matches contracts, no invented APIs; no BR contradiction. (non-blocking note: assertRegistryConsistent() worth a one-line mention at code-generation)

### Findings

- None
