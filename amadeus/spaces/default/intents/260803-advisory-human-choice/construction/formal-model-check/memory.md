<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T08:33:38Z — 正準 CI acceptance runner では FormalElection と MirrorLifecycle を各6回（warm-up 1回、measured 5回）探索し、全12回で completion marker、statesLeftOnQueue=0、NOT_DETECTED を実測した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-03T08:33:38Z — ローカル単体 runner は FormalElection では成功したが、MirrorLifecycle では FormalElection 固定の frozen receipt と実モデルの不一致により SOURCE_IDENTITY で停止したため、全モデル対応の CI acceptance runner へ切り替えた。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-03T08:33:38Z — CI acceptance runner の全探索は成功したが、ローカル環境では runnerOs、runnerArch、githubRunId、githubRunAttempt、headSha が空となり、artifact verify が runtime receipt is incomplete で HARNESS_ERROR になった。stage verdict は未記録のまま、別 Issue 化して延期するか、この intent で実行面を修正するかの人間判断が必要。
