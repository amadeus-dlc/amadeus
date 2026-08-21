# コード構造

## Issue #3029 に関係する構造（2026-08-18）

| 層 | ファイル | 責務 | 現行の観測 |
|---|---|---|---|
| manifest schema | `packages/framework/core/tools/amadeus-sensor-schema.ts` | `default_severity` を含む sensor manifest の解析・検証 | `advisory` / `blocking` の閉語彙を保持する |
| dispatcher | `packages/framework/core/tools/amadeus-sensor.ts` | per-sensor script の spawn、結果分類、SENSOR_* 監査行の出力 | exit 127 は `SENSOR_PASSED` + `tool-unavailable` |
| graph resolver | `packages/framework/core/tools/amadeus-graph.ts` | stage の sensor binding と severity の compiled projection | blocking severity は `sensors_applicable` に搬送 |
| completion guard | `packages/framework/core/tools/amadeus-state.ts` | fire/terminal/digest を読み stage 完了を許可・拒否 | `script-error:` のみ blocking refusal |
| plugin manifest | `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | PR report の blocking sensor 宣言 | `default_severity: blocking` |
| regression tests | `tests/unit/t511-blocking-sensor-severity.test.ts`, `tests/integration/t511-blocking-sensor-gate.integration.test.ts`, `tests/integration/t92.test.ts` | severity、completion gate、dispatcher truth table の固定 | exit 127 の pass 期待値を固定 |

この問題は dispatcher が監査イベントを生成する面と、state がそのイベントを completion predicate に射影する面の契約不一致である。Bun 不在の `spawn-failed` は dispatcher の branch 0 にあり、exit 127 の branch b と別分岐なので同一の実害例として扱わない。

## Focus Area: undefined 形の回帰テストが要求するシーム（260814-ambient-error-sink、履歴、observed `6e94189de`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

対象: [Issue #3004](https://github.com/amadeus-dlc/amadeus/issues/3004)。測定 ref = observed `6e94189dec9e8e2bd0aaeb53bcff7cf9cba27440`。本節は**落ちる実証を成立させるために必要なテスト構造**を記録する（テストの設計自体は build-and-test / code-generation の所掌）。

### 層の制約 — 新設回帰テストは `tests/integration/` 配下

`tests/unit/` は filesystem を触る medium test を許さない。`tests/integration/t481-resolve-project-dir-worktree-marker.test.ts:4-9` が逐語で理由を宣言している:

> `Placed under tests/integration/ (not tests/unit/) because it builds a real on-disk worktree layout and switches cwd — a filesystem touch classifies the test as size "medium", which the layer×size purity gate forbids in tests/unit/.`

本 Issue の回帰テストは fixture プロジェクトと監査シャードを実ディスク上に作るため、**integration 層が唯一の置き場**である。

### 系統 A: env 段（ラダー rung 2）の undefined 形 — chdir 不要、`t258` の直系の双子

必要な fixture 要素はすべて既存にある。

| 要素 | 出所 | 役割 |
|---|---|---|
| `resetOtelPerProject()` | `tests/harness/otel-reset.ts` | dist と core の**両グラフ**をリセット（冒頭 `:11-15` が「BOTH SURFACES」の根拠を宣言）。beforeEach / afterEach で |
| argv 中和 | `t258:56 process.argv = ["bun", "amadeus-orchestrate.ts", "report"];` | これがないと bun テストランナーの引数を argv 段が拾いうる。`t258:53-55` の理由コメント逐語: `the bug's whole point is that an in-process driver has none` |
| `createTestProject()` × 2 | `tests/harness/fixtures.ts` | ambient 役と、汚染されてはならない側 |
| `seedStateFile(p, "state-init-active.md")` | 同上 | `amadeus-orchestrate.ts:958` の `existsSync(stateFilePath(pd))` ガードを通すため必須 |
| `seededAuditDir` / `auditShardsOf` | `t258:77-81` | shard 件数の観測 |
| `console.log` 抑制 | `t258:87-95`（`driveReportError`） | directive 出力の握り潰し |

形: `CLAUDE_PROJECT_DIR = ambient` を張り `handleReport(["--result","__not_a_verdict__"], undefined)` を駆動 → **修正前は `ambient` に shard 1 件（落ちる実証）**、修正後は `auditShardsOf(ambient)` が空かつ拒否 directive が出る。

### 系統 B: marker 段（ラダー rung 3）の undefined 形 — chdir 必須

`hasWorkspaceMarker`（`packages/framework/core/tools/amadeus-lib.ts:303-306`、逐語）:

```ts
function hasWorkspaceMarker(dir: string): boolean {
  if (!isDir(join(dir, "amadeus"))) return false;
  return KNOWN_HARNESS_DIRS.some((h) => isDir(join(dir, h, "tools")));
}
```

**`createTestProject()` は harness marker を作らない**（`seedWorkspaceShell` は `amadeus/` 配下しか作らず `.claude/tools` を作らない）。marker 段を踏ませるには `<root>/amadeus/` と `<root>/.claude/tools/` の**両方**が要る。既存 idiom は `t481:43-54` の `makeWorktreeFixture`（`mkdirSync(join(mainDir,"amadeus"))` + `mkdirSync(join(mainDir,".claude","tools"))`、`realpathSync` で macOS の `/var → /private/var` を吸収）と、`process.chdir` の save / restore（`t481:60-73`）。

`process.chdir` を使うテストは **4 ファイル**（述語 `grep -rl "process.chdir" tests/`、Architect 実測）: `tests/integration/t230-hook-project-dir-opencode-cursor-marker.test.ts` / `t268-election-default-project-dir.integration.test.ts` / `t481-resolve-project-dir-worktree-marker.test.ts` / `t487-stage-stats.integration.test.ts`。（Developer scan は「7 ファイル」と記すが、同一述語の再実測では 4 ファイル。件数は本再実測を正とする。）

### 系統 C: テスト自身の安全性 — 実 record 汚染の遮断

`t258` が示すとおり、最低条件は **(1) `CLAUDE_PROJECT_DIR` を fixture へ固定 / (2) argv 中和 / (3) OTel リセット** の 3 点セット。系統 B では cwd も fixture へ移すため、`afterEach` 側に `process.chdir(originalCwd)` を置いて**失敗時にも必ず通る配置**にすること（`t481:68-73` の形）。この 3 点セットを欠いたまま undefined 形を駆動すると、テスト自身が本 Issue の欠陥を踏んで実 record へ書き込む。

## Focus Area: テスト基盤の `dist/` 依存と env 伝播（260814-t528-ambient-isolation、履歴、observed `5f6b5bf97`）

対象: [Issue #2981](https://github.com/amadeus-dlc/amadeus/issues/2981)。測定 ref = observed `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`。本 intent の患部はモジュール配置の変化ではなく**テストハーネスが依存する外部前提の構造**にある。

### 患部ファイルと役割

| ファイル | 分類 | 本 intent での役割 |
|---|---|---|
| `tests/integration/t528-report-ack-kind.integration.test.ts` | 患部テスト（6 テスト） | `:124` が `handleReport(…, undefined)`、`:46-54` が `STOCK_GRAPH` を `dist/` へ向ける |
| `tests/harness/fixtures.ts` | テストハーネス正本 | `AMADEUS_SRC`（`:59`）/ `AMADEUS_MEMORY_SRC`（`:93`）が `dist/` 依存、`resetAidlcEnv`（`:103-105`）の清掃範囲 |
| `tests/run-tests.ts` | 実体ランナー | `:645-650` が子プロセス env を構成し開発者シェルの変数を伝播 |
| `tests/run-tests.sh` | 16 行の薄いラッパ | `exec bun "$SCRIPT_DIR/run-tests.ts" "$@"` するのみ |
| `packages/framework/core/tools/amadeus-lib.ts` | 解決ラダー正本 | `resolveProjectDir`（`:232-269`）/ `loadStageGraph`（`:6954-6967`）/ `stageGraphPath`（`:6923-6924`） |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | ハンドラ正本 | `handleReport`（`:5848-6338`）/ `recordEngineError`（`:941-968`） |

区間 `89532174c..HEAD` でこれらのうち差分があるのは `amadeus-orchestrate.ts` のみ（+30 / −6、単一コミット `86feb2ee5` #2980）で、**患部行の変更は 0 件**（`git diff … | grep -c "^[+-].*\(resolveProjectDir\|runsQualityRepair\|failureAdmission\|handleStageFailureReport\)"` = 0）。モジュール移動・新規ファイルはない。

### テストハーネスの外部前提（3 層）

```
tests/run-tests.sh  ──exec──▶  tests/run-tests.ts
                                   │
                                   ├─ 子プロセス env（:645-650）
                                   │    { ...process.env, AMADEUS_TEST_NAME,
                                   │      AMADEUS_SKIP_ARTIFACT_GUARD: "1",
                                   │      AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" }
                                   │    → 開発者シェルの CLAUDE_PROJECT_DIR がそのまま全テストへ伝播
                                   │
                                   └─ runFilesPartitioned（:817、runTier :811）
                                        → integration tier はファイル単位で並行実行
                                          （.serial. を含むファイル名のみ直列。t528 は並行帯）
                                   
tests/harness/fixtures.ts
   ├─ 追跡ファイル依存: FIXTURES_DIR = <REPO_ROOT>/tests/fixtures（:94）── worktree 隔離に強い
   └─ dist/ 依存:       AMADEUS_SRC        = <REPO_ROOT>/dist/claude/.claude（:59）
                        AMADEUS_MEMORY_SRC = <REPO_ROOT>/dist/claude/amadeus（:93）
                        （各テストの STOCK_GRAPH も同じ dist/ ツリーを指す）
                        ── gitignore 対象のため新規 worktree では bun run build が前提
```

テキストフォールバック: `run-tests.sh` は `run-tests.ts` を exec するだけの薄いラッパ。`run-tests.ts` は (a) 子プロセス env を `process.env` の spread で構成するため開発者シェルの変数が全テストへ伝播し、(b) integration tier をファイル単位で並行実行する。`fixtures.ts` の依存は 2 系統に分かれ、`FIXTURES_DIR` は追跡ファイルなので worktree 隔離の影響を受けないが、`AMADEUS_SRC` / `AMADEUS_MEMORY_SRC` と各テストの `STOCK_GRAPH` は gitignore 対象の `dist/` を指すため `bun run build` の実行を前提とする。

### `dist/` 依存クラスの規模（実測、測定 ref = observed）

| 述語（再実行可能） | 結果 |
|---|---|
| `git grep -ln '"stage-graph.json"' -- 'tests/**/*.test.ts' \| xargs git grep -ln '"dist"'` | 45 files |
| `git grep -ln "AMADEUS_SRC\|AMADEUS_MEMORY_SRC" -- 'tests/**/*.test.ts'` | 182 files |
| `git grep -ln "setupIntegrationProject" -- 'tests/**/*.test.ts'` | 84 files |
| 和集合 | **278 files** |
| 母数 `git ls-files 'tests/**/*.test.ts' \| wc -l` | 1102 files |

**テストファイルの約 25% が同一の外部前提（`dist/` の実在）を共有する。** t528 はこのクラスの 1 例にすぎない。`git check-ignore -v dist` → `/Users/j5ik2o/.config/git/ignore:31:dist/`（exit 0）。

### fixture のライフサイクル（構造）

`createTestProject()`（`fixtures.ts:125-137`）は `TMPDIR` 配下に `amadeus-test-` prefix で `mkdtempSync` → `realpathSync` で正規化（macOS の `/tmp` → `/private/tmp` を吸収）→ `seedWorkspaceShell` で workspace shell を植える。`.claude/` や `dist` の memory ツリーはコピーせず、それは `setupIntegrationProject`（`:765`）の役割である。後片付けは `cleanupTestProject`（`:406-408`）→ `removeTreeWithRetry`（`:574`〜）で、事後条件（パスが消えたこと）により成功を判定する再試行付き削除。

## Focus Area: team-up ランチャ廃止（260813-remove-team-up、履歴、observed `97581b3e3`）

| ファイル | 分類 |
|---|---|
| `packages/framework/core/tools/team-up.sh` | 正本ランチャ（bash） |
| `packages/framework/core/tools/team-up-codex-safety-wait.ts` | ランチャ専用 supervisor |
| `packages/framework/harness/*/manifest.ts` `coreDirs.tools` | 8 harness への無条件投影 |
| `docs/guide/20-team-mode.md` 対訳 | ユーザー向け起動手順 |
| `tests/**/*team-up*` ほか `t266` `t267` `t226` | 検証 |

区間 `854692fd7..HEAD` でこれらのパスに差分は無い。モジュール移動も無し。変更は「残置か削除か」であり配置そのものは base と同一。

## Repository Organization

| パス | 分類 | 責務 |
|---|---|---|
| `packages/framework/core/` | 正本 core | stage graph、orchestration、state/audit、protocol、sensor、共通知識 |
| `packages/framework/harness/<name>/` | host adapter | claude、codex、cursor、kimi、kiro、kiro-ide、opencode、pi 向け投影 |
| `plugins/github-pr-convergence/` | plugin bundle | stage、sensor、GitHub adapter、predicate、ledger、CLI |
| `plugins/coverage-patch-quick/` | plugin bundle（tool-only、`stages: []`） | push 前 patch coverage の advisory 判定 CLI |
| `plugins/formal-model-check/` | plugin bundle | TLA+ モデルと実装の identity 検査 stage / sensor |
| `plugins/git-drift/` | plugin bundle（tool-only、`stages: []`） | origin drift の早期 advisory sensor |
| `scripts/` | build/distribution | `dist/<harness>/` 生成、self promotion、distribution verification |
| `tests/` | verification | smoke、unit、integration、e2e、conformance、formal-verif、fixtures |
| `amadeus/spaces/` | workflow records | Intent state、audit、stage artifacts、共有 CodeKB |
| `.codex/` など | self-install surface | harness ごとのローカル生成・bootstrap 面 |

## Focus Area: PR Convergence

| ファイル | 主な要素 |
|---|---|
| `amadeus/config.json` | plugin activation と4 self-* scope binding |
| `plugins/github-pr-convergence/plugin.json` | stage bundle、code-generation produces seam、tool inventory |
| `plugins/github-pr-convergence/stages/pr-convergence.md` | convergence loop と手動 sensor fire の運用契約 |
| `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` | `create/status/report/override` dispatcher、report renderer/writer |
| `plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts` | `gh` process adapter、GraphQL snapshot parser |
| `plugins/github-pr-convergence/tools/pr-convergence-predicate.ts` | merge/lifecycle/convergence の純粋判定 |
| `plugins/github-pr-convergence/tools/pr-convergence-ledger.ts` | paged review thread の分類と集計 |
| `plugins/github-pr-convergence/tools/pr-convergence-provenance.ts` | PR title/body の Intent/Bolt/Unit provenance 検証 |
| `plugins/github-pr-convergence/tools/pr-convergence-presentation.ts` | canonical PR title/body の生成 |
| `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | report shape の独立 parser |
| `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | advisory sensor manifest |
| `packages/framework/core/tools/amadeus-graph.ts` | plugin scope binding の additive overlay |
| `packages/framework/core/tools/amadeus-plugin.ts` | plugin compose/drop と stage seam materialization |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | per-unit required artifact coverage と approval routing |
| `packages/framework/core/tools/amadeus-state.ts` | direct completion chokepoint、artifact/sensor guard |

## Code Patterns

- TypeScript ESM、Bun 直接実行。
- external process は shell 文字列ではなく argv 配列で spawn する。
- I/O adapter と純粋判定を分離し、テストでは seams を injection する。
- CLI は discriminated union の outcome と固定 exit code を返す。
- stage metadata は Markdown frontmatter、scope plan は compiled JSON、plugin contribution は additive seam で表す。
- generated `dist/` と self-install tree は source of truth ではなく disposable output とする。

## Change Surface for Issue #2838

必須変更は単一ファイルに閉じない。

1. plugin report schema/writer に attestation を追加する。
2. attestation の検証 owner を sensor または core completion boundary に設ける。
3. sensor manifest/stage wiring を blocking にする。
4. `create` 前提検査を Git adapter と CLI に追加する。
5. direct state artifact guard を required-all semantics へ揃える。
6. scope/harness/compose/drop/resume/completion を横断する integration tests を追加する。

既存の core/plugin 非依存方向を守るには、core が plugin-specific Markdown schema を直接 import するのではなく、plugin が発行した汎用 receipt を core の既存 audit/artifact contract で検証する形が最も境界整合的である。これは設計候補であり、最終決定は後続 stage の所掌とする。
## 差分リフレッシュで観測した構造変化（260813-advisory-requestion-fix、履歴、observed `c0f9edf27`）

**観測 ref**: base `854692fd7a11b124236b0427fe3d59e2fe6bf785` → observed `c0f9edf27828def6fa3dbbbc4101d753b398e025`（33 コミット / 224 ファイル、`git log --oneline 854692fd7..c0f9edf27 | wc -l` / `git diff --name-only 854692fd7..c0f9edf27 | wc -l`。総行数 +23703 / −9416、`git diff --stat … | tail -1`）。

領域分類（ファイル数、同 `--name-only` 出力の分類）: 工程記録 109 / tests 54 / codekb 12 / core/tools 9 / plugins/pr-convergence 8 / plugins/formal-model-check 5 / specs 4 / plugins/coverage-patch-quick（新規）3 / docs 3 / memory 2 / .github 2 / その他（scripts, harness/codex, core/otel, core/knowledge, mise.toml, amadeus/config.json, .agents/rules, metrics）6。

| 変化 | 所在 | 内容 |
|---|---|---|
| 新規プラグイン | `plugins/coverage-patch-quick/` | tool-only（`stages: []`）。CLI +509 + README + `plugin.json`（#2965） |
| pr-convergence 拡張 | `plugins/pr-convergence/tools/pr-convergence-attestation.ts`（+133、新規）/ `pr-convergence-git-runner.ts`（+190、新規）/ `pr-convergence-cli.ts`（+569） | #2932 / #2942 / #2948 / #2957–#2960 |
| テスト面の新規ツール | `tests/allowlist-semantic-audit.ts`（+259、新規） | coverage 免除台帳の意味的監査（#2902 / #2938 / #2939） |
| ノルム蒸留 | `amadeus/spaces/default/memory/team.md` / `project.md` | 原理原則への縮約（#2919）と pin テスト同期（#2922） |

本 intent の患部（[Issue #2967](https://github.com/amadeus-dlc/amadeus/issues/2967)）はモジュール配置ではなく既存 3 ファイル（`amadeus-advisory-choice.ts` / `amadeus-orchestrate.ts` / `amadeus-directive.ts`）間の関係にあり、`amadeus-advisory-choice.ts` は本区間で**無変更**である（`git diff --name-only 854692fd7..c0f9edf27 -- packages/framework/core/tools/amadeus-advisory-choice.ts` が空出力）。
## Issue #2813 の患部配置（履歴、observed `c0f9edf2782`）

| パス | 現在の責務 | 多問化で変わる面 |
|---|---|---|
| `packages/framework/core/tools/amadeus-election-model.ts` | `Election` / `Ballot` / distribution / resolution / tally の純粋モデル | stable question ID、question 別 choices/response/tally、mixed result、established preservation |
| `packages/framework/core/tools/amadeus-election-store.ts` | election/ledger/pending/tally/registry の filesystem 永続化 | legacy/new decoder、canonical write、voter file の response 配列、global status と問結果の分離 |
| `packages/framework/core/tools/amadeus-election-record.ts` | ruling、GoA line、留保、timeline の deterministic render/verify | question 別 ruling/GoA/reservation、順序、完全性検証 |
| `packages/framework/core/tools/amadeus-election-transport.ts` | agmsg/subagent の通知 port | per-voter view の複数問化。通知 API 自体は原則維持可能 |
| `packages/framework/core/tools/amadeus-election.ts` | 9 verb、directive loop、hold resolution、render/verify | held question IDs、held-only rerun、mixed output、typed tally parse |
| `packages/framework/core/skills/amadeus-election/SKILL.md` | CLI 指令の薄い転送手順 | definition/ballot vocabulary と複数 hold 問の転送手順 |
| `scripts/amadeus-election-migrate.ts` | 旧 direct-path 選挙の承認付き directory/registry migration | schema 一括変換ではなく dual-read fidelity の検証面 |
| `amadeus/spaces/default/specs/tla/FormalElection.{tla,cfg}` | 単問の票受付・集計・hold を有限状態探索 | question 一意性、voter×question 解決、mixed、held-only transition、不変な established result |
| `amadeus/spaces/default/specs/tla/model-map.json` | spec/cfg と5実装面の identity binding | spec と実装変更後の identity 同期 |
| `tests/helpers/arbitraries/election.ts` | 単問 Election/ElectionFile の妥当・不正 arbitrary | 複数問、ID 一意性、legacy/new round-trip arbitrary |

テスト面は、選挙に直接関係する既存21ファイル（unit 7、integration 13、e2e 1）に分散する。中心は model/record/transport/choice-resolution/PBT、store/loop/executor/skill/tie/registry/resolver/migration/pending/receipt、walking-skeleton である。形式モデルの completeness/model-map テストはこの21件とは別に広い formal-model-check suite と結合する。

実装順の依存は `canonical model + legacy decoder` → `question tally + mixed/preservation` → `store/CLI/directive/record/skill/transport` → `migration/TLA/model-map/norm` → `build/test/CI` である。generated `dist/` と self-install surface は編集元にせず、正本変更後に build で同期する。

## Issue #2985 の患部配置（履歴、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

| パス | 責務 | #2985 との関係 |
|---|---|---|
| `plugins/pr-convergence/plugin.json` | `code-generation` への report / sensor overlay | 全 Unit に同じ artifact 種別を要求する入口 |
| `plugins/pr-convergence/stages/pr-convergence.md` | one-Bolt-one-PR の運用契約 | 複数 Unit fold を明示的に禁止 |
| `plugins/pr-convergence/tools/pr-convergence-cli.ts` | create/status/report/override lifecycle | `unit`、`DeliveryWork`、PR identity が単数 |
| `plugins/pr-convergence/tools/pr-convergence-provenance.ts` | title/body の検査 | Bolt / Unit が各1件。既存 PR の不一致を拒否 |
| `plugins/pr-convergence/tools/pr-convergence-attestation.ts` | report digest と delivery identity | Bolt / Unit / PR / heads / digest が各1件 |
| `plugins/pr-convergence/tools/pr-convergence-git-runner.ts` | checkout と local/remote head 検証 | Unit worktree の current head を拘束 |
| `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts` | PR head/title/body/check/review 取得 | 1 PR summary を返す |
| `plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | blocking report 検査 | owner path Unit と attestation Unit を一致させる |
| `packages/framework/core/tools/amadeus-runtime.ts` | unit dependency DAG compile | Delivery Bolt ではなく topological batch を生成 |
| `packages/framework/core/tools/amadeus-orchestrate.ts` | per-unit coverage と batch dispatch | Unit artifact を実行済み ledger とする |
| `packages/framework/core/tools/amadeus-state.ts` | artifact / sensor completion guard | 全 Unit path の evidence を検査 |

新規 package やファイル移動は観測されない。欠陥は既存モジュール間で `Delivery Bolt → units[] → one PR identity → per-unit evidence` を表す型・永続化・投影が欠けている関係上の seam である。`amadeus-state.ts` と `amadeus-orchestrate.ts` は巨大なホットスポットだが、今回の RE はリファクタをスコープに含めない。

## 260814-unit-failure-autoelectio (2026-08-14, observed `cd64486a6`) — Issue #2976 の変更面

### 患部ファイルと責務

| パス | 本 intent での役割 | 主要位置（HEAD 断面） |
|---|---|---|
| `packages/framework/core/tools/amadeus-orchestrate.ts` | 無条件 ask の発生源。修正の主着地面 | `:4027` `emitConstructionFailureIfPresent` / `:4069-4075` await-unit-ruling 分岐 / `:1042-1044` `askDirective` / `:241` config import / `:632`（3 引数）`:3940`（1 引数）config 呼出 / `:3694` `:3737` 呼び出し元 / `:6161-6169` report 受け口 / `:6507` `handleFailureRuling` / `:6973` サブコマンド動線 / `:3922-3936` `canonicalConstructionFailurePending` |
| `packages/framework/core/tools/amadeus-election.ts` | `--trigger auto` の受け口。config を読む唯一の実装 | `:443-463` `handleTriggeredOpen` / `:459` `soloElection.trigger.mode` 読取 / `:402-434` `handleOpen` / `:413-414` `GoaLineCode.parse` / `:137` `next` / `:186` `handleReport` / `:483` 付近 `handleNotify` / `:805` ディスパッチ / `:66` usage |
| `packages/framework/core/tools/amadeus-election-model.ts` | election definition のスキーマ | `:100-116` `Election.parse` / `:76-97` choices 検証 / `:107-108` voters 検証 |
| `packages/framework/core/tools/amadeus-config.ts` | `solo-election.trigger.mode` の宣言と解決 | `:94` 型宣言 / `:563-574` スキーマ定義 / `:771-775` 解決 |
| `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | halt-and-ask 契約と solo auto-election hook | `:139` `**Halt-and-ask on failure**` / `:141` 無条件 halt の逐語 / `:143-147` solo/parallel/retry/skip/abort / `:149` hook 見出し / `:151` branch 1 / `:152` branch 2 / `:156-166` question fenced block |
| `packages/framework/core/skills/amadeus-election/SKILL.md` | voters 規約（`subagent-1` / `subagent-2`） | `:28` |

### テスト面の位置

| パス | 射程 |
|---|---|
| `tests/unit/t211-swarm-batch-progress.test.ts` | `:326-333` ask 文言の固定（`Retry, Skip, or Abort`）/ `:395` error 側の同文言 / `:239-280` `seedFailedSwarmUnit` |
| `tests/integration/t369-protocol-autosolo-hook.test.ts` | `:88-92` `findMissingHookMarker` / `:96` `:106` `:114` `:124` `:134` の 5 件 + `:178` `:197` `:211` の fixture 系 3 件 |
| `tests/integration/t236-election-loop.integration.test.ts` | `:71-135` `open --trigger auto` の 4 段階 CLI 契約 / `:117-` invalid config |

### 投影の連鎖（修正時に同期が要る面）

`stage-protocol.md` を触る修正は、t369 が `packages/framework/core/amadeus-common/`・`dist/<harness>/amadeus-common/`・self-install ツリーの各 `stage-protocol.md` / `conductor.md` を走査するため、`bun run build` による全ハーネス投影の再生成を同一変更に含めないと赤になる。`packages/framework/core/tools/` 側のみを触る修正では、同じ理由から dist 再生成が必要になる（`project.md` § Mandated の正本・配布物・self-install 同期則）。

### base..observed で構造は動いていない

base `d7ffaa544` → observed `cd64486a6` の 4 コミットは `packages/` を 1 行も変更していない。したがって上表の構造は前回スキャン断面から不変であり、クロスレビュー target-sha `52f1f1b25` 以後に患部 4 ファイルへ触れたのは `d7ffaa544`（Bolt PR attestation、`amadeus-orchestrate.ts` のみ 167 insertions / 8 deletions）の 1 件だけである。分岐構造は保たれ、行番号のみ移動した（クロスレビュー時の `:4063-4068` → HEAD `:4069-4075`）。

## Focus Area: オープンバグ5件の患部配置（260814-open-bug-batch-6、履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

### 本区間で動いた構造 — プラグイン rename

`plugins/pr-convergence/` は `plugins/github-pr-convergence/` へ rename された（PR #3051、コミット `a4196f191`）。ツール 9 件は `R100`（内容バイト一致）であり**行番号は不変**、変わったのは配置パスと `plugin.json` の `name` のみ。**stage slug は `pr-convergence` のまま**である。

`plugins/` 直下の現行構成（`ls plugins/` の転記）: `coverage-patch-quick` / `formal-model-check` / `git-drift` / `github-pr-convergence` の 4 プラグイン。`git-drift` は本区間の新設（PR #3055）。

### 患部ファイルと役割

| Issue | 患部 | 役割 |
| --- | --- | --- |
| #3062 | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts` | `landed` 拒否ガード 3 層（`:823` `writeSelfReport` / `:1260` `reportOutcome` / `:1364` `runConvergence`） |
| #3062 | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | `:368-372` landed の stage 非依存拒否、`:378-380` created の stage 条件付き拒否 |
| #3062 | `plugins/github-pr-convergence/tools/pr-convergence-predicate.ts` | `:262` verdict 三値、`:281` `landedVerdict` |
| #3026 | `plugins/formal-model-check/plugin.json` | `sensors` キーが不在（トップレベルは `name` / `stages` / `seams` / `fragments` / `tools` / `advisories` の 6 キー） |
| #3026 | `packages/framework/core/tools/amadeus-plugin-compose.ts` | `:361` `parseSensors`、`:554` / `:956` / `:992` / `:1023` の `?? []` フォールバック（無音化の機構） |
| #3028 | `docs/harness-engineering/06-sensors.md` / `.ja.md` | 固定 10 行のセンサー表（`:63-72`） |
| #3031 | `tests/integration/t-worktree-gc.test.ts` | `:14-27` git ヘルパ（retry 追加済み）、`:172-188` 対象テスト、`:180` 失敗点の `worktree add --detach` |
| #3032 | `tests/unit/t214-engine-error-logged-seam.test.ts` | `:131` / `:158` の呼出行（着地リテラルの一意帰属先） |
| #3032 | `packages/framework/core/tools/amadeus-lib.ts` | `:8066` `emitErrorAuditRow`、`:8087` `emitError`、`:8102-8105` の握り潰し catch |
| #3032 | `packages/framework/core/otel/audit-emit.ts` / `otel/bootstrap.ts` | `:48` `emitAuditEvent` → `:88` `ensureOtelBootstrap` → `:45` `assertSameProject` |

### 層の制約

- #3026 の是正面は `plugins/formal-model-check/plugin.json` のデータ（宣言）であり、`amadeus-plugin-compose.ts` のコード変更は「不一致を検出する検査」を新設する場合にのみ発生する（Issue 受け入れ条件 3 の判定次第）
- #3028 の是正面は docs 2 言語。件数フリー契約へ書き換える場合は docs を読むテスト側も射程に入る
- #3031 の患部はテスト自身であり本番コードに非接触
- #3032 は現行断面の読解では機序が確定しないため、患部の確定自体が調査の成果物になる

### 行番号 drift の記録

Issue #3031 は `:160-175` / `:169` を引くが、observed 断面では対象テストが `:172-188`、失敗点が `:180`。本区間の PR #3056 が git ヘルパへ 12 行追加したことによる drift である。

## 差分リフレッシュで観測した構造変化（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`（23 コミット、`git rev-list --count 1d08374cd..HEAD`。185 files / +14769 −6942、`git diff --stat 1d08374cd HEAD -- ':!amadeus/'`）。

### プラグイン配置（4 プラグイン）

`ls plugins/` は 4 ディレクトリを返し、`amadeus/config.json` の `plugin.activation.names` も同じ 4 要素（順序一致）である。

| パス | 形態 | 責務 |
|---|---|---|
| `plugins/coverage-patch-quick/` | tool-only（`stages: []`） | push 前 patch coverage の advisory 判定 CLI |
| `plugins/formal-model-check/` | stage + sensor | TLA+ モデルと実装の identity 検査 |
| `plugins/git-drift/` | tool-only（`stages: []`） | origin drift の早期 advisory sensor（新規、PR #3055） |
| `plugins/github-pr-convergence/` | stage + sensor | PR 収束ループ（旧 `plugins/pr-convergence/` から rename、PR #3051） |

**rename の性質**（PR #3051）: `plugins/pr-convergence/` → `plugins/github-pr-convergence/` の 13 ファイルまるごとの移動（`git diff --name-status -M` が `R080`〜`R100`）。ツール内のファイル名（`pr-convergence-cli.ts` ほか）とディレクトリ内構造は不変で、変わったのは第 1 階層のディレクトリ名だけである。

**`plugins/git-drift/` の内訳**（`git ls-files plugins/git-drift` = 4 ファイル）: `plugin.json` / `sensors/amadeus-git-drift.md` / `tools/amadeus-sensor-git-drift.ts` / `tools/git-drift-detect.ts`。`plugin.json` は `code-generation` と `build-and-test` の `sensors` seam に `git-drift` を追加し、`settings` に `fetch-throttle-seconds`（number、default 600）を 1 件宣言する。

### 選挙サブシステムの再配置（PR #3036）

正本側（`packages/framework/core/tools/`、実測は `wc -l`）:

| ファイル | 行数 | 本区間での変化 |
|---|---|---|
| `amadeus-election-codec.ts` | 908 | **新規**。schemaVersion 2 の canonical schema（definition / ballot / tally）と legacy decoder |
| `amadeus-election-store.ts` | 1232 | 改修。election / ledger / pending / tally / registry の永続化 |
| `amadeus-election.ts` | 804 | 改修。9 verb（`open` / `next` / `status` / `vote` / `notify` / `tally` / `render` / `verify` / `report`）と directive loop |
| `amadeus-election-record.ts` | 651 | 改修。question 別 ruling / GoA / 留保 / timeline の render・verify |
| `amadeus-election-question-tally.ts` | 386 | **新規**。voter×question 解決、遅延回答分類、early tally 可否、lifecycle 導出 |
| `amadeus-election-transport.ts` | 301 | 改修。agmsg / subagent の通知 port |
| `amadeus-election-model.ts` | 32 | **縮小**。`Result` / `ok` / `err` / `VoterKind` / `HoldReason` だけの共有語彙。データモデルは codec へ移動 |

`scripts/amadeus-election-migrate.ts` は削除された（`git diff --name-status -M 1d08374cd HEAD` が `D`）。

**テスト面の再計数**: 選挙に直接関係するテストファイルは **30 件（unit 9 / integration 20 / e2e 1）**。述語は `git ls-files 'tests/**' | grep -E '/[^/]*election' | grep -vE 'selection'`（基底名に `election` を含み、`selection` の部分一致を除外する。除外により落ちるのは `tests/integration/t415-plugin-optin-selection.integration.test.ts` と `tests/unit/t171-intent-selection.test.ts` の 2 件で、いずれも選挙とは無関係）。層別の内訳は同出力を `tests/<layer>/` 前置で `grep -c` した値である。

前区間の「既存 21 ファイル（unit 7、integration 13、e2e 1）」は失効している。本区間の増減（`git diff --name-status -M 1d08374cd HEAD -- 'tests/**'` から転記）は削除 8 件（`tests/unit/t234-election-model` / `t238-election-record` / `t244-election-choice-resolution` / `t262-elections-migration` / `t416-election-model-roundtrip.pbt`、`tests/integration/t244-election-tie-choice` / `t262-elections-migration`、`tests/helpers/arbitraries/election.ts`）、新規 13 件（unit 6 = `t547` / `t548` / `t549` / `t550` / `t551` / `t552`、integration 7 = `t549-election-v2-store` / `t553` / `t554` / `t555` / `t557` / `t558` / `t559`）である。なお前区間の 21 という値は述語が記録されていないため、30 との差は実際の増減と述語差の合成であり、単純な増分としては読めない。

### plugin.settings（PR #3052）

`packages/framework/core/tools/amadeus-plugin-settings.ts`（274 行、新規）が宣言の parse と解決を持つ。配置上の要点は、**plugin は core を import しない**（ADR-6）境界を保ったまま設定を渡すために、解決を core 側の 1 点に閉じ、結果を process boundary で sensor スクリプトへ手渡す形にしたことである。消費側は `amadeus-sensor.ts:291` の `resolvePluginSettingsForSensor` と `amadeus-plugin-compose.ts:362-363`（compose 時の宣言検査）。

### 本 intent の患部 4 件の所在

いずれもモジュール移動ではなく既存ファイル内の欠陥であり、本区間でこれらのファイルに構造変化はない。

| Issue | 患部ファイル |
|---|---|
| #3065 | `scripts/no-silent-drop-evidence-adapter.ts`（`systemCommandRunner` :62-76、NUL 終端ガード :166-172）/ `packages/framework/core/tools/amadeus-migrate.ts`（`git()` :439-455）。検証面は `tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts` と `tests/integration/t224-upstream-v2-migration-cli.test.ts` |
| #3034 | `tests/integration/t2851-doctor-self-install-freshness.serial.test.ts`（`repositoryCheckFixture` :78-87）/ `packages/framework/core/tools/amadeus-utility.ts`（`selfInstallProjectionDoctorChecks` :1589-1602、`isSelfDevWorkspace` :1017-1019）/ `scripts/promote-self.ts`（`REPO_ROOT` :57） |
| #3040 | `tests/integration/t-pi-child-driver.integration.test.ts`（:177-185）/ `packages/framework/harness/pi/drivers/amadeus-pi-driver.ts`（:541-558、`CLEANUP_WAIT_MS` :30）/ `amadeus-pi-guardian.ts`（:82-87、:321）/ `tests/fixtures/pi-driver/fake-pi.ts:60` |
| #3035 | `tests/unit/t07-hook-audit-logger.serial.test.ts`（:401-406）。Issue 本文の `:395-400` から 6 行ずれている（`05da1758c` が `amadeus-plugin-settings.ts` の fixture コピー 6 行を追加、`git show --numstat 05da1758c -- <file>` → `6 0`） |

## 差分リフレッシュで観測した構造変化（260815-priority-bug-batch-2、履歴、observed `9ba8170bb`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-per-unit-outcome の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `a49f9e9fdbd19fd40e9374feba77e9360771d173` → observed `9ba8170bb03996fb98b497cfcbac3d207795018d`（9 コミット、`git rev-list --count a49f9e9fd..HEAD`。10 files / +332 −67、`git diff --stat a49f9e9fd HEAD -- ':!amadeus/' ':!metrics/'`）。

**構造変化は実質ゼロである。** パッケージ境界（`packages/framework/core/` / `packages/framework/harness/<name>/`）、エンジン、state 機械、プラグイン集合（4 プラグイン）はいずれも無変更で、9 コミットのうち非 `amadeus/` の実体を動かしたのは PR #3076（test-signal バグ 4 件の修正）と PR #3072（autonomy 修正）の 2 本だけである。残る 7 コミットは record / RFC / metrics / ノルム文書に閉じる。

### 区間で動いた 10 ファイル（`git diff --numstat` からの転記）

| ファイル | ± | 役割 |
|---|---|---|
| `packages/framework/core/tools/amadeus-migrate-git.ts` | **+32 / −0（新規）** | migrate の git spawn 判定を単独モジュールへ切り出し |
| `packages/framework/core/tools/amadeus-migrate.ts` | +2 / −5 | `git()`（`:452`）が判定を新モジュールへ委譲。`:32` で `normalizeGitOutcome` を import |
| `scripts/no-silent-drop-evidence-adapter.ts` | +17 / −1 | `git ls-tree` の部分読みに対するリトライ |
| `packages/framework/harness/pi/drivers/amadeus-pi-driver.ts` | +4 / −0 | settled child の判定 |
| `tests/fixtures/pi-driver/fake-pi.ts` | +10 / −2 | 上記に対応する fixture |
| `tests/unit/t07-hook-audit-logger.serial.test.ts` | +24 / −15 | 壁時計予算 2 件の撤去（#3035 の着地） |
| `tests/integration/t2851-doctor-self-install-freshness.serial.test.ts` | +91 / −44 | clean-checkout ゲート（#3034 の着地） |
| `tests/integration/t226-migration-routing-in-process.test.ts` | +75 / −0 | `normalizeGitOutcome` の直接検証（`:22` で import） |
| `tests/integration/t499-no-silent-drop-spawn-failclosed.integration.test.ts` | +58 / −0 | spawn fail-closed の固定 |
| `tests/integration/t-pi-child-driver.integration.test.ts` | +19 / −0 | settled child ケース（#3040 の着地） |

### 新規モジュール `amadeus-migrate-git.ts` — 切り出しの理由が coverage 母集団にある

**32 行**（`wc -l` = 32、`git log --numstat --diff-filter=A` = `32 0`。上流スキャン報告の「31 行」は本スキャンの実測と一致しない）。エクスポートは `GitSpawnOutcome`（`:7`）と `normalizeGitOutcome`（`:19`）の 2 面のみで、判定内容は「`error` が立った spawn は exit code に関わらず ok にしない」である。

配置上の要点は、**この 32 行が `amadeus-migrate.ts`（3847 行）から切り出された理由がテスト容易性だけでなく coverage 母集団の制御にある**ことである。ファイル冒頭のコメントが逐語でテスト側の動機を述べる:

> The Git spawn verdict used by the migration tool, in its own module so a test can drive it without importing the migration tool itself.

`amadeus-migrate.ts` 全体を in-process import すると、CLI として spawn 実行されるだけの大型ファイルが lcov の母集団へ丸ごと入り、未カバー行が分母を膨張させて Project Coverage Gate の相対条件（許容 0.02pp）を構造的に赤くする。この失敗様式と是正（waiver ではなく小モジュールへの切り出し）は既にノルム `cid:build-and-test:bt-coverage-universe-inflation` として蒸留されており、本モジュールはその適用例である。**同種の切り出し判断の前例として参照できる。**

### 本 intent の患部 4 件の所在

いずれも本区間で無変更のファイル内にあり、モジュール移動を伴わない。

| Issue | 患部ファイル |
|---|---|
| #3077 | `packages/framework/core/tools/amadeus-election.ts`（`tallyElection` `:424`、digest 生産 `:451`、`isCommittedRun` の期待式 `:419-420`）/ `amadeus-election-store.ts`（`verifyPreservation` `:716`、全 question 分岐 `:728-729`。`commitTally` から呼ばれる） |
| #3074 | `packages/framework/core/tools/amadeus-lib.ts`（`assertRecomposeAllowed` `:564-573`）/ `amadeus-utility.ts`（唯一の呼び出し `assertRecomposeStateAllowed` `:5793`、呼出行 `:5802`、拒否文言 `:5805`。phase 取得イディオムは同ファイル `:391` の `getField(content, "Lifecycle Phase")`） |
| #3075 | `tests/unit/` / `tests/integration/` / `tests/e2e/` の **19 ファイル 24 行**（内訳は `code-quality-assessment.md` の対応節） |
| #3079 | `tests/integration/t224-upstream-v2-migration-cli.test.ts`（ケース `:1553` = `symlink clone-id migration isolates distinct fixture identities that share a lock path`、ロック占有 `:1577-1582`、`migrateWithEnv` `:1584`、env `:1586`、期待 `:1597`）/ `packages/framework/core/tools/amadeus-audit.ts`（リトライ予算のコメント `:1008-1010` と `lockRetries` `:1011-1014`） |

## 差分リフレッシュで観測した構造変化（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `9ba8170bb03996fb98b497cfcbac3d207795018d` → observed `78146f435a66680055a24144937b5aa03d48bfb4`（`git merge-base --is-ancestor 9ba8170bb 78146f435` → **exit 0**、`git rev-list --count 9ba8170bb..78146f435` → **12**）。

**構造変化はゼロである。** 新規パッケージ・新規モジュール・ディレクトリ移動はいずれも無い。区間規模は `git diff --shortstat 9ba8170bb 78146f435` → **103 files / +3091 −182**、非 record 面（`-- ':!amadeus/' ':!metrics/'`）は **40 files / +874 −97** で、残る 63 ファイルは record / metrics スナップショットである。

### 区間で動いたコア実装 4 ファイル（`git diff --numstat 9ba8170bb 78146f435 -- 'packages/framework/core/tools/*.ts'` からの転記）

| ファイル | ± | 内容 |
|---|---|---|
| `packages/framework/core/tools/amadeus-election.ts` | +21 / −5 | `runPreservedDigest()` を新設し、digest 生産の 3 呼び出し点を 1 つへ統一（#3077 の着地） |
| `packages/framework/core/tools/amadeus-graph.ts` | +30 / −6 | `loadSensors` → `mergeSensorsFromDir` へ改称し、plugin host の sensor をマージ（#3026 の着地） |
| `packages/framework/core/tools/amadeus-lib.ts` | +16 / −4 | `assertRecomposeAllowed` が `lifecyclePhase` 引数を取り、`autonomous && CONSTRUCTION` のときだけ拒否（#3074 の着地） |
| `packages/framework/core/tools/amadeus-utility.ts` | +1 / −1 | 上記へ `Lifecycle Phase` を渡す 1 行 |

非 record 面 40 ファイルの内訳は、**非テスト 12 + テスト 28**（`git diff --name-only 9ba8170bb 78146f435 -- ':!amadeus/' ':!metrics/' ':!tests/'` → 12 行、`--diff-filter=A -- 'tests/**'` → **4**、`--diff-filter=M -- 'tests/**' | wc -l` → **24**）。非テスト 12 は上記コア 4 に加え、plugin 6（`formal-model-check` の `plugin.json` / `stages/formal-model-check.md` への sensor 宣言 = #3026 系、`github-pr-convergence` の `sensors/` / `stages/` / `tools/` landed-report = #3062）と docs 2（`docs/harness-engineering/06-sensors.md` / `06-sensors.ja.md` を実在コーパスへ同期 = #3028）である。新規テスト 4 は `t3026-plugin-sensor-declaration` / `t3028-sensors-docs-sync` / `t3062-pr-convergence-landed-finalization` / `t3077-election-full-retally`（`--diff-filter=A` の出力そのまま）。`amadeus/` 側では RFC-0001 intent-autonomy-modes が approved へ（+52/−17）、`specs/tla/model-map.json` が実装ハッシュピン 1 行の resync を受けている。

### 本 intent の患部配置 — 区間内で 1 バイトも動いていない

`git diff --quiet 9ba8170bb 78146f435 -- <path>` を患部ファイルへ個別適用し、**全 5 件 exit 0**（差分なし）を実測した。

| 患部 | ファイル / 行 | 役割 |
|---|---|---|
| 狭い読み口 | `packages/framework/core/tools/amadeus-orchestrate.ts:2447-2473` `readPerUnitConsumePopulation` | `declaredUnits` は `loadRuntimeUnitRows`（`:2450`、`bolt_dag.units`）、outcome は `readUnitPoolEventSetsFromAudit`（`:2456`）＋ `foldUnitPoolEventSets`（`:2460`）のみ。runtime unit row 不在時は `:2451` で早期 return（degrade スコープは免疫） |
| 保存すべき不変量 | 同 `:2461-2463` | 逐語 `if (!currentUnits.has(terminal.unitId)) continue;` — バッチ所属フィルタ |
| 正準射影（豊かな読み口） | `packages/framework/core/tools/amadeus-construction-outcome-projection.ts:222-228` | `CONSTRUCTION_AUDIT_EVENTS` = 5 イベント |
| 正準射影の消費点 | `amadeus-orchestrate.ts:3830-3832` / `:4006-4013` / `:4088-4113` / `:6574-6579` | `normalizeConstructionOutcomeAudit` + `projectConstructionOutcomes`（import は `:253-254`） |
| 単一 writer | `packages/framework/core/tools/amadeus-unit-pool-runtime.ts:152-161` | `UNIT_POOL_EVENT_SET_COMMITTED` の唯一の発行点（読み側 `:122-141`） |
| pool 生成点の全数 | `amadeus-swarm.ts` **9 call site**（import 除く）/ `amadeus-orchestrate.ts:3812`（読取専用）/ `:6586`（`handleFailureRuling` 変異） | 述語: `grep -rn "createAuditUnitPoolRepository" packages/framework/core/tools/*.ts`（14 行 − import/定義 3 行） |
| pool へ書かない経路 | `amadeus-orchestrate.ts:4574-4725` `emitPerUnitRunStage` | 同範囲へ `grep -n "UnitPool\|unitPool\|UNIT_POOL"` → **exit 1（0 hit）** |
| 症状の発火点 | `packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts:224-228` | `pending` 判定 → `throwForUnits("producer-outcome-pending", …)` |
| 配線 | `amadeus-orchestrate.ts:4259-4261`（`emitRunStageForSlug`、関数頭 `:4232`）→ `:2518-2532`（`resolveConsumes`） | 母集団の受け渡し |
| 再現条件 | `packages/framework/core/tools/amadeus-lib.ts:8416` | 逐語 `if (pendingBatch === null \|\| pendingBatch.units.length < 2) return { kind: "ok" };` — 幅 1 バッチは plan-integrity redirect を素通り |
| 消費者エッジ在庫 | `amadeus-per-unit-consume-fanout.ts:90-110`（ガード `:144-168`） | 7 consumer / 19 edge、`consumer-edge-inventory-mismatch` で fail-closed |

機序の解説は `architecture.md` の対応節、テスト面と台帳は `code-quality-assessment.md` の対応節を参照。

## 差分リフレッシュで観測した構造変化（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `78146f435a66680055a24144937b5aa03d48bfb4` → observed `83e1dbeefb3278a00e86f69d3c79071a35ccf043`（`git merge-base --is-ancestor 78146f435a 83e1dbeef` → **exit 0**、`git rev-list --count 78146f435a..83e1dbeef` → **4**）。

**構造変化はゼロである。** 新規パッケージ・新規モジュール・ディレクトリ移動はいずれも無い。区間規模は `git diff --shortstat 78146f435a 83e1dbeef` → **110 files / +4856 −59**、非 record 面（`-- ':!amadeus/' ':!metrics/'`）は **17 files / +565 −37** で、残る 93 ファイルは record / metrics スナップショットである。

### 区間の内容は intent 260815-per-unit-outcome へ全量帰属する

区間の 4 コミットは PR #3105（`fix(#3099)`: settle 経路 + `UNIT_OUTCOME_SETTLED` イベント + テスト t533/t81/t28/t403/t449/t212 + docs troubleshooting / 12-state-machine + event-registry 92→93 + coverage 台帳）、record checkpoint #3107 / #3111、metrics #3102 / #3108 である。非 record 17 ファイルの内訳は **非テスト 8 + テスト 9**（`git diff --name-only 78146f435a 83e1dbeef -- ':!amadeus/' ':!metrics/' ':!tests/'` → **8** 行、`--diff-filter=A -- 'tests/**'` → **0**、`--diff-filter=M -- 'tests/**'` → **9**）。**新規テストファイルはゼロ**（すべて既存ファイルへの追記）。

### 本 intent の patch surface — 区間内で 1 バイトも動いていない

`git diff --quiet 78146f435a 83e1dbeef -- plugins/github-pr-convergence/` → **exit 0**（ディレクトリ全域が無変更）。個別パスへも同述語を適用し全件 exit 0 を実測した。行番号はいずれも observed `83e1dbeef` 断面の値である。

| 役割 | ファイル / 行 | 内容 |
|---|---|---|
| 拒否の発火点 | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts:669` | `!attestationBindsIdentity(receipt, work, heads, options.ref)` — `currentSelfContext`（`:627`）内。**verb 分岐より先に評価される** |
| head 束縛の定義 | 同 `:714` | `attestationBindsIdentity`（`receipt.prHead === heads.prHead` を要求） |
| 拒否文言 | 同 `:746-748` | `report attestation is stale: the PR head advanced to …`（Issue #3110 本文の引用と一致） |
| 到達不能な遷移 | 同 `:597-604`（許可の arm は `:602`） | `transitionAllowed` の `created → landed`（#3062 の着地） |
| 評価順序の起点 | 同 `:1370` / `:1398` | `selfContextFor(...)` → その後に `if (options.verb === "report") return reportOutcome(...)` |
| read-back の欠落 | `plugins/github-pr-convergence/tools/pr-convergence-gh-runner.ts:322` | `"--state", "open"` — MERGED/CLOSED PR を read-back しない |
| blocking sensor | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts:391-393` | `created proves PR delivery only; final convergence requires converged or override` |
| 同 sensor の head 検査 | 同 `:289` | `{ field: "local head", reason: "does not match the current checkout" }` |
| 自己言及の閉路 | `plugins/github-pr-convergence/stages/pr-convergence.md:344-346` | `A merged pull request needs no ruling — report records it as landed.` |
| attestation の書式 | `plugins/github-pr-convergence/tools/pr-convergence-attestation.ts:82` / `:115` / `:166` | `local head` フィールドの生成・型・parse |
| 収束述語 | `plugins/github-pr-convergence/tools/pr-convergence-predicate.ts` | `converged` / `landed` の判定（区間内無変更） |

patch surface のファイル規模（`wc -l`、observed 断面）: `pr-convergence-cli.ts` **1468** 行 / `pr-convergence-gh-runner.ts` **354** 行 / `amadeus-sensor-pr-convergence-report-format.ts` **432** 行 / `pr-convergence.md` **431** 行。

**sensor のファイル名に注意** — manifest は `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`（`sensors/` 直下、`amadeus-` プレフィックス）、実装は `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`（`tools/` 直下、`amadeus-sensor-` プレフィックス）で、`sensors/` に `.ts` は存在しない（`ls plugins/github-pr-convergence/sensors/` → 1 エントリ、md のみ）。

機序の解説は `architecture.md` の対応節、テスト空白と台帳は `code-quality-assessment.md` の対応節を参照。

## 差分リフレッシュで観測した構造変化と、オープンバグ 3 件の患部配置（260816-open-bug-batch-7、履歴、observed `5c5911ee3`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-priority-bug-batch-3 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `83e1dbeefb3278a00e86f69d3c79071a35ccf043` → observed `5c5911ee3f107152c3173701caf178a746b6e3aa`。区間は **28 コミット / 399 files changed, 22808 insertions(+), 1198 deletions(-)**（Developer scan §1 からの転記）。

### 区間の構造変化 — 新規モジュール 5 本、ディレクトリ再編はゼロ

領域別のファイル数（Developer scan §1 の表からの転記）は `amadeus/spaces/default/intents` 195 / `tests/{integration,unit,e2e}` 83（うち新規 30）/ `packages/framework/core/tools` 26（うち新規 5）/ `docs/{reference,guide,harness-engineering}` 26 / `metrics` 12 / `plugins/github-pr-convergence` 6 / `amadeus/spaces/default/codekb` 10。なお `tests/**` 全域を対象にすると **90** ファイル（`git diff --name-only 83e1dbee HEAD -- 'tests/**' | wc -l`、本節の実測。内訳は新規 **30** / 変更 **59** / 削除 **1**）で、上の 83 との差 **7** は `tests/{integration,unit,e2e}` の外側にある — `tests/.complexity-baseline.json` / `tests/.coverage-patch-allowlist.json` / `tests/.coverage-ratchet.json` / `tests/.coverage-registry.json`（台帳 4 件）、`tests/harness/autosolo-s13-fixture.ts`、`tests/helpers/recommendation-decision-points.ts`、`tests/perf/t269-amadeus-mirror-contract-policy-performance.test.ts`。**対象集合が異なるだけで矛盾ではない**。削除 1 件は `tests/integration/t456-question-carveout-predicate.test.ts`（`--diff-filter=D`）で、interactive-carveout unit（#3137）の着地に伴う。**`.github/` は 0 件**（`git diff --name-only 83e1dbee..HEAD -- .github/` が空出力・exit 0）で、CI 面は本区間で不変である。

新規モジュールは `packages/framework/core/tools/` 直下の 5 本のみで、パッケージ追加もディレクトリ移動も無い。既存の `packages/framework/core/` / `packages/framework/harness/<name>/` 境界は不変である。区間には #3110 の是正（PR #3113、`8ceeb2dc18`）も含まれ、`plugins/github-pr-convergence/` の 6 ファイルがこれに当たる（`git merge-base --is-ancestor 8ceeb2dc18 HEAD` → **exit 0**、同述語を base に適用 → **exit 1**、すなわち区間内の着地）。

### 本 intent の patch surface — 3 領域はファイル交差ゼロ

行番号はすべて observed `5c5911ee3` 断面の値で、本節の起草時に逐語確認した。

**A. #2363（pi 配布経路）** — 編集が要る面は 3 定義 + 派生 3 面。

| 役割 | ファイル / 行 |
|---|---|
| self-install face 集合 | `scripts/plugin-projection.ts:59` |
| dist→作業ツリー写像 | `scripts/promote-self.ts:64-71` |
| 生成ルート allowlist（`.gitignore` / `.gitattributes` の導出元） | `packages/framework/core/tools/data/self-install-allowlist.ts:12-19` |
| pi の否定パターン（一括 ignore と衝突する） | pi の `dot-gitignore`（`!/.pi/vendor/` / `!/.pi/vendor/**`） |
| 逐語列挙する docs | `docs/reference/11-contributing.md:47`（6 ルート）、`docs/guide/harnesses/kimi-code.ja.md:173-174`（dogfood promote の記述） |
| 固定件数ピン（Red の実測点） | `tests/integration/t-plugin-projection-packaging.test.ts:148-149`、`tests/unit/t-plugin-projection.test.ts:308`、`tests/unit/t209-promote-self-dangling-symlink.test.ts:146-150` |

**B. #2162（bootstrap provenance）** — `tests/no-silent-drop/` に閉じる。

| 役割 | ファイル / 行 |
|---|---|
| 信頼経路の分岐 | `tests/no-silent-drop/bootstrap.ts:435-461`（`:448` 判定 → `:449` / `:451`） |
| 到達性検査（`preRevision` のみ） | 同 `:348-358` |
| `postRevision` の全消費点（3 hit） | 同 `:53` / `:186` / `:358` |
| 文字列等値のみの比較 | 同 `:283` |
| 死んだ baseline 参照 | `tests/no-silent-drop/ledger.ts:226-227` / `:301-302` |
| 死んだ経路を固定する negative test | `tests/integration/no-silent-drop-gate.test.ts:839` |
| bootstrap を消費するテスト | `tests/integration/no-silent-drop-gate.test.ts`（`:28` import、`:74-75` が実 record の `bootstrapBaseRevision` を読む唯一点、`:170-330` の合成 fixture、`:1222-1244` の検査群）、`tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts` |

**C. #3097（センサー列挙 drift）** — docs 2 面 + 検査 1 本。

| 役割 | ファイル / 行 |
|---|---|
| drift のある表（en） | `docs/reference/07-sensor-system.md:200-208`（ヘッダ `:198`。別に `:48-49` の filename↔id 例示表（網羅意図なし）、`:380-386` の `timeout_seconds` 散文列挙） |
| 同（ja） | `docs/reference/07-sensor-system.ja.md`（表 `:199-207`、例示表 `:48-49`、散文 `:377-384`） |
| 発火規約の宣言（14 件目を足すと矛盾する根拠） | `docs/reference/07-sensor-system.md:210-212` |
| 射程内の doc（同期済み 14 行） | `docs/harness-engineering/06-sensors.md`（en `:63-76`）/ `.ja.md`（`:30-43`） |
| 検査 | `tests/integration/t3028-sensors-docs-sync.integration.test.ts:1-2`（`covers:`）、`:20-45`（`derivedCorpus()`）、`:47-51`（`tableRows()`、`docs/harness-engineering` 直下限定） |
| 導出元コーパス | `packages/framework/core/sensors/`（11）+ `plugins/*/plugin.json` の `sensors` 配列（3） |

**paths-ignore の盲点は無い** — `.github/workflows/ci.yml:14-15` の `paths-ignore` は `metrics/**` のみで、docs は除外されていない（`cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` の該当なし）。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、テスト空白と台帳は `code-quality-assessment.md` の各対応節を参照。

## 構造変化ゼロの区間と、優先バグ 5 件の患部配置（260816-priority-bug-batch-3、履歴、observed `89053172e`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260817-inception-cost-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する。本節が記す患部は本区間の 5 PR で是正され行番号も動いている — 現況は本ファイル末尾の 260817-inception-cost-batch 節を参照））

**観測 ref**: base `5c5911ee3f107152c3173701caf178a746b6e3aa` → observed `89053172ed8b5bb270e254aea029a13291d10b6b`。区間は **15 コミット / 229 files changed, 6597 insertions(+), 17613 deletions(-)**（本節の実測）。

### 区間の構造変化 — 新規 0 / 削除 0 / 変更 4、ディレクトリ再編なし

`git diff --name-status 5c5911ee3 89053172e -- packages/framework/core/tools/`（本節の実測、exit 0）の出力は **`M` 4 行のみ**である。

```
M	packages/framework/core/tools/amadeus-intent-autonomy.ts
M	packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts
M	packages/framework/core/tools/amadeus-state.ts
M	packages/framework/core/tools/data/self-install-allowlist.ts
```

`plugins/` と `packages/framework/harness/` はいずれも**空出力・exit 0**（本節の実測）。パッケージ追加・ディレクトリ移動はなく、`packages/framework/core/` と `packages/framework/harness/<name>/` の境界は不変である。

区間全体の分類は **A 118 / D 11 / M 100**（`git diff --name-status ... | awk '{print $1}' | sort | uniq -c`、本節の実測）で、追加 118 の大半は record 面、削除 11 の主体は #3155 による no-silent-drop bootstrap fixture である。非 record 面（`-- ':!amadeus/' ':!metrics/'`）は **65 files / +689 −17509** と、**削除が挿入の 25 倍を超える**特異な区間である。削除上位は `tests/no-silent-drop/bootstrap/pre-classification.json`（3185 行）/ `post-classification.json`（3045 行）/ `bootstrap-provenance.json`（2152 行）ほか（Developer scan §1.3 の `--numstat` 上位表からの転記）。

`tests/**` の増減は **新規 1 / 削除 10 / 変更 33**（`--diff-filter=A|D|M` の各 `wc -l`、本節の実測）。新規 1 件は `tests/integration/t2363-pi-self-install-delivery.integration.test.ts`。observed 断面のテスト総数は unit **432** / integration **597** / e2e **97** / smoke **16**（`git ls-files tests/<dir> | grep -c "\.test\.ts$"`、本節の実測）。

### 本 intent の patch surface — 5 領域、うち 3 領域が `amadeus-state.ts` を共有

行番号はすべて observed `89053172e` 断面の値で、本節の起草時に `sed -n` で逐語確認した。

**A. #3153（autonomy×presence 接合部）**

| 役割 | ファイル / 行 |
|---|---|
| 接合部を含むガード本体 | `packages/framework/core/tools/amadeus-state.ts:3721-3772`（宣言 `:3721`、ドキュメンテーション `:3703-3720`） |
| autonomy 呼出 | 同 `:3744` |
| **結論が捨てられる箇所** | 同 `:3755-3756` |
| off-switch | 同 `:3757-3760` |
| presence 述語の呼出 | 同 `:3761` |
| 拒否 | 同 `:3769-3771` |
| presence 述語の実体 | `packages/framework/core/tools/amadeus-lib.ts:3926-3941` |
| ガードの全呼出元 | `amadeus-state.ts:4178`（approve 経路）/ `:4860`（reject 経路） |
| 監査契約（専用フィールド不在） | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:150` |
| 先行事例（R-22） | `packages/framework/core/tools/amadeus-state.ts:4165`、`amadeus-intent-autonomy.ts` の `declaredFullAutonomy` |

**B. #3152（拒否イベントの無条件発火）**

| 役割 | ファイル / 行 |
|---|---|
| 発火経路 | `packages/framework/core/tools/amadeus-intent-autonomy-production.ts:295-328`（宣言 `:295`） |
| 発行関数 | 同 `:354-370`、呼出点 `:314-319` |
| 唯一のガード（閉語彙） | 同 `:333` `REFUSAL_REASONS` |
| **対照される冪等な認可側** | 同 `:901-913`（`already-decided` arm、`:913`） |
| occurrence キーの構成 | 同 `:246-249`（`interactionKind`）/ `:261`（`occurrence`） |
| kind の閉語彙 | `packages/framework/core/tools/amadeus-intent-autonomy.ts:113` |
| 本番呼出元 | `packages/framework/core/tools/amadeus-orchestrate.ts:2822`（宣言 `:2814`、import `:219`）/ `amadeus-state.ts:3744`（import `:149`） |
| 監査契約（単数宣言） | `packages/framework/core/knowledge/amadeus-shared/audit-format.md:297` |

**C. #3149（report lifecycle の閉路 + 祖先孤児化）** — 患部は区間内で 1 行も動いていない。

| 役割 | ファイル / 行 |
|---|---|
| lifecycle 定義 | `plugins/github-pr-convergence/tools/pr-convergence-cli.ts:610-617` |
| 遷移拒否点 | 同 `:920-924`（`:921` 判定 / `:923` メッセージ） |
| stale 判定と #3110 経路 | 同 `:907-919`（`measuredBy` の定義は `:878`） |
| landed 最終化の拒否点 | 同 `:763` |
| `converged` を組み立てる箇所 | 同 `:120`（型）/ `:1454` |
| sensor の binding 分岐 | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts:285-302`（`:294-295` head 一致、`:297-298` 分岐） |
| checkout binding | 同 `:323-335`（`:331` `git rev-parse HEAD` / `:332-333` 不一致検出） |
| 排他性の宣言 | 同 `:278-284` |
| 祖先証明 | `plugins/github-pr-convergence/tools/pr-convergence-git-runner.ts:213-243`（`:224` / `:231` 判定、`:236` メッセージ、`:220-222` 短絡） |
| sensor manifest（blocking / matches） | `plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md`（frontmatter `default_severity: blocking`、`matches: "**/construction/*/code-generation/pr-convergence-report.md"`。本節で逐語確認） |

**D. #3156（`workspace_requires` ガードの誤拒否）** — すべて `packages/framework/core/tools/amadeus-state.ts`。

| 役割 | 行 |
|---|---|
| git repo 判定 | `:2491-2493` |
| **共通起点** `intentBirthCommit` | `:2498-2504` |
| プローブ (a) | `:2511-2521` |
| `intentBoltSlugs` | `:2525-2536` |
| `boltRefsForSlug`（4 候補） | `:2542-2549` |
| プローブ (b) | `:2556-2563` |
| `intentIssueRefs` | `:2568-2580` |
| プローブ (c) | `:2595-2609` |
| 合成 | `:2622-2632` |
| テストシーム（export 済み） | `:2650-2679` `gitHasSourceWork` |
| FS fallback 付き入口 | `:2685-2691` |
| 判定点と拒否メッセージ | `:2726` / docs-only 免除 `:2734-2736` / メッセージ `:2738` |
| 文書化済みバイパス | `:2712`（`AMADEUS_SKIP_ARTIFACT_GUARD`。文書は `docs/reference/12-state-machine.md §Artifact guard`） |

**E. #3046（election store の TOCTOU）**

| 役割 | ファイル / 行 |
|---|---|
| 設計前提のコメント（D-09） | `packages/framework/core/tools/amadeus-election-store.ts:17-20` |
| `pendingPath` | 同 `:489-491` |
| `readPendingVoter` | 同 `:493-525` |
| 全体読み + **一意性検査** | 同 `:527-549`（検査は `:545-547`、ソートして返すのは `:548`） |
| `appendPending` 本体 | 同 `:1032-1092` |
| **窓の始点**（全体読み） | 同 `:1042` |
| **採番** | 同 `:1063` |
| **窓の終点**（自 voter のみ書込） | 同 `:1087-1090` |
| `schemaVersion` | 同 `:1082` / `:504` |
| `readAllPending` の内部呼出元 | 同 `:990` / `:1042` / `:1106` / `:1221` |
| 本番の外部呼出元（1 箇所のみ） | `packages/framework/core/tools/amadeus-election.ts:318` |

### 配置から読める構造上の含意

**`amadeus-state.ts` に 3 領域が同居する。** 同ファイルは observed 断面で **6457 行**（`wc -l`、本節の実測）あり、#3153（`:3721-3772`）/ #3152 の呼出点（`:3744`）/ #3156（`:2491-2691`）が載る。行域は重ならないが、**PR 単位では直列化が安全**である（`cid:units-generation:c1` の「同一ファイル・進行中 PR との交差は直列化する」）。他の主要ファイルの規模は `amadeus-lib.ts` 9148 行 / `amadeus-intent-autonomy-production.ts` 1596 行 / `amadeus-election-store.ts` 1232 行 / `pr-convergence-cli.ts` 1634 行（同実測）。

**dist 経由 import が 1 本ある。** `tests/unit/t206-source-work-intent-span.test.ts:33` 逐語 `import { gitHasSourceWork, workspaceHasSourceFile } from "../../dist/claude/.claude/tools/amadeus-state.ts";`（本節で逐語確認）。**#3156 の修正を検証するには `bun run build` を経て dist を再生成する必要がある**（`cid:code-generation:c1-mirror-and-rebuild-before-review` / `cid:code-generation:c5-regen-needs-build`）。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、テスト空白と台帳は `code-quality-assessment.md` の各対応節を参照。

## 差分リフレッシュで観測した構造変化と、focus 2 件の患部配置（260817-inception-cost-batch、履歴、observed `23d4ae767`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260818-priority-bug-batch-4 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `89053172ed8b5bb270e254aea029a13291d10b6b` → observed `23d4ae767956cd56fc28fa78abe28096712eff8a`。区間は **12 コミット / 123 files changed, 8023 insertions(+), 351 deletions(-)**（本節の実測）。

### 区間の構造変化 — 新規 0 / 削除 0 / 変更 14、2 区間連続でディレクトリ再編なし

`git diff --name-status 89053172e..23d4ae767 -- packages/ plugins/ docs/ .github/`（本節の実測、exit 0）の出力は **`M` 14 行のみ**である。

```
M	docs/reference/12-state-machine.ja.md
M	docs/reference/12-state-machine.md
M	packages/framework/core/knowledge/amadeus-shared/audit-format.md
M	packages/framework/core/otel/event-registry.ts
M	packages/framework/core/tools/amadeus-election-store.ts
M	packages/framework/core/tools/amadeus-intent-autonomy-production.ts
M	packages/framework/core/tools/amadeus-intent-autonomy.ts
M	packages/framework/core/tools/amadeus-lib.ts
M	packages/framework/core/tools/amadeus-state.ts
M	plugins/github-pr-convergence/sensors/amadeus-pr-convergence-report-format.md
M	plugins/github-pr-convergence/stages/pr-convergence.md
M	plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts
M	plugins/github-pr-convergence/tools/pr-convergence-attestation.ts
M	plugins/github-pr-convergence/tools/pr-convergence-cli.ts
```

`packages/framework/harness/`、`.github/`、`package.json` / `bun.lock` / `**/package.json` はいずれも**空出力・exit 0**（本節の実測）。`packages/framework/core/` と `packages/framework/harness/<name>/` の境界、`plugins/<name>/{tools,stages,sensors}/` の構成はいずれも不変である。

区間全体の分類は **A 82 / M 41**（`git diff --name-status 89053172e..23d4ae767 | awk '{print $1}' | sort | uniq -c`、本節の実測）。**削除（`D`）はゼロ**で、追加 82 の大半は record 面である。

**挿入行の配置比**（`git diff --numstat` を path 接頭辞で集計、本節の実測、awk 述語は `re-scans/260817-inception-cost-batch.md` §1 に再実行可能な形で記録）:

| バケット | insertions | files |
|---|---|---|
| `amadeus/spaces/*/intents/**`（intent record） | 3,139 | 63 |
| `tests/**` | 2,095 | 18 |
| `packages/**` + `plugins/**`（ソース） | 963 | 12 |
| `amadeus/spaces/*/codekb/**` | 936 | 10 |
| `metrics/**` | 455 | 5 |
| `amadeus/spaces/*/elections/**` | 425 | 10 |
| `amadeus/spaces/*/specs/**`（TLA 台帳） | 4 | 2 |
| `docs/**` | 4 | 2 |
| `amadeus/spaces/*/memory/**` | 2 | 1 |
| **合計** | **8,023** | **123** |

**workflow exhaust（intents + codekb + metrics + elections）は 4,955 insertions / 88 files = 61.76% / 71.5%**（派生値、算出式は 4955/8023 と 88/123）。**`amadeus/spaces/*/specs/**` の 2 ファイル 4 行は exhaust ではなくビルド台帳**であり、`amadeus/spaces/**` の前方一致で除外すると巻き添えになる（#2415 の述語設計に直結。詳細は `architecture.md` §1）。

### テスト面の増減

| 述語 | 結果 |
|---|---|
| `git ls-tree -r --name-only 89053172e tests/<dir> \| grep -c '\.test\.ts$'` | unit **432** / integration **597** / e2e **97** / smoke **16** |
| 同、observed `23d4ae767` | unit **432** / integration **599** / e2e **97** / smoke **16** |
| `git diff --name-status 89053172e..23d4ae767 -- 'tests/**' \| grep -E '^[AD]'` | **A 4 行のみ、D 0 行** |

新規 4 ファイルの内訳:

| ファイル | 行数 | 種別 |
|---|---|---|
| `tests/integration/t3149-pr-convergence-merged-finalisation.integration.test.ts` | +739 | integration suite（#3149） |
| `tests/integration/t3046-election-append-voter-race.integration.test.ts` | +348 | integration suite（#3046） |
| `tests/helpers/election-append-race-child.ts` | +72 | ヘルパ（子プロセスを駆動して実並行 append を再現） |
| `tests/no-silent-drop/events/01M06XDWGXGY27WD0XSET1R3Q0.json` | +13 | no-silent-drop ULID event 台帳（`.test.ts` ではない） |

**上流入力の訂正 1 件（重要）。** Developer scan §3 は「1 new unit suite `t206-source-work-intent-span` (+167)」と記しているが、**このファイルは新規ではない**。`git diff --name-status 89053172e..23d4ae767 -- tests/unit/t206-source-work-intent-span.test.ts` → **`M`**（本節の実測）。`git cat-file -e 89053172e:tests/unit/t206-source-work-intent-span.test.ts` は exit 0 で base に実在し、**402 行 → 569 行**（各断面の `git show ... | wc -l`）に拡張された（+167 −0）。unit 層の総数が base / observed とも 432 で不変であることがこれを裏づける。**本区間の新規テストスイートは integration 2 本のみである。**

拡張された既存スイート（`git diff --numstat`、本節の実測）:

| ファイル | 規模 | 対象 |
|---|---|---|
| `tests/integration/t482-autonomy-refusal-event.integration.test.ts` | +229 −106 | #3152 |
| `tests/unit/t188-human-presence-gate.test.ts` | +212 −2 | #3153 |
| `tests/unit/t206-source-work-intent-span.test.ts` | +167 −0 | #3156 |
| `tests/integration/t450-pr-convergence-report-format-sensor.integration.test.ts` | +94 −0 | #3149（sensor 面） |
| `tests/integration/t549-election-v2-store.integration.test.ts` | +63 −21 | #3046 |
| `tests/unit/t112-delegated-approval.test.ts` | +32 −0 | #3153（delegated provenance） |
| `tests/integration/t435-intent-autonomy-production.integration.test.ts` | +27 −1 | #3152 |
| `tests/integration/t3110-pr-convergence-stale-epoch-landed.integration.test.ts` | +16 −7 | #3149（既存 landed 経路の追随） |
| `tests/integration/t247-runtime-recovery.test.ts` | +10 −13 | 追随 |
| `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` | +5 −2 | 台帳追随 |

### 前区間の患部の現在位置（行番号は本区間で動いている）

前節が記した 5 領域の行ピンは是正により移動した。observed 断面の主要アンカー（いずれも本節の起草時に `git show ... | sed -n` で逐語確認）:

| 領域 | 患部だった箇所 | observed の対応箇所 |
|---|---|---|
| #3153 | `amadeus-state.ts:3721-3772`（guard 本体）/ `:3755-3756`（結論の捨て場）/ `amadeus-lib.ts:3926`（`humanActedSinceGate`） | `amadeus-state.ts:3866`（guard 宣言）/ `:3896-3897`（`milestoneStage` 合成 = 旧・捨て場）/ `:3898`（presence 呼出）/ `amadeus-lib.ts:3967-3981`（`resolveGateResolutionPresence`）/ `:4038`（`humanActedSinceGate` の委譲） |
| #3152 | `amadeus-intent-autonomy-production.ts:295`（`productionStageAutonomy`）/ `:314` / `:354` | `amadeus-state.ts:3811`（`recordGateOpenRefusal`、新設）→ `amadeus-intent-autonomy-production.ts:432-450`（`recordAutonomyRefusalAtGateOpen`、新設）。冪等鍵 `:442-446`、既存行検出 `:408-411` |
| #3149 | `pr-convergence-cli.ts:610-617`（`transitionAllowed`）/ `amadeus-sensor-pr-convergence-report-format.ts:294-295` / `:331-334` | `pr-convergence-cli.ts:639`（`transitionAllowed`、規則は不変）/ `:1083`・`:1110`・`:1126`（merged 最終化、新設）/ sensor `:322-338`（`checkAttestationEnvironment`）/ `:344-370`（`checkMergeBinding`）/ `:372-381`（`checkCheckoutBinding`） |
| #3156 | `amadeus-state.ts:2498`（`intentBirthCommit`）/ `:2511` / `:2556` / `:2595`（3 probe） | 同 `:2503`（`intentBirthCommit`）/ `:2516` / `:2561` / `:2600`（3 probe）+ **`:2625`（`resolveTrunkRef`、新設）/ `:2660`（`branchSourceWorkSinceTrunkFork`、新設）**、合成は `:2703-2711` |
| #3046 | `amadeus-election-store.ts:17-20`（D-09 ヘッダ）/ `:545-547`（一意性検査）/ `:1063`（採番）/ `:1088` | 同 `:17-31`（D-09 改訂ヘッダ）/ `:537`（voter 内単調性）/ `:550-556`（`comparePendingEvents`、新設）/ `:582`（複合鍵検査）/ `:1104`（採番） |

`amadeus-state.ts` の総行数は **6,457 → 6,616**（各断面の `git show ... | wc -l`、本節の実測。差 +159 は区間 diff の +198 −39 と一致）。

### 本 intent の patch surface — 5 面、`amadeus-state.ts` を含まない

行番号はすべて observed `23d4ae767` 断面の値で、本節の起草時に逐語確認した。

**A. #2415（RE のスキャン入力から workflow exhaust を除外する）**

| 役割 | ファイル / 行 |
|---|---|
| stage 契約本体（237 行） | `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md` |
| frontmatter `produces:` | 同 `:10-19`（9 artifact） |
| frontmatter **`consumes: []`** | 同 `:20` |
| frontmatter `requires_stage:` / `sensors:` | 同 `:21-22` / `:23-27` |
| Preflight（差分 base の更新） | 同 `:81-95` — **入力面ではない** |
| **スキャン対象の列挙（入力面）** | 同 `:104-112` |
| Developer テンプレート引き渡し | 同 `:114` |
| 並行性契約 | 同 `:149-155` |
| Per-intent scan record 契約 | 同 `:157-181`（timestamp の freshness-only 降格は `:178-181`） |
| Developer scan テンプレート | `packages/framework/core/amadeus-common/templates/re-artifacts.md` |
| **除外規則の実在** | **不在** — `git grep -n -iE "exclude\|excluded\|exclusion\|workflow exhaust\|process record" 23d4ae767 -- <上記 2 面>` → **exit 1**（一致なし・エラーなし。`cid:reverse-engineering:c6-absence-predicate-exit-code` に従い exit code を確認済み） |

**B. #3181（Issue 証跡を RA の一級上流入力にする）**

| 役割 | ファイル / 行 |
|---|---|
| stage 契約本体（217 行） | `packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md` |
| frontmatter `consumes:`（6 件、Issue 由来ゼロ） | 同 `:14-29` |
| 読み口 Step 2 | 同 `:68-71`（`:70` codekb / **`:71` audit shard 散文**） |
| `upstream-coverage` の散文義務 | 同 `:185`（括弧書きは現状 3 件のみ列挙） |
| `consumes` の型と検証 | `packages/framework/core/tools/amadeus-stage-schema.ts:39-43` / `:277-316`（kebab-case は `ARTIFACT_SLUG_RE`、`:156` 逐語 `/^[a-z][a-z0-9-]*$/`） |
| artifact → path 解決 | `packages/framework/core/tools/amadeus-orchestrate.ts:2378-2400`（codekb arm `:2392-2394` / per-unit arm `:2396-2398`） |
| consume の所有者解決 | 同 `:2411-2420`（`producersOf(name)[0]`） |
| producer 列挙 | `packages/framework/core/tools/amadeus-graph.ts:856` |
| **producer 不在は hard error** | 同 `:1192-1198`（経路外は `:1200-1206` で advisory / strict 時 error） |
| codekb stage 集合（単一要素） | `packages/framework/core/tools/amadeus-lib.ts:1461` |
| 追加手順の正本 | `docs/reference/16-artifact-vocabulary.md:212-226` |
| GitHub プロセス境界（1,034 行） | `packages/framework/core/tools/amadeus-github-gateway.ts` — `viewArgv` `:175-180` / `parseIssueObject` `:418-446` / `versionArgv` `:112` / `authArgv` `:116` / `readiness` `:799-830` / adapter `:944` `:950` |
| port 側の readiness 宣言と呼出 | `amadeus-finding-types.ts:19` / `amadeus-mirror-types.ts:427`、`amadeus-finding.ts:94` / `amadeus-mirror-executor.ts:754-793` |

**レジストリファイルは存在しない。** `.claude/tools/data/` にも `packages/framework/core/tools/data/` にも artifact パスを持つファイルは無く、写像は規約として `resolveArtifactPath` が計算する。したがって新 artifact 種別は resolver 側 0 行だが、**producing stage の宣言が graph 不変量として必須**である。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、テスト面と台帳は `code-quality-assessment.md` の各対応節を参照。

## 差分リフレッシュで観測した構造変化と、focus 2 件の患部配置（260818-priority-bug-batch-4、履歴、observed `127be70c5`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260820-fmc-drift-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `23d4ae767956cd56fc28fa78abe28096712eff8a` → observed `127be70c5d7a584016f88a5d44e8715904020721`。区間は **5 コミット / 99 files changed, 7314 insertions(+), 61 deletions(-)**（本節の実測）。

### 1. 区間の構造変化 — 新規ソース 0 / 削除 0 / 変更 10、3 区間連続でディレクトリ再編なし

`git diff --name-status 23d4ae767..127be70c5 -- packages/ plugins/ docs/ .github/`（本節の実測、exit 0）の出力は **`M` 10 行のみ**である。

```
M	docs/reference/04-stages/ideation.ja.md
M	docs/reference/04-stages/ideation.md
M	docs/reference/04-stages/inception.ja.md
M	docs/reference/04-stages/inception.md
M	packages/framework/core/amadeus-common/stages/ideation/intent-capture.md
M	packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md
M	packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md
M	packages/framework/core/tools/amadeus-github-gateway.ts
M	packages/framework/core/tools/amadeus-lib.ts
M	packages/framework/core/tools/amadeus-utility.ts
```

`packages/framework/harness/`、`.github/`、`package.json` / `bun.lock` / `**/package.json`、`plugins/` はいずれも**空出力・exit 0**（本節の実測）。`packages/framework/core/` と `packages/framework/harness/<name>/` の境界、`plugins/<name>/{tools,stages,sensors}/` の構成はいずれも不変である。

区間全体の分類は **A 71 / M 28**（`git diff --name-status 23d4ae767..127be70c5 | awk '{print $1}' | sort | uniq -c`、本節の実測）。**削除（`D`）はゼロ**で、追加 71 の大半は record 面と新規テストである。

規模の内訳（`git diff --numstat`、本節の実測）: `amadeus-utility.ts` +337 −1 / `amadeus-github-gateway.ts` +210 −33 / `amadeus-lib.ts` +57 −0 / `stages/inception/reverse-engineering.md` +73 −1 / `stages/ideation/intent-capture.md` +30 −0 / `stages/inception/requirements-analysis.md` +7 −1 / `docs/reference/04-stages/inception.md` +24 −2 / 同 `.ja.md` +5 −1 / `docs/reference/04-stages/ideation.md` +2 −1 / 同 `.ja.md` +2 −1。

**挿入行の配置比**（`git diff --numstat` を path 接頭辞で集計、本節の実測。awk 述語は `re-scans/260818-priority-bug-batch-4.md` §1 に再実行可能な形で記録）:

| バケット | insertions | files |
|---|---|---|
| `amadeus/spaces/*/intents/**`（intent record） | 3,369 | 61 |
| `tests/**` | 1,804 | 16 |
| `amadeus/spaces/*/codekb/**` | 1,207 | 9 |
| `packages/**` + `plugins/**`（ソース） | 714 | 6 |
| `metrics/**` | 182 | 2 |
| `docs/**` | 33 | 4 |
| `amadeus/spaces/*/memory/**` | 5 | 1 |
| `amadeus/spaces/*/elections/**` | 0 | 0 |
| **TOTAL** | **7,314** | **99** |

**#2415 の除外述語を本区間へ適用した実測**（本節の実測。この記録は RE stage 契約が義務づける）: 除外前 **7,314 insertions / 99 files** → 除外後 **2,551 insertions / 26 files**。削減 **4,763 insertions / 73 files = 65.12%**（派生値、算出式 `4763/7314`）。除外集合は `RE_SCAN_EXCLUDED_PATHSPECS`（`amadeus-lib.ts:1540`）の 5 pathspec をそのまま使い、除外後の残余 2,551 は `tests` 1,804 + ソース 714 + `docs` 33 の合計と一致する（突合済み）。

### 2. 新規テスト 8 ファイル（1,694 行）

`git diff --name-status 23d4ae767..127be70c5 -- 'tests/**' | grep '^A'`（本節の実測）は **8 行**。行数は `git diff --numstat` からの転記。

| ファイル | 層 | 行 | 対象 |
|---|---|---|---|
| `tests/integration/t2415-re-scan-exclusion.integration.test.ts` | integration | 248 | 除外挙動（kept 集合、宣言クラスとの一致 `:163`） |
| `tests/integration/t2415-re-scan-exclusion-contract.integration.test.ts` | integration | 167 | 散文 ⇔ コード定数の drift guard（`:96` / `:159`）。**source + 全 delivered tree** を検証 |
| `tests/integration/t3181-issue-evidence-fetch.integration.test.ts` | integration | 453 | verb の CLI 境界 |
| `tests/integration/t3181-issue-evidence-upstream-coverage.integration.test.ts` | integration | 191 | upstream-coverage sensor との結線 |
| `tests/integration/t3181-issue-evidence-contract.integration.test.ts` | integration | 131 | stage 契約側の宣言 |
| `tests/unit/t3181-issue-evidence-gateway.test.ts` | unit | 273 | gateway の parser / argv |
| `tests/unit/t3181-issue-evidence-artifact.test.ts` | unit | 175 | artifact レンダリング |
| `tests/unit/t3181-issue-evidence-path.test.ts` | unit | 56 | パス解決 |

内訳: t2415 系 **415 行** / t3181 系 **1,279 行**、合計 **1,694 行**。

**既存テストの是正 3 件**（同区間、いずれも `M`）:

| ファイル | 変化 | 意味 |
|---|---|---|
| `tests/integration/t65.test.ts` | `:175-182`（+8 −2） | 孤児 consume モデルを `produces` ∪ `optional_produces` の走査へ是正。engine の `producersOf` と parity をとる |
| `tests/integration/t212-optional-produces.test.ts` | `:275`（+4 −1） | `optional_produces` 実運用の census を `["intent-capture", "functional-design", "infrastructure-design"]` へ更新。**この行が census の正本** |
| `tests/integration/t66.test.ts` | `:1032` / `:1042`（+2 −2） | artifact 語彙の基数 pin を 122 → 123 |

### 3. `optional_produces` の実運用が 2 → 3 stage へ

`git grep -n "^optional_produces:" 127be70c5 -- 'packages/framework/core/amadeus-common/stages/**'`（本節の実測、exit 0）→ **3 hit**:

```
packages/framework/core/amadeus-common/stages/ideation/intent-capture.md:14
packages/framework/core/amadeus-common/stages/construction/functional-design.md:17
packages/framework/core/amadeus-common/stages/construction/infrastructure-design.md:19
```

`optional_produces` はこれまで construction phase の 2 stage だけが使う面だったが、**ideation phase の stage が初めて加わった**。census の機械照合は `tests/integration/t212-optional-produces.test.ts:275` が graph 順で固定する（`.toEqual(["intent-capture", "functional-design", "infrastructure-design"])`）。

### 4. 新しい record 内パス — `<record>/ideation/intent-capture/issue-evidence.md`

| 面 | file:line（observed） |
|---|---|
| 絶対パス解決 | `packages/framework/core/tools/amadeus-lib.ts:5043` `issueEvidencePath` |
| 相対パス解決 | 同 `:5051` `relativeIssueEvidencePath` |
| 生成 verb | `packages/framework/core/tools/amadeus-utility.ts:6824` `runIssueEvidenceFetch` / dispatch `:6981` |
| 宣言（produce 側） | `stages/ideation/intent-capture.md:14-15` `optional_produces: [issue-evidence]` |
| 宣言（consume 側） | `stages/inception/requirements-analysis.md:30-31`（`required: false`） |
| 本文レベル読取 | `stages/inception/reverse-engineering.md:230-242`（focus 導出）。**`consumes:` には載せない**理由は同 `:239` に明記 |

**artifact 種別 → path の解決規約は動いていない**。`resolveArtifactPath`（`amadeus-orchestrate.ts`）の owner 分岐がそのまま働き、producing stage が `intent-capture`（record arm）なので `<record>/ideation/intent-capture/issue-evidence.md` に解決される。前スキャンが記した「`KNOWN_CODEKB_STAGES` は `reverse-engineering` のみの単一要素集合」も不変であり、**per-intent 証跡を RE の produces に載せると codekb へ解決されてしまう**という制約（`cid:application-design:c2`）が、実際に intent-capture 側へ置く設計を強制した形である。

### 5. focus 2 件の患部配置

**是正は本区間で着地していない**（`git grep -n "3106" 127be70c5 -- packages/ plugins/ tests/ docs/` → **exit 1**、`"2837"` は `tests/.coverage-patch-allowlist.json` の sha256 内部文字列 2 hit のみ）。

#### 5.1 #2837

| 面 | file:line（observed） |
|---|---|
| directive 型 | `packages/framework/core/tools/amadeus-directive.ts:312-331` |
| 閉語彙 | 同 `:555`（`INVOKE_SWARM_FIELDS`）/ 語彙表 `:587` |
| batch 生成 | `packages/framework/core/tools/amadeus-orchestrate.ts:3906` `firstUncoveredBatch`（戻り型 `:3912`、`return` `:3929`） |
| batch 破棄点 | 同 `:4294`（`emitConfiguredSwarm(projectDir, selection.value.pick.units)`）/ 受け側 `:4074` |
| gate 側の開示 | 同 `:3889` `batchGateQuestion(batch, units)` / 呼出 `:3971` |
| retry arm | 同 `:4092-4106` `preparedSwarmRetryDirective` |
| 対称面 | `amadeus-directive.ts:644-649`（`execute-failure-election` の必須 `batch`） |
| pool identity | `packages/framework/core/tools/amadeus-swarm.ts:638`（`unit-pool:<batch>:initial-enqueue`）/ 既定 base `:581` |
| swarm CLI verb 一覧 | 同 `:1419`（14 verb、`context` / `status` 不在） |
| conductor 面 | `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` と `{cursor,opencode}/commands/amadeus.md` の 8 面 |

**`packages/framework/core/tools/` と `packages/framework/harness/` の両方に患部が跨る。** engine 側（directive 契約と emit）を直せば harness 8 面の散文も同期対象になりうるため、**全ハーネス build と再現性検査が発火する**（`cid:build-and-test:bt-dist-regen-seven-harnesses`）。

#### 5.2 #3106

| 面 | file:line（observed） |
|---|---|
| settle 発行 | `packages/framework/core/tools/amadeus-orchestrate.ts:4686` `settlePerUnitOutcomes`（スキップ条件 `:4706` / `:4707-4709`、冪等 `:4711`） |
| 値の閉語彙 | 同 `:2475` `SETTLED_UNIT_OUTCOME` |
| 読み側 | 同 `:2499` `readSettledUnitOutcomes`（拒否 `:2508`） |
| 母集団 | 同 `:2513` `readPerUnitConsumePopulation` |
| 検出側 | 同 `:3934` `cancelledConstructionUnits` |
| ruling 分岐 | 同 `:6733` `handleFailureRuling`（solo arm `:6767-6781` / pool arm `:6783-6785`） |
| 下流受理 | `packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts:199` `KNOWN_OUTCOMES` / pending 述語 `:224-228` |
| projection | `packages/framework/core/tools/amadeus-construction-outcome-projection.ts:222`（受理イベント allowlist） |
| 文書 | `docs/guide/15-troubleshooting.md:143`（対訳 `.ja.md` は同一文字列 0 hit・**未判定**） |

**患部は `amadeus-orchestrate.ts` 1 ファイルに集中する**（6 面のうち 6 面）。ただし同ファイルは `amadeus/spaces/default/specs/tla/model-map.json` の impl ハッシュピンと `tests/.coverage-patch-allowlist.json` の意味的セレクタの**2 台帳を持つ面**であり、触ると同一変更での resync が要る（`cid:build-and-test:bt-ledger-resync`）。あわせて `cid:build-and-test:bt-coverage-universe-inflation` の注意（大型 tools ファイルを新規に in-process import すると Project Coverage Gate の相対条件が構造的に赤化する）が効く面でもある。

### 6. テストの置き場（空隙の是正先）

| focus | 置き場（既存の対になる位置） |
|---|---|
| #3106 | `tests/integration/t533-per-unit-consume-fanout.integration.test.ts:786-801` — 逐語 `test("does not emit paths for a cancelled producer Unit even when files remain", …)`。これは **pool 経路の cancelled** テストであり、per-unit（solo）経路の対が存在しない |
| #2837 | `tests/integration/t135-invoke-swarm.test.ts` — 現行は `--batch` を全てハードコードしており、batch 番号の**導出**をテストしていない。`tests/unit/t113.test.ts:303-322` は `prepared_batch` / `retry_unit` の pair 整合のみ |

**新規テストファイルを足す場合は `tests/.coverage-registry.json` の regen 同梱が必須**（`cid:build-and-test:c1`、`bun tests/gen-coverage-registry.ts`）。本区間でも新規 8 スイートに対し registry が **+48 −5** で同期されている（本節の実測）。

## 差分リフレッシュで観測した構造変化と、focus 4 件の患部配置（260820-fmc-drift-batch、現在、observed `e86fbe125`）

**観測 ref**: base `c8c393bba` → observed `e86fbe125`（97 commits、除外前 566 files / +32638 −3949、除外後 176 files / +14920 −1380）。行番号はすべて observed 断面で本節の起草時に確認した。

### 1. 構造変化 — 新規 4 / 削除 4 / 移設 1

`git diff --name-status -M c8c393bba..e86fbe125 -- packages/ plugins/ scripts/ .github/` の実測:

| 種別 | パス | 規模 |
|---|---|---|
| A | `packages/framework/core/tools/amadeus-mirror-orphan.ts` | +377 |
| A | `scripts/release-land.ts` | +306 |
| A | `scripts/release-land-domain.ts` | +219 |
| A | `plugins/formal-model-check/docs/terminal-route-receipt-audit.md` | +41 |
| D | `plugins/formal-model-check/tools/advisory-model-check.ts` | −314（移設） |
| D | `packages/setup/.release-it.json` | 外部ツール設定の撤去 |
| D | `scripts/run-claude.sh` / `scripts/run-codex.sh` | −10 / −45（#3299） |
| **R094** | `plugins/formal-model-check/tools/advisory-model-check.ts` → **`tests/lib/advisory-model-check.ts`** | #3078 — 未宣言 plugin tool の検出 |

**R094 の意味**: `plugins/<name>/tools/` は plugin.json の `tools[]` で明示宣言される面であり、t3078 が git-tracked ファイル集合との一致を blocking 検査する。テストヘルパはそこに置けないため `tests/lib/` へ移った。**plugin ツリーの境界が厳格化した変更**であり、以後 plugin 配下に「宣言しないファイル」を置くことはできない。

テスト側の新規は **A 行 24 件、うち `*.test.ts` が 17 件**（述語 = `git diff --name-status -M c8c393bba..e86fbe125 -- tests/` の A 行に `grep -c '\.test\.ts$'`。残り 7 件は台帳・fixture・helper: `tests/.silent-success-baseline.json` / `tests/lib/silent-success.ts` / `tests/test-time-factor-census.md` / `tests/fixtures/live-llm-regression-priority.json` / `tests/fixtures/release-land-repo/packages/setup/package.json` / `tests/fixtures/state-formal-model-check.md`、および R094 で移設された `tests/lib/advisory-model-check.ts`）。由来は #1982（t1982 unit/integration + `tests/lib/silent-success.ts` + `tests/.silent-success-baseline.json`）、#3078、#3088、#3147、#3183、#3239、#3243、#3249（2 本）、#3256、#3280、release-land、live LLM journey（e2e + fixture 2 件）に分かれる。削除は `tests/integration/t-run-codex-project-target.test.ts` の 1 件（`run-codex.sh` の撤去に伴う）。

### 2. テスト規模（observed 実測、述語 = `ls tests/<層>/*.ts | wc -l`。helper / fixture を含む母集団であり、metrics コレクタの `tests.files`（observed 側 1070）とは述語が異なる）

| 層 | ファイル数 |
|---|---|
| smoke | 16 |
| unit | 439 |
| integration | 616 |
| e2e | 98 |
| formal-verif | 1 |
| **合計** | **1170**（`ls tests/{smoke,unit,integration,e2e,formal-verif}/*.ts \| wc -l` の実測と一致） |

tla 関連テストは 55 ファイル（t402〜t557 と `t-formal-verif-*` 群）。

### 3. focus 4 件の患部配置

#### 3.1 #3186（語彙 drift 検出の腕）

| 面 | パス | 位置 |
|---|---|---|
| モデル側（証拠） | `amadeus/spaces/default/specs/tla/PrConvergenceGate.tla` | `:14` `Verdicts` / `:15` `TerminalVerdicts` |
| 同（同型） | `amadeus/spaces/default/specs/tla/BoltPrAttestationGate.tla` | `:22-23`（逐語同一の 2 行） |
| stage 契約（発火述語の置き場） | `plugins/formal-model-check/stages/tla-authoring.md` | `:51` の `semantic-change` 近傍 |
| 判定器 | `plugins/formal-model-check/tools/tla-applicability.ts` | `:143`（key 構成）/ `:182` `TERMINAL_ROUTES` / `:97` `"non-target:true": "J2d"` |
| 交差判定（#3261 で改訂済み） | 同 | `:121-133` |
| 入力データ | `amadeus/spaces/default/specs/tla/model-map.json` | 各モデルの `vocabulary.namedInvariants` / `traceStateVariables` |

#### 3.2 #2289（replace-by-name）

| 面 | パス | 位置 |
|---|---|---|
| compose（追加専用） | `plugins/formal-model-check/tools/tla-registration.ts` | `:229-243`（呼び出し `:338`） |
| commit | 同 | `:314-355`（digest 照合は `:324-327`） |
| provenance 必須化（#3263） | 同 | `:203-206` |
| 前提ゲート | 同 | `:110` |
| route 定義（複製 1） | 同 | `:87` |
| route 定義（複製 2） | `plugins/formal-model-check/tools/tla-applicability.ts` | `:302`（消費 `:314`） |
| 名前一意性 validator | `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` | `:615` |
| optional キー宣言 | 同 | `:368` `OPTIONAL_MODEL_KEYS` |
| 本番経路 | `plugins/formal-model-check/tools/tla-authoring.ts` | `:830` `createRegistrationPorts` / `:838` `RegistrationCommitter.commit` |
| 自己参照比較テスト | **`tests/unit/t448-tla-registration.test.ts`**（同じ t448 番号を持つ `tests/integration/t448-pr-convergence-cli.integration.test.ts` / `tests/unit/t448-autonomy-statusline-segment.test.ts` とは別ファイル） | `:2-3`（同一 module specifier の 2 import。逐語でいずれも `"../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts"`）/ `:74-82`（test `"the shipped plugin copy reaches the same verdicts"`）/ 同名拒否 pin `:294-307` |

#### 3.3 #2929（IMPLEMENTATION_PATHS の三面）

| 面 | パス | 位置 |
|---|---|---|
| validator 境界 | `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` | `:248-251`（拒否 `:349-351`、述語 `:330-336` `isCanonicalImplementationPath`、呼び出し `:619` `checkAssetSpaceContainment`） |
| ローダー境界 | `plugins/formal-model-check/tools/tla-model-loader-internal.ts` | `:291` `implementationRoot`、判定 `:299`、drift 返却 `:300`、`isContained` 定義 `:141-146` |
| sensor glob | `plugins/formal-model-check/sensors/amadeus-model-completeness.md` | `:8` |
| 第 3 の containment 述語 | `plugins/formal-model-check/tools/run-model-check-artifacts.ts` | `:129` `isContained` |
| registeredEntries / canonicalRecord | `plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts` | `:233` / `:733-775` |
| validator 境界の既存テスト | `tests/unit/t-formal-verif-canonical-core.test.ts` | `:1`（逐語 `outside the canonical implementation boundary`）、`:96` |
| ローダー境界のテスト | — | **不在**（`git grep -c -F 'is not a regular in-boundary file' -- tests/` → 0 hit / exit 1） |

#### 3.4 #3187（advisory authoring-hold の退役面）

| 面 | パス | 位置 | 処理 |
|---|---|---|---|
| advisory 宣言 | `plugins/formal-model-check/plugin.json` | `:77` | 該当エントリのみ削除 |
| hold 実装 | `plugins/formal-model-check/tools/tla-authoring.ts` | `:574-599`（ENOENT 分岐は `:576` に逐語コメント） | 削除 |
| subjects 書き手 | 同 | `:632-647` `publishSubjects` / `:649-670` `subjectsDeclare`（出力先 `:667`） | 削除 |
| subjects path | 同 | `:529-530` `defaultSubjectsPath`（`:530` に `authoring-subjects` の実リテラル） | 削除 |
| dispatch / USAGE | 同 | `:900-901` / `:77,80-81` | 削除 |
| stage 手順 | `plugins/formal-model-check/stages/tla-authoring.md` | `:53` | 削除 |
| doc 対訳 | `docs/reference/22-formal-model-supply.md` / `.ja.md` | — | 同一変更で同期 |
| RFC 参照 | `amadeus/spaces/default/specs/rfc/0001-intent-autonomy-modes.md` | `:249` | 履歴記述として扱うか要判断 |
| **engine（同名別物）** | `packages/framework/core/tools/amadeus-orchestrate.ts` | `:5675` / `:6606` / `:6639` | **無変更**（`advisoryReportHoldReason` を受けるローカル変数名。汎用 advisory 機構で `spec-change` も同経路） |
| blocking pin | **`tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts`**（同番号の `t450-autonomy-flag-branch.test.ts` / `t450-pr-convergence-report-format-sensor.integration.test.ts` / `tests/unit/t450-autonomy-flag-apply.test.ts` とは別ファイル） | `expect(receiving).toContain("subjects declare")` | 同時処理が必須 |
| 削除対象テスト | **`tests/integration/t528-authoring-hold-end-to-end.integration.test.ts`** / **`tests/integration/t524-subjects-declare-writer.integration.test.ts`**（同番号の `t528-report-ack-kind` / `t524-mint-presence-dist-exclusion` は無関係） | t528 は `:128` / `:134` / `:186` の 3 テスト | 削除 |
| 期待値更新テスト | t113 / t353 / t444 / t445 / t526 / t529 / t532（**番号は test-id prefix であり 1 番号が複数ファイルを持つ** — 実ファイルは実装時に `git grep -l -F 'authoring-hold' -- tests/` を再実行して確定する） | `authoring-hold` を宣言集合の一要素として数える面 | 更新（削除ではない） |
| coverage 台帳 | `tests/.coverage-registry.json` | `:1927` | regen（`bun tests/gen-coverage-registry.ts`） |

### 4. base 引用からの行番号訂正 3 件

前区間からの行シフト（主に #3261 / #3262 / #3263 による）で、次の 3 件が base 引用と食い違う。**observed 断面での再解決値を正とする。**

| base 引用 | observed の実測 | 述語 |
|---|---|---|
| `tla-model-loader-internal.ts:498` 呼び出し側 `loadVerifiedTlaSourcesInternal` | **`:528`**（宣言は `:464` で一致） | `grep -n "loadVerifiedTlaSourcesInternal" plugins/formal-model-check/tools/tla-model-loader-internal.ts` → `464:export function …` / `528:  const sources = loadVerifiedTlaSourcesInternal(moduleUrl, fs);` |
| `amadeus-sensor-model-completeness.ts:1000-1078` `updateModelMap` | **`:1000` は `performModelMapUpdate`**。export `updateModelMap` は **`:1121`**（本体末尾 `:1135-1136`）、内部 `updateModelMapInternal` は **`:1082`** | `grep -n "updateModelMap" plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts` → `1082:async function updateModelMapInternal(` / `1121:export async function updateModelMap(` / `1135:  return updateModelMapInternal({ ...options, mapRelativePath });` |
| `tla-authoring.ts:521` `defaultSubjectsPath` | **`:529`**（`advisoryHold` は `:574`、`subjectsDeclare` の出力先は `:667`） | `grep -n "defaultSubjectsPath\|function advisoryHold" plugins/formal-model-check/tools/tla-authoring.ts` → `529:export function defaultSubjectsPath(` / `574:function advisoryHold(` / `667:  const path = flags.out ?? defaultSubjectsPath();` |

その他 20 件超の base 引用（`tla-applicability.ts:302` / `tla-registration.ts:87` / `:229-243` / `:314-355` / `amadeus-formal-verif-model-map.ts:248-251` / `:330-336` / `:348-352` / `:615` / `:668-679` / `tla-model-loader-internal.ts:291` / `:141-146` / `amadeus-sensor-model-completeness.ts:233` / `sensors/amadeus-model-completeness.md:8` / `run-model-check-artifacts.ts:129` / `tla-authoring.ts:830,838` / t448 `:2-3`,`:74-82`,`:294-307` / `t-formal-verif-canonical-core.test.ts:96`）は observed で一致した。`tla-model-loader-internal.ts:298-300` は宣言 `:287` / 判定 `:299` / drift 返却 `:300` へ細分され、`amadeus-sensor-model-completeness.ts:733-776` は `:733-775`（末尾 1 行差）である。
