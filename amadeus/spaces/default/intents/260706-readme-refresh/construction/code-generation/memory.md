<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T02:40:00Z — 編集本体は subagent（amadeus-developer-agent）が実施し、business-logic-model の編集計画表 14 行を全消化した。退役語 grep 0 件、リンク機械検査 broken 0 件を自己検証済み。
- 2026-07-06T02:40:00Z — 作業中に PR #539（上流 2.2.0 取り込み、amadeus-compose 新設）と PR #542（parity 修正）が main へ merge された。functional-design gate の付帯条件に従い origin/main = 33c40271 へ rebase し、再照合で amadeus-compose を Internal Skills 表へ追加した（amadeus* skill 41 → 42）。intents.json の entry 衝突は union（upstream 保持 + 自 entry 末尾）で解消した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T02:40:00Z — reviewer iteration 1 の指摘で、subagent が「範囲外」と誤読していた README.ja.md の Extension guide 行の同期漏れを追記で解消した（C-1 は変更対象の限定であり ja への追記の禁止ではない。FR-8.1 / BR-2 が優先）。あわせて ja 版の language-policy / extension-guide リンクを Cross-linking rules（ja からは .ja.md 優先）に合わせた。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T02:40:00Z — amadeus-compose は補助入口でなく shortcut 行へ配置した。根拠は stage-catalog.md 自身の分類（「the composer shortcut」、scope entry skills と並記）。AMADEUS.md の補助入口 3 個の記述は #539 でも不変であり、README はそれに従う。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
