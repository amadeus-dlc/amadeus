<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:20:00Z — 既存 codekb/amadeus/（2a0a784b 時点、Intent 260706-docs-lang-guide で差分更新済み）を本ステージ成果物として採用した。2a0a784b..7829d99a の非 aidlc 差分は PR #536（docs-only、8 ファイル +186 行）のみで、codekb の記述対象（エンジン・tools・evals・skill 実装）に乖離を生じないことを git diff --stat で実測確認した。前例: 260705-agmsg-trial-docs の reverse-engineering での既存 codekb 採用。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T01:20:00Z — mode: subagent の全再生成は行わず、差分更新（timestamp 2 ファイルへの記録追記）を conductor inline で実施した。理由: 差分が docs-only 1 PR で、subagent 起動のコストが検証価値を上回るため。差分内容と影響なし判断は reverse-engineering-timestamp.md に記録した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T01:20:00Z — README 照合（本 Intent の主作業）は codekb ではなく実体（.claude/skills / .agents/skills / .agents/amadeus/scopes/ / docs/amadeus/lifecycle/ / stage-graph）を正とする。codekb は補助参照に留める（Issue #535 の Maintainer 指定の作業方法）。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
