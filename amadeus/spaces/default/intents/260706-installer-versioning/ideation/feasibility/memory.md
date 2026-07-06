<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T09:05:00Z — Issue が挙げた「md5 provenance 実績」は examples/ 退役とともに現役 0 件であることを実測し、Q2 の実質候補を sha256 単独へ絞った。bootstrap（manifest 不在の初回更新で 3-way が成立しない）は実測で発見した論点で、協議 Q6 として追加した。
- 2026-07-06T09:05:00Z — 机上検証により、退避型 = 収束・冪等とも成立（_orig の世代喪失だけ告知で補う）、併置型 = 冪等だが非収束（配布契約と衝突）を確認。推奨を退避型に置いた。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
