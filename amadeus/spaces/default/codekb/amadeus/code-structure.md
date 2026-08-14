# コード構造

## Focus Area: undefined 形の回帰テストが要求するシーム（260814-ambient-error-sink、現在、observed `6e94189de`）

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
| `plugins/pr-convergence/` | plugin bundle | stage、sensor、GitHub adapter、predicate、ledger、CLI |
| `scripts/` | build/distribution | `dist/<harness>/` 生成、self promotion、distribution verification |
| `tests/` | verification | smoke、unit、integration、e2e、conformance、formal-verif、fixtures |
| `amadeus/spaces/` | workflow records | Intent state、audit、stage artifacts、共有 CodeKB |
| `.codex/` など | self-install surface | harness ごとのローカル生成・bootstrap 面 |

## Focus Area: PR Convergence

| ファイル | 主な要素 |
|---|---|
| `amadeus/config.json` | plugin activation と4 self-* scope binding |
| `plugins/pr-convergence/plugin.json` | stage bundle、code-generation produces seam、tool inventory |
| `plugins/pr-convergence/stages/pr-convergence.md` | convergence loop と手動 sensor fire の運用契約 |
| `plugins/pr-convergence/tools/pr-convergence-cli.ts` | `create/status/report/override` dispatcher、report renderer/writer |
| `plugins/pr-convergence/tools/pr-convergence-gh-runner.ts` | `gh` process adapter、GraphQL snapshot parser |
| `plugins/pr-convergence/tools/pr-convergence-predicate.ts` | merge/lifecycle/convergence の純粋判定 |
| `plugins/pr-convergence/tools/pr-convergence-ledger.ts` | paged review thread の分類と集計 |
| `plugins/pr-convergence/tools/pr-convergence-provenance.ts` | PR title/body の Intent/Bolt/Unit provenance 検証 |
| `plugins/pr-convergence/tools/pr-convergence-presentation.ts` | canonical PR title/body の生成 |
| `plugins/pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts` | report shape の独立 parser |
| `plugins/pr-convergence/sensors/amadeus-pr-convergence-report-format.md` | advisory sensor manifest |
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

## Issue #2985 の患部配置（現在、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`）

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
