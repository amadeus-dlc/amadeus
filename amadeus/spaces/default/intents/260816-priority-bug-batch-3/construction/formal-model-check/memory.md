<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-17T00:37:00Z — 明示 single-stage 実行で先行 applicability outcome が無いため、model-map.json の登録全4モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)を対象とした; 全て NOT_DETECTED (exit 0)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-17T00:37:00Z — run-model-check-ci.ts はローカルでは Docker 前提で失敗し、失敗時に --root(リポジトリ直下)へ bootstrap/(0400 の tla2tools.jar)を残して再実行が EACCES BOOTSTRAP_FAILURE になる再実行トラップを観測(誤生成物は削除済み)。ローカルの正は run-model-check.ts(プロバイダ自動選択)。CI ワークスペース再利用時の同種トラップの要否確認は将来の起票候補
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
