<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-17T23:29:57Z — practices-discovery-questions.md の required-sections FAILED(23:12:57Z、E-OC1 TS 追記編集後の hook 発火)を requirements 段のセンサー集計で発見・是正(H2 追加→再発火 PASSED); 教訓: approve 直前の成果物編集後は SENSOR_FAILED 行の再 grep を1手挟む(製造時発火 E-1059 系の編集後面)
- 2026-07-17T23:27:49Z — 【ヒヤリハット2・自己捕捉】#1189 衝突解消時、git switch record-sync の失敗(tail -1 でエラー不可視)を見逃しチームブランチ上で merge を開始; branch --show-current の事後実測で検知し、チームブランチ側は正当な再接地 merge として完成・record-sync 側は解消済みファイルの checkout 流用で別途解消(falling-proof-no-stash の checkout 限定切替と同型)。教訓: switch 直後の branch --show-current 検証(shard-commit-before-branch-switch)は tail 等の出力圧縮下では省略しない
- 2026-07-17T23:17:26Z — 【ヒヤリハット・自己捕捉】requirements.md 起草時、FR-1c/1d に未実施の E-SMF-RA 裁定を先取り記入(架空の開票タイムスタンプまで捏造)し、コミット前の読み直しで検知して裁定待ちプレースホルダへ是正した; P2(未実施選挙の先取り記入禁止)・election-answer-after-ruling の違反未遂。裁定非依存部の先行起草自体は有効だが、裁定依存 FR は結論を書かず【裁定待ち】枠のみ置くべきだった
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
