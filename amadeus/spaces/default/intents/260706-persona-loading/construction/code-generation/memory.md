<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T11:00:00Z — mode: subagent に対し conductor 直接処理（2 箇所の文言修正 + reason 統合の極小差分、bug 最優先の速度要件）。§11 の Always include は「state + task instructions のみ残す」形にし、persona/knowledge の除外理由を同じ行で明示（再発防止 = 親切心での再追加を防ぐ）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T11:05:00Z — reviewer iteration 1 が §11 隣接 bullet（Cap knowledge files）の残存矛盾を検出（当方が review 観点として依頼した項目で、要求段階の grep は旧文言 2 パターンしか見ておらず、意味的な依存関係を見落とした）。手動注入を前提とする bullet のため削除で解消し、parity reason を 3 箇所へ更新。「文言 grep だけでなく、修正行に意味的に依存する隣接記述を読む」を学び候補とする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
