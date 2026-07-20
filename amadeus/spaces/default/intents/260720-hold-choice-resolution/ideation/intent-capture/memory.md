<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- [2026-07-20T02:50Z] Interpretation: intent-capture:c1 適用 — E-TCRCG/E-TCRRA2 裁定と Issue #1267(クロスレビュー成立済み)を前提知識として直接反映し、質問は既決事実の確認3問のみ(E-OC1)。未決(CLI 構文・二値後方互換・契約変更該当性)は RA/design の選挙・エスカレーションへ予告。
- [2026-07-20T02:50Z] Open question: hold-resolution の choice 語彙追加が「ユーザー可視契約の変更」(正準リスト(4))に該当するか — E-TCRCG は B 案(choice 語彙化)を「採用時はユーザーエスカレーション」と注記済み。本 intent は E-TCRCG=A(二値維持)の上に追加語彙を載せる形で、既存二値の変更を伴うかが RA の判定点。
