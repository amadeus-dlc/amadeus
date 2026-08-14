# Code Summary — git-drift-plugin

上流入力: `code-generation-plan.md`、builder 最終報告(swarm batch 2、branch `bolt-git-drift-plugin`、base `f60ecb1a1` 上に 2 コミット、10 files / +1273 −2)。PR: https://github.com/amadeus-dlc/amadeus/pull/3055

## 実装

- `plugins/git-drift/plugin.json`: stages [] / seams(code-generation・build-and-test の sensors へ `git-drift` 注入)/ sensors / tools / settings(`fetch-throttle-seconds` type number default 600)— stages:[]+sensors+seams 合成形状の最初の実例
- `plugins/git-drift/sensors/amadeus-git-drift.md`: id `git-drift`、default_severity advisory、command `{{HARNESS_DIR}}/plugins/git-drift/tools/amadeus-sensor-git-drift.ts`
- `plugins/git-drift/tools/amadeus-sensor-git-drift.ts`: detectDrift(DriftReport 判別ユニオン synced/info/warning/skipped、fetch のみ skip・判定毎回、`HEAD...origin/<default>` 三点 diff ∩ 作業側変更、台帳パターン優先提示、配列 argv の git 実行、GitPort/ClockPort 注入、`--settings-json` 受領、exit 0 固定)。throttle 記録は workspace 単位 `amadeus/.amadeus-sessions/git-drift-fetch.json`(破損は即 fetch の fail-open)
- `amadeus/config.json`: activation.names へ `git-drift` 追加(stage-less のため scope-bindings なし)
- conformance テスト `tests/integration/t2997-git-drift-conformance.integration.test.ts`(合成形状の全層 + seam/manifest id 不一致の loud 失敗様式)+ t2997-plugin-settings 拡張(スロットル設定の実消費 = FR-SET 落ちる実証 (iii) の消費者側)
- 既存ラチェット 2 件へ git-drift センサーを admit(`07c368b19`)

## 実測(builder 報告からの転記 + conductor referee)

| 検証 | 結果 |
|---|---|
| typecheck / lint(新規ファイル単体 biome も 0 警告)/ complexity / source-only | すべて exit 0 |
| 落ちる実証 3 経路(bare リポジトリ実測): 交差あり warning / 交差なし info / origin 到達不能 loud skip | 成立 |
| 正当系: behind 0 で synced / 非 git 不発火 / スロットル設定値の実消費 | 成立 |
| フルスイート(builder ローカル 1 回 — 方針転換前に完走済み) | PASS |
| referee `check` | converged / tampered=false |
| リモート CI(正) | PR #3055: 15 pass / 3 skipping(mergeState CLEAN 観測) |

## 申し送り

- timeout_seconds は実 fetch 所要の実測に基づき manifest に宣言(builder 報告の実測値 — NFR-1 検証を兼ねる)
- PR #3055 は #3052 へのスタック。#3052 マージ後に base を main へ retarget して最終収束

## 追補: FR-DRIFT-1 受け入れの実測(レビュー BLOCKER 対応、conductor 実測 2026-08-14)

- **plugin-conformance-e2e green**: PR #3055 の head `07c368b19b217e37efef365bd4a6e0acbf4e560d` に対する CI ジョブ「Plugin conformance E2E」= **pass**(run 31801563157 / job 94770584366、`gh pr checks 3055` からの転記。再取得: `gh api repos/amadeus-dlc/amadeus/actions/jobs/94770584366`)
- **`bun run build` 後の全ハーネス投影**: builder が worktree で `bun run build` exit 0(追跡ファイル不変)を実測済み。センサーの投影到達は conformance テスト `t2997-git-drift-conformance.integration.test.ts`(compose → `.claude/sensors/` 投影 → graph compile の sensors_applicable)が検証し、同ファイルは CI「Tests」ジョブ(run 31801563157 / job 94770584411 = pass、13m54s)の実行対象に含まれる
