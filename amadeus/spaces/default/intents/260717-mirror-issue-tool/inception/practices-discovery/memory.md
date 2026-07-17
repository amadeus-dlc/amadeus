<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T13:45:12Z — practices-discovery:c1 に従い同日 RE codekb を証跡代用、差分ギャップは gh 依存境界の1問に縮約; team.md/project.md は変更セクションなしのため practices-promote は不発(c2 の live 温存)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-17T13:45:12Z — gh CLI 依存 vs GitHub API 直叩き → gh 採用(Q1); keyring 委譲でトークン自前管理を回避、境界(scripts/ 限定)を discovered-rules に明文化して既存 Forbidden と整合。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
