# Formal Model Check — Outcome(NOT_APPLICABLE)

- Intent: 260818-priority-bug-batch-4 / 実施: 2026-08-18(inline、amadeus-quality persona)
- 直前の applicability outcome: `construction/tla-authoring/applicability-assessment.md` = **`impl-only`**(terminal)
- 判定: ステージ本文 Step 1 の規定(`impl-only` / `non-target` / `not-applicable` は `NOT_APPLICABLE` を記録し TLC を起動しない)どおり **NOT_APPLICABLE**。TLC は起動していない

## 直前結果の要約(矛盾がないことの確認)

`tla-authoring` は requirements.md の全 12 識別子を検査し、FR-2837-1 / FR-3106-1 / FR-3106-3 を `impl-only`、残る 9 件を `non-target` と分類して terminal route を確定した(`author-new` / `revise-model` のいずれでもない)。したがって「本ステージが検査すべき新規登録モデル」は存在せず、Step 1 が halt とする「missing or contradictory outcome」にも当たらない。

## model-completeness センサー(実測)

- 発火: 2026-08-18T13:05:24Z / 対象 `amadeus/spaces/default/specs/tla/model-map.json` / 結果 **`passed`**(findings なし)
- conductor ツリーの pin と実ファイル digest の突合(`shasum -a 256`): `amadeus-orchestrate.ts` = `cd9b3baa92a0`、`amadeus-state.ts` = `e3612b309f28`、`amadeus-election.ts` = `9e37b15bbb05` — いずれも model-map の登録値と一致し、本ツリーに SOURCE_DRIFT はない

## 未検証面と申し送り

- 本ステージは TLC を起動していないため、登録 4 モデルの不変量に対する完全探索の**新しい**証跡は本 intent には存在しない。既存登録の妥当性は前回までの探索実績に依拠する
- **直列着地時の再 resync(重要)**: 2 PR は同じ pinned implPath(`amadeus-orchestrate.ts`)を変更するため、先行 PR 着地後に後続 PR を rebase した時点で digest が変わる。後続 PR は rebase 後に `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only` を再実行しないと merge group の CI が SOURCE_DRIFT で赤化する(`cid:build-and-test:bt-ledger-resync`)
- ローカルで明示的に TLC を回す必要が生じた場合は `run-model-check.ts --model <tla> --cfg <cfg> --out <repo外>` の単一モデル経路を使う。`run-model-check-ci.ts run` の CI acceptance は runtime receipt に GitHub Actions env を要求するため、ローカルでは TLC 完走後でも構造的に `ARTIFACT_VERIFY_FAILURE`(exit 2)になる(`cid:formal-model-check:c2`)
