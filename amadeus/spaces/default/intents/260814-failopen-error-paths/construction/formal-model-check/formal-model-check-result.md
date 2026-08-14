# Formal Model Check — 結果(intent 260814-failopen-error-paths)

## 判定: NOT_DETECTED(登録4モデル全数、explicit single-stage run)

requirements-analysis checkpoint の spec-change advisory(advisory_instance `3f4771df-022a-4215-b35d-e7bfd7fc99b2`、spec_identity `418efdb232dd7ece3489048ca5527a81bc4d11ad73919b070f9bdc1c31a48578`)への run-now handoff として、先行 applicability outcome なしの explicit `--single` 実行で `model-map.json` の登録4モデルを宣言順に検査した。既定 provider は auto → sandbox-exec(Darwin)。JDK は mise ピンの Temurin 26.0.1+8。tla2tools.jar sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。

| モデル | runId | outcome | exit | complete | states generated | distinct | queue |
|---|---|---|---|---|---|---|---|
| BoltPrAttestationGate | `eacdcdeb-73d1-442a-9ef1-7e0a656c64ed` | NOT_DETECTED | 0 | true | 43,395 | 9,306 | 0 |
| FormalElection | `30ec276e-9f3e-42f5-9cd1-a5b9a89e585e` | NOT_DETECTED | 0 | true | 5,818,173 | 704,329 | 0 |
| MirrorLifecycle | `d4c36fd7-cab0-4dc5-b37a-3cad889573cc` | NOT_DETECTED | 0 | true | 208,628 | 89,099 | 0 |
| PrConvergenceGate | `7438e187-f7c4-45c9-86e5-78c7be416bf1` | NOT_DETECTED | 0 | true | 319 | 66 | 0 |

- 実行コマンド(各モデル): `bun .cursor/plugins/formal-model-check/tools/run-model-check.ts --model amadeus/spaces/default/specs/tla/<M>.tla --cfg amadeus/spaces/default/specs/tla/<M>.cfg --out /tmp/amadeus-fmc-failopen-error-paths/<M>`
- 実行日: 2026-08-14 / 測定 ref: worktree HEAD `ba4b8427d6ee85eea8e073d43c1bcbbbe8506ed5`
- module/cfg identity は各 manifest の `sourceProvenance` が `model-map.json` と一致
- verdict は `plugin-activation.ts record .cursor` で記録済み。記録後の evaluator は `{"verdict":{"kind":"no-hold"}}`

## 補記(最初の --out 試行)

最初に worktree 内 `construction/formal-model-check/out/<M>` を事前作成して渡したところ `HARNESS_ERROR (OUT_CONFLICT)`(exit 2)となった。`--out` はワークスペースと重ならず、かつ未作成のパスである必要がある。誤作成した in-tree `out/` は削除し、親だけ実在する `/tmp/amadeus-fmc-failopen-error-paths/<M>` へ切り替えた。
