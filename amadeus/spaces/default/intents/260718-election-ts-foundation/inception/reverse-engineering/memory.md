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

## Deviations
- [2026-07-19T01:45Z] leader(conductor)の事前主張「local overlay チャンネルは存在しない」は誤り — preserved リストのみの不完全 grep で断定した absence-claim-grep-verify 違反の自己実例。Developer scan の全数 grep が contrib/skills(promote-self.ts:45-46, :229-236)の実在で反証、conductor が一次検証で確定・ユーザーへ訂正済み。PM 台帳の違反カウント材料。

## Interpretations
- [2026-07-19T01:46Z] 鮮度ポインタ「最新」(260718-hooks-config-conflict、observed 594ba21)は本ツリー HEAD の非祖先(並行 squash 由来、--is-ancestor exit 1 実測)のため base 真実源にせず、rescan-base-ancestry どおり祖先最小距離の e9a001105 を採用。
