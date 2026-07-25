<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T05:43:27Z — gate requirementとauthorization carrierを別fieldにした; `gate`は変更せずsolo選択時だけ`standing_grant_id`を付与する
- 2026-07-25T05:43:27Z — expected grant invalidationを`await-approval`とした; stageを再実行せず既存human gateだけを再提示する

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T05:43:27Z — 新serviceではなく既存3境界を選んだ; libがdomain、orchestrateがroute、stateがlock内commitを所有する最小変更を優先した
- 2026-07-25T05:43:27Z — soloだけに完全順序を追加する; team modeの現行探索順序を維持するためmode間のcandidate selection差を受け入れた
- 2026-07-25T05:43:27Z — route選択をprotected audit receiptへ記録する; ID carrierだけでは意図的な有効ID差替えをcommit側で証明できず、承認済みNFR-03を満たせない
- 2026-07-25T05:43:27Z — receiptへUUID Route Idを追加してcarrierと対で運ぶ; latest/consumed推論を廃し、重複next、crash、並行routeを試行identityで分離する
- 2026-07-25T05:43:27Z — grant-backed approveだけstrict one-line JSON wireを使う; human/team CLI出力を変えずtyped fallbackをprocess境界で成立させる

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
