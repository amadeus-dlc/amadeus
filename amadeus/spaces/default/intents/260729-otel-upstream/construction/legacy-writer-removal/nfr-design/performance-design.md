# Performance Design — U8: legacy-writer-removal

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

performance-requirements.md の目標（ゲート評価の CI 時間予算・静的検査の CI 内包・オフライン完結）を実現する設計。本 Unit の性能対象はランタイム API ではなく削除ゲート評価の CI 実行コストである。

## ゲート評価の実行設計

- 六 checker は互いに独立に実行可能とし、1 checker の FAIL/UNKNOWN が他 checker の実行を停止させない。評価器は常に全条件の `ConditionResult` を集約して `GateEvaluationReport` を生成する（business-logic-model.md § 削除ゲート）
- 六 checker 全実行の wall-clock ≤ 10 分（ubuntu-latest）を予算とし、初回実測値を CI 記録して ratchet で単調非増加とする。所要時間は artifact に記録する
- ゲート評価はオフライン完結（ネットワーク・live model・外部 CLI 必須依存なし）とし、CI の再現性と所要時間の安定を同時に満たす

## 各 checker のコスト設計

- call-site guard（条件 c、VER-4）は既存の grep ベース静地走査をそのまま利用し、CI ジョブ内で完結する。別ジョブ化・手動実行を要求しない
- mixed Journal 検証（条件 a）は v1/v2 mixed fixture 上の doctor/recovery/merge 実行テストを `--ci` 層（smoke+unit+integration）に含め、e2e 層・live model に依存しない
- retention 判定器（FR-MIG-5）は既存 Intent 全件走査を O(Intent 数 × record 読取) の単純走査で完結させ、外部サービス・ネットワーク I/O を持たない
- 条件 (f) の drift guards（`package.ts --check`・`promote:self:check`）はゲート評価の一部として実行し、別途手動確認に委ねない

## 数値予算の境界

- レイテンシ／bundle size の数値予算は Q2-A どおり Phase 1 ADR 管轄。本 Unit は新規ランタイム面を持たないため追加の数値予算を設定しない（performance-requirements.md § 制約）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T12:18:27Z
- **Iteration:** 1
- **Scope decision:** none

READY: (reviewer also verified structure/consistency; no findings returned)

### Findings

- None
