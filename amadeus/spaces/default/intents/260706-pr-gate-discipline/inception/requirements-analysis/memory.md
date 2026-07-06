<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:26:00Z — Issue #534 が Maintainer 確定済みの項目（構成、不変条件の核、知識文書の内容一覧、受け入れ条件）は questions で再確認せず、Issue が「本 Intent で確定する」と残した 4 問（ルール側配置、知識側配置、言語、固有名の切り分け）だけを questions ファイルにした。確定済み事項の再質問は注意資源の浪費のため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T01:26:00Z — 質問モード選択（Guide me / Grill me / 他）は人間非同席の多体連携運用のため提示せず、ピア協議（team.sh 実測の全メンバー宛、期限 15 分・回答 1 件成立）で代替した。前例: 260705-steering-learnings の requirements-analysis（ピア協議 4 問）。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T01:38:00Z — upstream-coverage sensor は questions ファイルにも consumes 参照を要求する（hooks が書き込みごとに発火し、fail 時は .aidlc-sensors/ に detail ファイル、pass 時は audit へ SENSOR_FIRED + SENSOR_PASSED を記録する）。reviewer の NOT-READY 指摘で発覚。修正は questions 冒頭へ「上流入力（codekb）」段落を追加し、amadeus-sensor.ts fire で両成果物 × 両 sensor の pass を記録した。次回から questions 生成時点で codekb 参照を含める。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
