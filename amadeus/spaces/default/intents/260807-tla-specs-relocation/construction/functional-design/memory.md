<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-07T11:11:57Z — Construction フェーズの質問は「例外」(stage-protocol §3)の規定どおり、本ステージの明確化質問は新設しなかった — 素材となる判断は RA(E-TSR-RA1)で全件裁定済みで、残余は E-1 seam 等の技術細目のみだったため
- 2026-08-07T11:11:57Z — walking-skeleton stance は off と分類(org.md の scope 別既定: refactor 系は式次第スキップ。self-refactor・greenfield 要素なし)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-07T11:11:57Z — なし

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-07T11:11:57Z — E-1 Resolver の seam は『鏡像内でカーソルファイル直接読取』を選択(§12a iteration 1 BLOCKER の解消)。代替(引数注入 / amadeus-lib ごと鏡像)はそれぞれ BR-1 違反・鏡像規則の膨張のため不採用。in-tree 先例 activeSpaceLocal あり
- 2026-08-07T11:11:57Z — センサー matches glob は固定深度形を採用(入れ子 ** は dispatcher の globToRegex 制約に抵触しうるため)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-07T11:11:57Z — なし(E-1 seam・glob 形・loader walk-up 変更点は設計に確定済み。実装細目は code-generation の判断)
