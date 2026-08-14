# Formal Model Check — 結果(intent 260814-unit-failure-autoelectio)

## 判定: NOT_DETECTED(登録4モデル全数、explicit single-stage run)

requirements-analysis checkpoint の spec-change advisory(advisory_instance `37f9362c-59ad-4b9e-b8c5-e78be7c1ace1`、spec_identity `418efdb232dd7ece3489048ca5527a81bc4d11ad73919b070f9bdc1c31a48578`)への run-now handoff として、`model-map.json` の登録4モデルを既定 provider(auto)で完全探索した。本 intent に先行する tla-authoring の applicability outcome は無い。

| モデル | runId | outcome | exit |
|---|---|---|---|
| BoltPrAttestationGate | `3b9368ec-5a3b-4caa-b5d0-3333ec8ae4a6` | NOT_DETECTED | 0 |
| FormalElection | `680a1932-874b-4ffa-b19d-4777e0f1552c` | NOT_DETECTED | 0 |
| MirrorLifecycle | `9a7f7db2-8334-442c-afb6-121c1a53dcbf` | NOT_DETECTED | 0 |
| PrConvergenceGate | `1f56efa1-a787-44cc-9679-36aafb216173` | NOT_DETECTED | 0 |

- 実行コマンド(各モデル): `bun .cursor/plugins/formal-model-check/tools/run-model-check.ts --model amadeus/spaces/default/specs/tla/<M>.tla --cfg amadeus/spaces/default/specs/tla/<M>.cfg --out <record>/construction/formal-model-check/out/<M>` に advisory 相関3引数を付与
- 実行日: 2026-08-14 / 測定 ref: worktree HEAD(実行時点)
- 各モデルの `--out` に `completion-marker.json` / `env-receipt.json` / `manifest.json` / `tlc-stdout.bin` / `tlc-stderr.bin` を記録
- FormalElection は frozen-receipt 正規化経路(5,818,173 generated / 704,329 distinct / queue 0)、他3モデルは verified-source 経路(完了マーカーあり)
- verdict は `plugin-activation.ts record .codex` で現在のCodex hostへ記録済み(exit 0)。続く `plugin-activation.ts advisory .codex build-and-test` は `no-hold`。

## 追加診断

ローカルでCI acceptance runnerも実行し、登録4モデルを各6回探索して全24 runが `NOT_DETECTED` となった。ただしGitHub Actions専用runtime receiptの `RUNNER_OS` / `GITHUB_RUN_ID` / `GITHUB_SHA` がローカルでは空のため、集約artifact検証は意図どおり `CI_ARTIFACTS_INVALID` でfail-closedした。この集約エラーはモデル反例ではなく、CI専用runnerをローカルで使用した環境不適合としてstage verdictから分離する。
