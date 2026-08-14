<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-14T07:41:00Z — run-now の spec-change advisory(instance 37f9362c、spec identity 418efdb2)からの explicit `--stage formal-model-check --single`。本 intent に先行する tla-authoring の applicability outcome は無いため、Step 1 の explicit-run 経路で model-map.json の全登録ペアを宣言順に検査した。
- 2026-08-14T07:50:03Z — 登録4モデルはいずれも NOT_DETECTED / exit 0。FormalElection は 5,818,173 generated / 704,329 distinct / queue 0。spec identity は plugin-activation record 済み。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-14T10:41:00Z — CI acceptance runnerのローカル実行結果をstage verdictに採用しなかった; TLC 24 runは全件NOT_DETECTEDだがGitHub runtime環境変数が空でreceipt検証がfail-closedしたため、正準のexplicit model成果物とplugin activation no-holdを採用した。
- 2026-08-14T07:51:00Z — `--single` のため Current Stage は requirements-analysis のまま。`amadeus-learnings.ts surface --slug formal-model-check` は slug mismatch で exit 1 となり、§13 persist は実行できない。学習候補の採用可否はゲートで人間が判断する。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-14T10:41:00Z — 集約receiptを手編集せず環境不適合を記録した; 証跡を見かけ上greenにするより、モデル探索結果とCI runtime契約を分離して保持する方を選んだ。
- 2026-08-14T07:41:00Z — ローカルでは `run-model-check-ci.ts` ではなく `run-model-check.ts` を使った。同日の先行 run では CI ランナーが GitHub Actions 環境変数不足で ARTIFACT_VERIFY_FAILURE(exit 2)になることが分かっており、ステージ本文 Step 2 のローカル CLI が正規契約である。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
