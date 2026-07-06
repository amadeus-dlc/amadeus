<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:20:00Z — 対象 8 文書（計 665 行）と参照元を実測した。旧 path 言及は 0 件（PR #553 更新済み）で、ディスパッチ注記の「文書ごとの歴史的記述か更新かの判断」は該当なしと確定。アンカー参照 0 件・行番号参照 0 件のため英語見出し新設に破壊リスクなし。
- 2026-07-06T06:20:00Z — 参照元リンクの差し替えは Cross-linking rules の適用対象（*.ja.md ファイル）に限定する。AMADEUS.md 等の日本語 root 文書は #536 の前例どおり正本 .md 参照を維持する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T06:20:00Z — 小さな構造判断 3 問（ja 版は既存本文の移設、参照差し替えは *.ja.md 限定、英語見出し新設）は自己判断で確定し questions ファイルに記録した。gate の承認で最終確定とする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
