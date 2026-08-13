<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-13T14:12:00Z — Isolated `--single` run with no preceding applicability outcome. Stage body checks every registered model in model-map.json declaration order, then `plugin-activation.ts record`.


## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-13T14:35:11Z — `run-model-check-ci.ts run` exited 2 (`ARTIFACT_VERIFY_FAILURE`) because local runtime lacks GitHub Actions `githubRunId`/`githubRunAttempt`. Switched to the stage body's local `run-model-check.ts` path (real TLC, docker provider). FormalElection evidence reused from the CI measured-5 run (`NOT_DETECTED`, identities match model-map.json); MirrorLifecycle and PrConvergenceGate were re-run locally into the stage `out/` dirs.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
