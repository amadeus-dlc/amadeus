<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-10T01:29:12Z — code-generation の per-Unit coverage ledger は source/test commit ではなく record dir の3成果物である; swarm convergence 後も `code-generation-plan.md`、`code-summary.md`、`pr-convergence-report.md` が揃うまで Unit は uncovered のままになる。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-10T01:29:12Z — U-01 の code-generation plan/summary は worker dispatch 前ではなく verified commit 後に再構成した; source-only Bolt worktreeへ未commit record artifactが渡らず、初回 prompt が application code/testだけを所有させたためで、後続 Unit はdispatch前にartifactを作る。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-10T01:29:12Z — PR未作成のUnitではpr-convergenceをPASSとせず`not-applicable-yet`として記録する; coverage ledgerを満たしつつ、将来のIssue全体PRで行うmergeability/review/check収束を先取りしない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-10T01:29:12Z — swarm finalize がstate/auditだけをmergeしてGit commitをIntent branchへ着地させない seam と、stage reportが未実行batchをplan driftと誤判定する経路を別Intentで修正する。
