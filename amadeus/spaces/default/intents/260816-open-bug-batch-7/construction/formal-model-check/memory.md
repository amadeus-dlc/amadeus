<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-16T18:40:00Z — build-and-test checkpoint で spec-change advisory 再発火(本線前進による spec identity 変化)。単段再実行: 登録 4 モデル per-model CLI で全て NOT_DETECTED(exit 0)、spec identity c1b7460c… を record 済み
- 2026-08-16T21:50:00Z — 本線 stage 実行: 直前の tla-authoring applicability outcome は non-target(並行共有状態の subject なし、model-map implPath 11 件 × 変更ファイルの交差 0 の実測 — tla-authoring diary 参照)。stage 契約(Stage body 1)に従い **NOT_APPLICABLE を記録し TLC は起動しない**。補足: 上記 advisory 起点の単段実行が登録全モデル NOT_DETECTED を別途実測済みであり、3 unit の着地(merge group CI green ×3)でも formal-verif 系ゲートは green — implPath drift 不在は CI で担保済み
- 2026-08-16T14:55:00Z — ローカル単段 run では run-model-check-ci.ts(acceptance)でなく per-model run-model-check.ts を用いるのが正: ci 版の runtime receipt は bunVersion 1.3.13 固定と GitHub Actions env(githubRunId/githubRunAttempt 非空)を要求し(ci-model-check-domain.ts:297-305)、ローカルでは TLC 24 run 完走後も構造的に exit 2(ARTIFACT_VERIFY_FAILURE「runtime receipt is incomplete」)になる。また ci 版の --root は evidenceRoot でありリポジトリルートを渡すと評価残渣(モデル名 dir・docker-*.argv/.timing・acceptance.json 等 57 個)がリポジトリ直下へ書かれる — 実測後に全て削除し残渣ゼロを git status で確認済み。per-model 版の --out は親ディレクトリ実在が前提(OUT_PATH「output parent must be an existing directory」)
- 2026-08-16T14:55:00Z — 検査結果: 登録 4 モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)すべて NOT_DETECTED(exit 0、completion marker と state 統計つきの実 TLC 出力由来)。runId は 7ce356ef / 8e0b28f3 / ca6abac6 / 4f469d1c、artifacts は session scratchpad の fmc/ 配下

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
