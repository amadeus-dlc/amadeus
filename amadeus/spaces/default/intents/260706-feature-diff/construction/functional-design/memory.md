<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T08:10:00Z — 三者比較表は 4 列（main は節冒頭要約）とした。上流 main の実測 tree が v1 系（.claude / .kiro / aidlc-rules）で v2 と構造が根本的に異なり、行単位比較は情報量が出ないため（questions Q1）。unit 名は前例どおり Intent slug = feature-diff、Per unit も更新済み。skeleton stance は scope-dependent（refactor 既定 = off）を report 済み。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T08:20:00Z — reviewer iteration 1 の blocking 指摘を受け、当初の 4 列案（main を節要約へ降格）を撤回し、gate 承認済み FR-1.2 の三者比較表を字義どおり尊重する 5 列へ確定した。承認済み要求を「残る細部」の枠で覆すのは自己判断の範囲外という指摘は妥当（#534 の drift 権威指摘と同型 = 承認済み文書が正）。main 列は定型値 + 実値の併用で情報量を保つ。正準 H2 見出し 12 対（en/ja）も設計に固定し、NFR-3 チェック②の照合対象を文字列レベルで確定した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
