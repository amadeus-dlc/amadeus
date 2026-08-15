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

- 2026-08-15T (Interpretation): advisory handoff による明示 single 実行。CI acceptance 経路(run-model-check-ci.ts run)は GITHUB_RUN_ID 等の runtime receipt を要求し local では構造的に fail-closed(exit 2 ARTIFACT_VERIFY_FAILURE、"runtime receipt is incomplete"、completedRuns=24)。stage body 記載の local 経路(run-model-check.ts)で 4 登録モデルを個別チェックし、全て NOT_DETECTED(exit 0)、completion-marker.json は 4 件とも complete:true。spec identity は plugin-activation.ts record で記録済み(exit 0)。
- 2026-08-15T (Deviation): CI 経路の evidence(acceptance.json / verification.json)が --root 指定の repo 直下へ書かれたため削除した(未追跡・本 stage の成果物契約外)。
