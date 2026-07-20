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

- [2026-07-20T04:00Z] Deviation: reviewer iteration 1 NOT-READY(Major 1: 「gh pr create 前例不在」の不在主張が誤り — ci.yml:319-327 の CI shell precedent を見落とし。RE スキャンの grep 走査範囲が .github/ を欠いた absence-claim-grep-verify 違反実例)→ 5ファイル(RA 2+上流3)へ訂正+design 申し送り追加、iteration 2 READY。
- [2026-07-20T04:00Z] Deviation: 是正中に python 置換スクリプトのタプル誤り(CORRECT[0]="s")で「s。」混入 — bulk-edit-verify-before-write 違反実例を自己捕捉し Edit で修復、残骸ゼロを grep 再検証(fix-diff-independent-reverify 実施)。
- [2026-07-20T04:00Z] Interpretation: E-LSSRA1/2 の留保3件は分母3=転記3で FR-1/FR-2 へ verbatim 転記(reviewer 照合済み)。auto-merge 不採用は ci.yml precedent との意図的相違として明文化(citation-semantics-check)。
