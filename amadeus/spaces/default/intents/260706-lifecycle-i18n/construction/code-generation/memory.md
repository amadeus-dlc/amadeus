<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T08:20:00Z — #563 追従の rebase autostash pop が intents.json で衝突していたが、rebase 出力を tail -1 で切ったため conductor が見落とし、コンフリクトマーカー付きのまま B001 を進めていた。翻訳 subagent（tr-overview）の git status 報告が検出の起点。union で解消済み（41 entries）。根本原因は「rebase / stash の出力を tail で要約して確認する」運用で、exit code のパイプ隠蔽（過去の learnings）と同型。以後、autostash を伴う rebase 後は git status --short と intents.json の JSON parse を必ず fresh 実行する。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
