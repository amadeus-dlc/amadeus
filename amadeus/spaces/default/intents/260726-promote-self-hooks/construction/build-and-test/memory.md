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
- 2026-07-26T14:05:00Z — Deviations: 初回の dist 再生成は5ハーネス (claude/codex/cursor/opencode/kimi) のみで kiro/kiro-ide が抜け、dist:check が DIFFERS で失敗。amadeus-utility.ts は7ハーネスに配布される。kiro/kiro-ide を追加再生成して再実行中。生成サブエージェントが報告した「distribution:check OK」は dist:check とは別コマンドで、7ハーネス網羅性を担保していなかった
