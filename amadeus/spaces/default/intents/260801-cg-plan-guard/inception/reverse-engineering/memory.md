<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
2026-08-01T08:20:00Z — 患部3点(tryEmitSwarm/computeBoltDag/parseUnitsBlock)を conductor が verbatim 直読で確定。患部引用は observed cb809c4de で verbatim 直読により再解決済み(免除の適用ではない — 関数不変〔orchestrate/runtime 無変更・lib の parseUnitsBlock 本体不変〕は補助証拠。E-CPG-RES13 投票者2の表現訂正を反映)。#1893 の詳細機序はクロスレビュー2名(進行中)の成果を RA で消費する分業。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
2026-08-01T08:20:00Z — RE 宣言センサーは codekb 出力の filter 構造不適合で発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch)— 代替として現在節ヘッダ整合 8/8 の機械 grep と re-scans 記録を conductor が直接検証。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
