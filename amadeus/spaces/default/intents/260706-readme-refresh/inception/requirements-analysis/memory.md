<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:35:00Z — Issue #535 の乖離 6 系統に加えて、実測で 6 件の追加乖離（amadeus-steering 不在、validate:all 不在、intents.md 廃止、skill-forge 段落の定義元不在、aidlc-state.md 駆動の旧説明、language-policy.md リンク欠落）を FR-7 として確定した。skill 一覧は .claude/skills / .agents/skills の両方が 41 skill で一致することを実測確認した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T01:35:00Z — 小さな構造判断 3 件（skill-forge 段落の削除、Internal Skills 表の役割分類化 + stage-catalog 委譲、ステージ数 32 / 5 phase 表記）は、team.md の質問プロトコルに従いピア協議にかけず自己判断で確定し、questions ファイルに記録した。gate の承認で最終確定とする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T01:35:00Z — Internal Skills 表は個別名の全列挙でなく役割分類 + stage-catalog.md への委譲を選ぶ。skill 増減のたびに README が乖離する構造を温存しないためで、#533（README は入口、詳細はガイドへ委譲）の方向と整合させた。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
