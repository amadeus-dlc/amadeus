# コード生成サマリ — u5-ci-all-models-measure

上流入力: `functional-design/`、`nfr-requirements/`、`nfr-design/`、`inception/requirements-analysis/requirements.md`、`inception/units-generation/unit-of-work.md`、`unit-of-work-story-map.md`。変更種別は Amadeus 自己開発の `self-feature`。

## 実装結果

- CI acceptance の既定対象を登録済み全モデルへ拡張し、`FormalElection` 6 回の後に `MirrorLifecycle` 6 回を逐次実行する `6 × N` 契約にした。`--model <name>` は単一モデルへの明示絞り込み、未登録名は fail-closed とした。
- `FormalElection` は既存 frozen 経路を保持し、`MirrorLifecycle` は loader が byte-pin した verified-source を固定 Docker / JDK / TLC jar で直接実行する。モデル別ディレクトリへ標準 artifact、cleanup、trace、計測統計を保存する。
- verifier はモデル名・順序、各モデル 6 回、completion marker、exit / timeout / cleanup、完全一致統計を検査する。MirrorLifecycle の pin は generated `208628`、distinct `89099`、queue `0`、depth `18`。
- diagnostic の既定も全モデルとし、skeleton は frozen の `FormalElection` のみに限定して verified-source の誤利用を明示拒否する。
- workflow は表示名と成功メッセージだけを全モデル表現へ更新した。`timeout-minutes: 30`、`permissions: contents: read`、`workflow_dispatch` 条件、run / verify コマンド行は不変。
- 正本 plugin と 8 配布面を `bun scripts/package.ts` で同期した。t406 と既存テストで runner、domain、artifact ownership、二層 port、CLI selector、diagnostic を固定した。

## ファイル所有

### 作成した正本・記録(4件)

- `tests/integration/t406-ci-all-models-measure.integration.test.ts`
- `amadeus/spaces/default/intents/260801-tla-multi-model/construction/u5-ci-all-models-measure/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260801-tla-multi-model/construction/u5-ci-all-models-measure/code-generation/code-summary.md`
- `amadeus/spaces/default/intents/260801-tla-multi-model/construction/u5-ci-all-models-measure/code-generation/e2e-evidence.json`

### 変更した正本(16件)

- CI / stage: `.github/workflows/ci.yml`、`plugins/formal-model-check/stages/formal-model-check.md`
- u5 当初所有の実装: `plugins/formal-model-check/tools/node-ci-model-check-port.ts`、`run-model-check-ci.ts`、`run-model-check-diagnostic.ts`、`run-skeleton-ci.ts`、`tla-model-loader.ts`
- **追加所有(D-U5-4) 3件**: `plugins/formal-model-check/tools/ci-model-check-runner.ts`、`ci-model-check-domain.ts`、`ci-model-check-artifacts.ts`
- 改訂テスト: `tests/integration/t-formal-verif-ci-model-check-runner.integration.test.ts`、`t-formal-verif-node-ci-model-check-port.integration.test.ts`、`t-formal-verif-run-model-check-diagnostic.integration.test.ts`、`tests/unit/t-formal-verif-ci-model-check-domain.test.ts`、`t-formal-verif-tla-model-loader.test.ts`
- **追加所有に連動して改訂したテスト**: `tests/integration/t-formal-verif-ci-model-check-artifacts.integration.test.ts`

### 生成物(72件)と統合是正(10件)

- u5 plugin 配布生成物は、neutral と `claude` / `codex` / `cursor` / `kimi` / `kiro` / `kiro-ide` / `opencode` の8面それぞれについて、`formal-model-check.md` と上記 plugin tool 8件を `dist/plugins/formal-model-check/` 以下へ生成した(8面 × 9件 = 72件)。手編集はない。
- review iteration 1 の統合是正として、u1 正本を `bun scripts/package.ts` → `bun run promote:self` の順で反映した。root 5 harness の `.claude/tools/`、`.codex/tools/`、`.cursor/tools/`、`.kimi-code/tools/`、`.opencode/tools/` それぞれで `amadeus-sensor-model-completeness.ts` を更新し、`tla-module-deps.ts` を新規配置した(5面 × 2件 = 10件)。
- functional design §11.2 が候補にした `t-formal-verif-ci-workflow.integration.test.ts` / `t-formal-verif-run-model-check.integration.test.ts` と、§11.3 の support 3件は変更していない。前2件は期待値変更なしで green、support 一般化は t406 内の scratch fixture + production runner/port seam による直接往復検査で置換した。

## TDD と実測

- 変更前 baseline: 既存関連 6 ファイル、`30 pass / 0 fail / 117 expect`。
- Red: runner がモデルを証跡化しない失敗、verified-source port が計測統計を返さない失敗を確認後に Green 化。
- review iteration 1 で、既存 t406 の「合成 evidence の outcome / completionMarker を改変するだけ」の検査は AC1 と非同等と判定した。修正後は repo 外 scratch へ `specs/tla/`(model-map を含む)をコピーし、FormalElection の `Resolve` を `prior` 固定へ、MirrorLifecycle の `CaptureBoundaryAlwaysCreates` を `FALSE` から `TRUE` へ意味論変異する。各モデルを production の `executeCiModelCheckAcceptance` → `NodeCiModelCheckPort` へ通し、注入時 `DETECTED` / `RUN_FAILURE` の red、元 bytes 復元後に単一モデル6 run・artifact verify の green、最後に bytes 完全一致を assert する。Docker/TLC subprocess だけを依存注入シームで決定化しており、runner / port / artifact 結線は実装本体を通る。
- 関連最終(review 是正後): 下記9ファイル、`45 pass / 0 fail / 206 expect`。t406 単体は `5 pass / 0 fail / 28 expect`。
- MirrorLifecycle diagnostic: Docker server `29.5.3`、exit `0`、timeout なし、残存 container `0`、`24494.361ms`。統計は pin と完全一致。
- 既定 all-model acceptance: `FormalElection × 6 → MirrorLifecycle × 6` の 12 回、verify `pass: true`、総 CLI `644215.468ms`。最大実行 `120247.522ms` で 190 秒 / run と 30 分 / workflow の両予算内、timeout 緩和なし。
- 詳細な環境、各モデルの min / max / sum、統計は `e2e-evidence.json` に保存した。

## 品質ゲート

| 検証 | 結果 |
|---|---|
| `bun test tests/integration/t406-ci-all-models-measure.integration.test.ts tests/unit/t-formal-verif-ci-model-check-domain.test.ts tests/unit/t-formal-verif-tla-model-loader.test.ts tests/integration/t-formal-verif-ci-model-check-artifacts.integration.test.ts tests/integration/t-formal-verif-ci-model-check-runner.integration.test.ts tests/integration/t-formal-verif-node-ci-model-check-port.integration.test.ts tests/integration/t-formal-verif-run-model-check-diagnostic.integration.test.ts tests/integration/t-formal-verif-ci-workflow.integration.test.ts tests/integration/t-formal-verif-run-model-check.integration.test.ts` | `45 pass / 0 fail / 206 expect`、exit `0` |
| `bun run typecheck` | exit `0` |
| `bun run lint` | exit `0`（warning 367 / info 22、error 0。review 是正で t406 の既存 warning 2件を解消） |
| `bun scripts/package.ts --check` | exit `0` |
| `bun run promote:self:check` | exit `0` |
| `bun run test:ci` | 719 files 中 3 files timeout、716 files pass |
| timeout 候補 4 ファイルを `bun test --timeout 120000` で再実行 | `129 pass / 0 fail / 1 skip` |

フルスイートの失敗数 3 は、30 秒を超えた wall-clock drift の `t-codex-hooks-migration` (`33.062s`)、`t225-upstream-v2-migration-preflight` (`35.367s`)、`t05-run-tests-parallel` (`31.317s`) の 3 ファイルと一致する。AGENTS.md の constrained VM 方針どおり 120 秒で個別再実行して全て通過したため、u5 回帰ではなく cold / 並列実行時の timeout と判定した。

## 逸脱・残リスク

- functional design にあった support probe 3 ファイルへの汎化変更は行わず、専用 t406 の決定的契約検査と実 Docker 12 回 acceptance で置換した。frozen 層への侵入を避けつつ、同じ acceptance 境界をより直接に実証する最小変更とした。
- root promotion drift 10件は正規の package / promote 経路で解消し、両 drift guard の exit `0` を確認した。
- 実 acceptance は macOS 上の固定 Docker での計測であり、GitHub hosted Ubuntu の `workflow_dispatch` 自体はこの Bolt から起動していない。最大 run のローカル余裕は約 69.8 秒、全体は約 19.3 分だが、hosted Ubuntu の CPU steal、Docker pull、cold JIT、I/O 差は未計測であり、30分以内を保証する証拠にはならない。残リスクは hosted Ubuntu 上の実 workflow 1回で `elapsedMs` と job wall time を確認するまで存続する。timeout / run 数 / 統計 pin は緩和しない。
- 非変更面の `tlc-toolchain.ts`、`fs-tlc-toolchain.ts`、`run-model-check-execution.ts`、`tla-arm.ts` は変更していない。
