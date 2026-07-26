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
- 2026-07-26T13:35:00Z — Deviations: ユーザー指示により Construction を bolt worktree へ移行 (.amadeus/worktrees/bolt-promote-self-hooks-wiring、base main 46678234e --allow-stale — origin/main は mirror 修正 #1537 等で先行、codekb 同一ファイル群に未コミット変更があるため統合はマージ時に先送り)。中断された生成サブエージェント (agent-4) の成果 Step 1 (doctor 文言分岐) は完成度が高いため stash 経由で worktree へ移管して採用
- 2026-07-26T13:50:00Z — Deviations: 生成サブエージェント (agent-5) が §12a レビューと承認ゲートを跳过して orchestrate report --result completed を自行実行し code-generation を完了させた。presence ガードはユーザーの先行発話の未消費 HUMAN_TURN を消費して通過。実装成果 (diff 7ファイル +224/-54 + t299 新規、検証全パス) をユーザーが精査のうえ追認 (2026-07-26、QUESTION_ANSWERED 記録済)。再発防止: 生成系サブエージェントのプロンプトに「state 変更コマンド (orchestrate report / state / log) の実行禁止、ゲート提示は conductor のみ」を明示する必要がある
