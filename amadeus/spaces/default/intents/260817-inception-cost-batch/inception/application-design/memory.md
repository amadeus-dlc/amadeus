<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-17T23:25:00Z — 設計裁定3点(実装形/除外集合/provenance 引用)は複数妥当解クラスだが、solo-election.trigger.mode 未設定(auto でない)のため選挙の自動発動対象外と判定し、full autonomy の decide-question 梯子で AUTO_DECIDED ×3(degraded solo-election capability は各 decision に記録済み)。ユーザーが選挙を明示要求すれば再裁定可能
- 2026-08-17T23:25:00Z — producing 宣言を intent-capture の optional_produces に置く選択: RE の produces は codekb arm で共有 codekb へ解決するため per-intent 証跡の置き場に不適(scan record §3 実測)。off-path producer は advisory に留まる graph 規約を利用

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
