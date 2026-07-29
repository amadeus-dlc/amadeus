# Performance Requirements — U8: legacy-writer-removal

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

本 Unit の性能対象はランタイム API ではなく削除ゲート評価の CI 実行コストである。ゲートが CI で回せなければ FR-MIG-4 の「機械検証」要件自体が成立しない。

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| 削除ゲート評価の CI 実行時間 | 六 checker 全実行で wall-clock ≤ 10 分（ubuntu-latest、初回実測値を CI 記録し ratchet で単調非増加とする） | ゲート CI ジョブの所要時間を artifact に記録 |
| call-site guard（VER-4）の静的検査 | 全ソース木走査を CI ジョブ内で完結させ、別ジョブ化・手動実行を要求しない | 既存 guard の CI 統合テスト |
| mixed Journal 検証（条件 a） | v1/v2 mixed fixture 上の doctor/recovery/merge 実行テストは `--ci` 層（smoke+unit+integration）に含め、e2e 層・live model に依存しない | `tests/run-tests.ts --ci` への配線確認 |
| retention 判定器（FR-MIG-5） | 既存 Intent 全件走査が O(Intent 数 × record 読取) の単純走査で完結し、外部サービス・ネットワーク I/O を持たない | 判定器の単体テストで I/O 境界を検査 |

## 制約

- ゲート評価はオフライン完結（ネットワーク・live model・外部 CLI 必須依存なし）とする。CI の再現性と所要時間の安定を同時に満たすための制約
- レイテンシ／bundle size の数値予算は Q2-A どおり Phase 1 ADR 管轄であり、本 Unit は新規ランタイム面を持たないため追加の数値予算を設定しない

## 検証

- 条件 (f) の drift guards（`bun scripts/package.ts --check`・`promote:self:check`）はゲート評価の一部として実行し、別途手動確認に委ねない

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: gate/retention/distribution requirement set covered with quantified or Phase-1-deferred targets; no BR contradictions.

### Findings

- None
