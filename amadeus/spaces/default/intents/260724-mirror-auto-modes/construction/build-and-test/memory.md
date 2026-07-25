<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T15:35:00Z — patch coverageの残余は、意味上の経路を追加テストで実行した後に、Bun LCOVが帰属できない型消去・subprocess・狭いrace防御の行だけを個別allowlist化した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T15:35:00Z — patch coverageを一括免除せず、実行可能な405行を先にテストで回収したためテスト量は増えたが、各残余範囲には理由と削除条件が残る。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-25T15:35:00Z — CI performance aggregateの`packageWrite`分散比2.21が一過性か、push後の同一image 3 replicaで再確認する。
