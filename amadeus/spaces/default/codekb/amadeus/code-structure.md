# コード構造

## Focus Area: team-up ランチャ廃止（260813-remove-team-up、現在、observed `97581b3e3`）

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
