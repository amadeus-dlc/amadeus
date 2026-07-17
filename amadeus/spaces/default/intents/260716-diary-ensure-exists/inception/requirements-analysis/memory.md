<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-16T09:52:00Z — E-OC1 3段順守(0問判定 → leader 承認 09:46:06Z → 記入)。裁定留保3点を FR-1a/FR-2/FR-3 へ明示タグ付きで焼き込み(reviewer が転記完全性を確認)
- 2026-07-16T09:52:00Z — iteration 1 REVISE(唯一): AC-1b の機構引用意味論誤り — RE の「用途が異なる」留保が RA 転記で「同源の harness dir 解決」へ肯定転換(citation-semantics-check 抵触、reviewer GoA 7)。是正は deriveHarnessDir(amadeus-lib.ts:131)/memoryTemplatesDir(amadeus-graph.ts:264、space 相対)を自分で再実測してから記入(fix-diff-independent-reverify)→ iteration 2 READY(GoA 1、引用精度・残存 grep とも確認)。既存ノルム2件が設計どおり機能した事例 — 新規学習ではなく実効性エビデンスとして記録

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
