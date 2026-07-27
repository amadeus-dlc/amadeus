# コード生成サマリ — U6 activation-policy

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、logical-components、performance-design、reliability-design、security-design、scalability-design、tech-stack-decisions、unit-of-work、requirements

ADR-1 案 A(spec-hash advisory・自動 TLC 実行なし)を実装した。commit `8ae1ef058`(branch `bolt-activation-policy`、未 push — finalize は conductor)。

## 実装内容

### 1. C6 コアモジュール(新規)

`packages/framework/core/tools/amadeus-plugin-activation.ts` — Amadeus 独自の spec-hash 機構。全関数が injectable-FS(`ActivationFs`)の in-process seam。

- `computeSpecHash`: 相対 path 辞書順ソート済みの `(path, 内容)` 列を `node:crypto` sha256 で 1 パス計算。path をハッシュ入力へ畳み込むため、内容不変の rename も changed として検出。読取不能は `{ ok: false }` の fail-closed。
- `readActivationState` / `writeActivationState`: `.amadeus-plugin-activation.json`(composition record 隣接・機械ローカル)。read は不在・corrupt とも null(never-run 縮退)。write は temp+rename の原子的置換で唯一の書き手(BR-U6-6)。
- `judgeActivation`: 純 3 値マップ。null(spec 読取不能 / state 不在・corrupt)は never-run へ倒す(fail-closed)。
- `activationAdvisoryLine`: current は null(無音)、changed / never-run は 1 行固定文言。
- `formalModelCheckComposed` / `isComposedPluginStage`: composition record の read-only 照会(total)。
- `resolveActivationJudgment` / `activationAdvisoryForHost`: 未 compose を最初の分岐で null 返し(0-plugin ゼロ影響)。
- `recordActivationVerdict`: flow 4。fail-closed 時は書かない。

### 2. engine 配線(薄い 3 接点)

`packages/framework/core/tools/amadeus-orchestrate.ts`:

- `pluginActivationHostRoot()`: `AMADEUS_PLUGINS_HOST_ROOT ?? dirname(TOOLS_DIR)` を realpath 解決。不在パスは raw へ縮退し throw しない(advisory が `next` を壊さない)。
- `emitActivationAdvisory` を `emitForSlug` の先頭に単一呼出し点で挿入 — slug が `build-and-test` のときだけ `activationAdvisoryForHost` を評価し、非 null なら stderr へ 1 行(stdout の directive JSON は不変)。
- `emitComposedPluginStageIfInstalled` を Branch 7 に挿入 — compose 済み plugin stage への `--stage`(--single なし)を `emitSingleRunStage` で受理(FR-7(a))。
- `recordActivationVerdictIfActivationStage` を `handleSingleReport` に挿入 — 完了 slug が `formal-model-check` のとき verdict を記録(flow 4)。
- 判定・状態・文言のロジックは activation モジュールへ委譲。engine 側関数は export し、テストで in-process 駆動(spawn 盲点回避)。

### 3. plugin 中立正本のプロシージャ文

- `plugins/formal-model-check/stages/formal-model-check.md`: frontmatter `condition` と body を「install が opt-in 境界、compose 済みなら `--stage formal-model-check`(--single 任意)、Amadeus は自動実行せず spec-hash advisory のみ」へ更新。
- `plugins/formal-model-check/README.md`: 同旨の 1 文へ更新。
- `bun scripts/package.ts`(7 ハーネス)+ `bun run promote:self` で dist / self-install へ投影(手編集なし)。

### 4. テスト

- `tests/unit/t319-activation-judgment.test.ts`(純関数): judge 全分岐 + advisory line。
- `tests/integration/t320-activation-spec-hash.integration.test.ts`: computeSpecHash 決定性/rename/復元/空集合/fail-closed、state round-trip、verdict 記録、composition 読取(corrupt 含む)、host 判定・advisory(0-plugin null / changed / current / never-run)、BR-U6-6 の advisory 経路 read-only の落ちる実証、BR-U6-2 の TLC 非起動 source-level 固定。
- `tests/integration/t321-activation-engine-seams.integration.test.ts`: engine seam 直接駆動 + handleNext/handleReport の in-process 駆動で配線行を lcov 計上、`pluginActivationHostRoot` の realpath/縮退両分岐。
- `tests/integration/t322-activation-lifecycle-behaviour.integration.test.ts`: compose 済み plugin graph 上の behavioral e2e(--single なし到達 / verdict 記録 / advisory 発火・沈黙)。

## 変更・追加ファイル一覧

正本:
- `packages/framework/core/tools/amadeus-plugin-activation.ts`(新規)
- `packages/framework/core/tools/amadeus-orchestrate.ts`(配線・export)
- `plugins/formal-model-check/stages/formal-model-check.md`、`plugins/formal-model-check/README.md`

生成物(投影):
- `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/…/tools/amadeus-plugin-activation.ts`、同 `amadeus-orchestrate.ts`
- `dist/plugins/formal-model-check/**`(stage + README、claude overlay 含む)
- self-install: `.claude/`、`.codex/`、`.cursor/`、`.kimi-code/`、`.opencode/` の各 `tools/amadeus-plugin-activation.ts` + `amadeus-orchestrate.ts`

テスト・ゲート:
- `tests/unit/t319-…`、`tests/integration/t320-… / t321-… / t322-…`(新規）
- `tests/.coverage-patch-allowlist.json`(私の挿入で行シフトした orchestrate エントリ 26 件を content 照合で再ピン。reason/file 不変、`lines` のみ更新)

## 検証(実測 — 実行コマンドと exit code を転記)

| 検証コマンド | exit code / 結果 |
|---|---|
| `bun run typecheck` | 0 |
| `bunx @biomejs/biome lint`(新規 module + orchestrate + t319-t322) | 0(新規 module 0 warning) |
| `bash tests/run-tests.sh --ci` | 0(PASS: 584 files / 0 failed / 8094 assertions) |
| `bun run dist:check` | 0(7 ハーネス全て OK) |
| `bun run promote:self:check` | 0 |
| `bun run coverage:ci` | 0(RESULT: PASS) |
| `AMADEUS_PATCH_BASE_REF=4ea02e41a bun tests/coverage-patch-gate.ts --check` | 0(PASS: added 173 / covered 173 / uncovered 0 / allowlisted 0) |

## 逸脱

宣言なき逸脱なし。`--single` は撤廃でなく任意化(既存経路不変)として実装し、FR-7(a)「`--single` なしでの到達経路」を満たす。`amadeus-state.md` と audit shard は builder 判断で未 commit のまま残置(conductor 管理面)。
