# Formal Model Check — 結果(intent 260814-fmc-macos-provider)

## 判定: NOT_DETECTED(登録3モデル全数、explicit single-stage run)

requirements-analysis checkpoint の spec-change advisory(advisory_instance `65df2122-77c6-4472-ac66-71b78cec8892`、spec_identity `418efdb232dd7ece3489048ca5527a81bc4d11ad73919b070f9bdc1c31a48578`)への run-now handoff として、`model-map.json` の登録3モデルを既定 provider(auto → sandbox-exec、JDK は mise ピンの Temurin 26.0.1+8)で完全探索した。

| モデル | runId | outcome | exit |
|---|---|---|---|
| FormalElection | `462da4d6-50da-4a85-9bec-35c9ee958116` | NOT_DETECTED | 0 |
| MirrorLifecycle | `e8881273-7970-406c-943f-3dba4ddc658e` | NOT_DETECTED | 0 |
| PrConvergenceGate | `8a922832-c686-415e-a706-ff8e5ab40ea8` | NOT_DETECTED | 0 |

- 実行コマンド(各モデル): `bun .claude/plugins/formal-model-check/tools/run-model-check.ts --model amadeus/spaces/default/specs/tla/<M>.tla --cfg amadeus/spaces/default/specs/tla/<M>.cfg --out <scratchpad>/fmc-out/<M>`
- 実行日: 2026-08-14 / 測定 ref: worktree HEAD `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`
- verdict は `plugin-activation.ts record .claude` で記録済み。
- 補足: 本 intent の対象 Issue #2361 が指す「macOS 既定 provider の不通」は JDK 版不一致環境での事象。本 worktree は `mise.toml` の `java = "temurin-26.0.1+8"` ピンにより JDK が完全一致するため、既定経路(auto → sandbox-exec)がそのまま成立した(Issue の機序理解と整合する実測)。

## 補記(CI ランナーの先行試行)

最初に `run-model-check-ci.ts run --root <worktree>` を試行し、18 runs 完走後に `ARTIFACT_VERIFY_FAILURE`(detail: `runtime receipt is incomplete`)で exit 2 となった。これは runtime receipt が GitHub Actions 環境変数(RUNNER_OS 等)を要求する CI 専用契約のためで、ローカル実行の正規経路はステージ本文 Step 2 の `run-model-check.ts` 個別実行である。試行時に worktree 直下へ生成された `acceptance.json` / `verification.json` は削除済み。


## 本 workflow 経路の判定(2026-08-14 追記): NOT_APPLICABLE

ステージ本文 Step 1 に従い、直前の適用性評価(`construction/tla-authoring/applicability-assessment.md`、ladder AUTO_DECIDED `auto-decision-173aa51b403b39786d9bfc14ca115d8a`)が terminal route(not-applicable)を記録しているため、本 workflow 経路では TLC を起動せず `NOT_APPLICABLE` を記録する。

上節の advisory 由来の実測(登録3モデル NOT_DETECTED ×3、既定 provider auto → sandbox-exec)は本判定の代替ではなく、独立に存在するエビデンスである。
