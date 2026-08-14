# コード構造

## core/tools のファイル増減（260814-fmc-macos-provider、現在、observed `5f6b5bf97`）

**観測 ref**: observed = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`、差分 base = `89532174c30ef9cc7ff29496cd6916586fdda00a`（9 commits）。

`packages/framework/core/tools/` の構成は base..observed で次のとおり変化した。モジュール移動はない。

| 変化 | パス | 由来 |
|---|---|---|
| 追加 | `packages/framework/core/tools/amadeus-lifecycle-guard.ts`（236 行） | `0fbbec42b` / #2986 |
| 削除 | `packages/framework/core/tools/team-up.sh` | `8b6089275` / #2975 |
| 削除 | `packages/framework/core/tools/team-up-codex-safety-wait.ts` | 同上 |
| 削除 | `packages/framework/core/tools/team-msg.sh` | 同上 |

削除に伴い e2e の 3 ファイルも消えた（`git diff --numstat 89532174c..HEAD -- tests/e2e`: `t-team-up-codex-safety-wait-live.serial.test.ts` −222 / `t-team-up-member-readiness.serial.test.ts` −204 / `t267-clean-env-team-mode.serial.cli.test.ts` −443、計 **−869**）。文書面は `docs/reference/26-lifecycle-guard-runtime.md`（+222）と `.ja.md`（+214）が新設され、`docs/guide/20-team-mode{,.ja}.md` と `docs/guide/team-messaging{,.ja}.md` は縮小した。8 harness への `coreDirs.tools` 投影という構造自体は不変で、投影元の集合が入れ替わっただけである。

本 intent の患部（[Issue #2361](https://github.com/amadeus-dlc/amadeus/issues/2361) / ミラー [#2995](https://github.com/amadeus-dlc/amadeus/issues/2995)）はモジュール配置ではなく `plugins/formal-model-check/tools/` 内の既存関係にあり、当該領域は base..observed で**無変更**である（`git diff --name-only 89532174c..HEAD -- plugins/formal-model-check tests/unit/t-formal-verif-tlc-spawn-planner.test.ts mise.toml` が空出力）。`tlc-spawn-planner` の実体は tracked 2 ファイルのみ（正本 + unit test、`git ls-files | grep "tlc-spawn-planner"`）で、**dist 投影も複製もない**。

## Focus Area: テスト基盤の `dist/` 依存と env 伝播（260814-t528-ambient-isolation、現在、observed `5f6b5bf97`）

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

## Focus Area: team-up ランチャ廃止（260813-remove-team-up、履歴、observed `97581b3e3`。**この表が挙げる 4 パスは撤去前の断面**であり、observed `5f6b5bf97` にはいずれも存在しない）

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
