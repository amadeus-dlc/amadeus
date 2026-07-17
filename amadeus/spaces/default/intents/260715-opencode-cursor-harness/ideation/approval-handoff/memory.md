<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-15T16:38:21Z — テンプレ6問中、SKIP ステージ(market-research/team-formation/rough-mockups)由来の2問は成果物不在のため質問自体を N/A 除外し、除外理由を冒頭判定に明記した(存在しない成果物への合意を問わない); leader 抜き取り検査で妥当と承認
- 2026-07-15T16:38:21Z — decision-log は evidence-split(git 検証可能 vs agmsg 出典)を列として構造化した — レビュアーの独立検証を容易にするため
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-15T16:39:33Z — 初回センサー発火で decision-log(H2 1個)と questions(上流成果物名の参照欠落)が required-sections / upstream-coverage FAILED — H2 追加と上流入力行の明記で是正し再発火 6/6 PASSED; ゲート報告前のセンサー実測がガードとして機能した(検出は成果物起草の直後)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
