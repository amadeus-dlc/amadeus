<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T08:41:12Z — doctor の shell 検査は 3 分岐（エンジン dir 不在 = fail + installer 再実行誘導 / memory 未 seed = 固定 marker つき advisory pass / 両方あり = 従来 pass）で実装した。固定 marker（workspace shell pending first workflow）は installer smoke の grep 契約であり、双方のコメントに「change them together」を明記した。
- 2026-07-06T08:41:12Z — FR-3.2 の eval シナリオは実測で精密化した。doctor の shell 検査が見るのは harnessDir()（導入先では .claude/）であり、.agents/amadeus だけ消しても .claude が残ると shell 行は pass する。eval は両方を削除して「導入不完全」を作る。また「dist/ 文言なし」の assertion は shell 行に限定した（他検査行の fix に dist/ が残っており、全 stdout 検査は偽陽性になる — 本 Intent のスコープは shell 検査の誘導のみ）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T08:41:12Z — installer の advisory 判定は固定 marker の部分文字列一致にした。doctor に構造化出力（JSON）を足す案は smoke 1 箇所のための過剰機構（Right-Sizing）。文字列契約の脆さは双方コメントの相互参照と eval の両側検証で抑える。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-06T08:41:12Z — doctor の他検査行（engine files 等）の fix に dist/ 文言が残る。#573 のスコープ外だが、同種の実行不能誘導の点検は後続 Issue 候補として gate 報告に含める。
