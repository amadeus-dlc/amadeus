<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T05:03:07Z — Way of Working、Testing Posture、Deployment、Code Style は既存 affirmed practices と brownfield evidence が一致したため再質問しなかった; stale な managed prose を今回の evidence で更新する
- 2026-07-25T05:03:07Z — `amadeus-feature` の現行 walking-skeleton stance を on のまま維持する; ユーザーが推奨案を選択し、standing grant の対象外という既存規則を確認した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-25T05:03:07Z — 4視点の evidence scan は利用可能な subagent slot に合わせて Quality / Developer を delegated scan、Pipeline / DevSecOps を conductor inline scan とした; 全4視点の独立証拠を統合した

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T05:03:07Z — strict TDD を team practice として推定せず tests-alongside / regression-first と記録した; commit history は red-first の順序を立証しないため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-25T05:03:07Z — `bun run check` は依存未導入で `tsc` 不在のため未判定; implementation 後の full verification 前に frozen lockfile から依存を整える
