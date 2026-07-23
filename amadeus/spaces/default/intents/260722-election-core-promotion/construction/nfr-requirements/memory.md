<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-23T03:54:08Z — [Deviations] U3 NFR iter2 の残余は conductor 起因の FD 伝播漏れ(U3 FD Minor2 の整合テスト化を BR-7 セルのみに適用し割付節へ未伝播 — review-fix-propagation 類型)と確定。予算消費後の残余是正として機械検証可能クラスで受理: (a) FD 割付節を reviewer 承認済みセル(整合テスト)へ同期(耐久 Review 節の Minor2 記録が承認証拠) (b) NFR 引用をセル逐語へ訂正+層確定(unit)を本 Unit の新規決定として申告。grep で旧文言残存 0 を機械確認。violation 実例として PM 報告対象。
