<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-17T20:08:22Z — user-stories SKIPのためstory-mapを架空のstoryで埋めず、FR-1〜FR-5 / NFR-1〜NFR-4のcoverage mapとした; requirements全件とUnitの孤児を機械的に確認できるため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-17T20:08:22Z — ガイドの単一stream時SKIP heuristicよりengineのEXECUTE directiveを優先し、単一のnon-deploying Unitを生成した; 実行planと2.7 / 2.8一体スコープが決定済みであるため。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-17T20:08:22Z — marker / H2 / lineage / landingを別Unitに分割せずU001へ収束した; 証拠は独立してもCodeKB境界とclose価値を共有し、分割で独立deploy / test価値が生じない。
- 2026-07-17T20:08:22Z — 2.7でsequencing / critical path / exit conditionsを固定せず2.8へdeferした; topologyと経済的順序の所有権を混同しないため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
