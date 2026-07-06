<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:44:00Z — unit 名は units-generation の定義どおり u001-harness-codex（requirements.md / unit-of-work.md / unit-of-work-story-map.md を消費）。実装細部 2 問（写像の機械適用、provenance コメント 4 行固定）は自己判断（理由付き）とし、skillNameMapping の実測（prefix 規則、個別対応表ではない）を設計へ反映した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T06:55:00Z — reviewer iteration 1 は READY だが軽微 3 件（scanRoots のネストキー明記、git add 後検証 = git ls-files 走査による偽陽性 pass 防止、promote の 1 skill ずつループ）を設計へ反映し、隣接指摘の Per unit: [TBD] → u001-harness-codex を record 整合として更新した。情報提供 1 件（parity-map / AMADEUS.md の baselineCommit 表記ドリフト = fde1e1af 表記が残存、実 baseline は b67798c3）はスコープ外の是正候補として gate 報告で leader へ申し送る。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
