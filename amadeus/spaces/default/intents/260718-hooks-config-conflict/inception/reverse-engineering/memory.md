<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-18T00:35:37Z — diff-refresh base は全 re-scan observed のうち HEAD の祖先で距離最小の `e9a001105d253e14affb77417423d9f0b0360f9e` と解釈した; observed `594ba21d636218558b711b371c286f16731fb081` まで距離8で、フォーカス契約の区間変更は0件だった
- 2026-07-18T00:35:37Z — #783 の marker 防御と現行 hooks writer を別の責務面として扱った; agmsg 1.1.7 の marker reader／writer は双方不在で、正の mode reader／writer は `.codex/hooks.json` に閉じていた

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-18T00:36:26Z — 宣言済み3 sensor は dispatcher の `matches` が CodeKB path を受理せず全て exit 1 のため、各決定的 checker の直接実行と全成果物の構造検査で補完した; dispatcher拒否はsensor findingではなく `SENSOR_FAILED` を発行しない既知のpath-filter不整合

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-18T00:35:37Z — 8 body 成果物のうちフォーカスに関係する6ファイルだけを鮮度更新し、business-overview／api-documentation は温存した; 事業目的と公開API外形は不変で、未裁定のconfig契約を既決として書かないため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-18T00:35:37Z — active `.codex/hooks.json` の untrack／ignore と tracked static dispatcher + ignored sidecar のどちらを採るか; 適用範囲、migration、外部 agmsg 同期、SessionEnd 互換も leader 選挙で裁定が必要
