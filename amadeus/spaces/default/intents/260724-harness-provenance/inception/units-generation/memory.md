<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-24T17:08:17Z — U1(Harness Detector)とU2(Harness Recorder)を単一 deployable Unit へ統合; Delivery Planning で、旧分割では feature scope の end-to-end walking skeleton と team.md の1 Unit/Bolt/PR境界を同時に満たせないことが判明し、ユーザーが後方ジャンプと統合を確認した
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-24T13:00:26Z — edge block の初回記述で units キーを id: と誤記し required-sections が edge_block:malformed で FAIL。parseUnitsBlock(amadeus-lib.ts:7205)は `- name:` を期待するため name: へ是正して解消。architecture-reviewer iteration1でNOT-READY(services.md装飾トークン+AC-1d転記漏れ)→是正→iteration2でREADY
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
