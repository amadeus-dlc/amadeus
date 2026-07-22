# plugin-projection コード生成サマリー(U09 / FR-6 item 19)

## 概要

C5 Distribution Projection を実装した。`plugins/<name>/` の authoring source を発見し、6 ハーネスへ host projection、`dist/plugins/<name>/` に harness-neutral bundle を決定的生成し、byte/orphan/unreferenced/collision drift を検査する。self-install は既存 closed list の4面のみ。plugin 0件では package/compile 出力が baseline と byte-identical。

## 変更ファイル一覧(測定 ref: 割当 worktree 作業ツリー)

| ファイル | 種別 | 規模 | 役割 |
|---|---|---|---|
| `scripts/plugin-projection.ts` | 新規 | 425 行 | C5 projector 本体(4 公開 seam + 内部 helper、純関数/注入 fs) |
| `scripts/harness-transform.ts` | 新規 | 45 行 | core/plugin 共有の prose 変換(token 置換 + rules rename)を1所有者へ抽出 |
| `scripts/package.ts` | 変更 | +111 / −37 | 変換を `harness-transform` から import、plugin projection を加算統合 |
| `tests/unit/t-plugin-projection.test.ts` | 新規 | 323 行 | 純関数 unit(small) |
| `tests/integration/t-plugin-projection-packaging.test.ts` | 新規 | 157 行 | end-to-end integration(medium、env 隔離) |
| `tests/unit/gen-coverage-registry.test.ts` | 変更 | +2 | 既存債務の是正(下記「付随修正」) |

実装計 ≈ 470 行、テスト計 ≈ 480 行。U09 XL 見積り(実装 260–470、component tests 350–620)の範囲内。

## 実装契約(公開 seam)

`component-methods.md` 正準 signature に一致(`ValidPluginSource` 等への置換なし)。`domain-entities.md` に従い `HarnessName` をこの Unit 内で 6面 `PackageHarness` / closed 4面 `SelfInstallHarness` に具体化。

- `discoverPluginSources(root, io)` — `scripts/plugin-projection.ts:171`。`plugins/<name>/` を canonical sort で発見。root 不在 → `[]`(0件 baseline)。
- `buildPluginProjection(plugin, harness)` — `:297`。harness manifest から harnessDir/rulesRename を解決し、prose に token/rules 変換を適用した host artifacts を返す。
- `buildHarnessTree(manifest, plugins)` — `:306`。plugin の host 寄与(expected path 集合と read-set)を返す。plugins 空 → 空集合。
- `checkHarnessTree(name, root?, io?)` — `:374`。commit 済み host surface と再投影を照合し MISSING/DIFFERS/ORPHAN/UNREFERENCED を canonical sort で返す。
- `buildSelfInstallProjection(name)` — `:422`(内部 helper、非公開 seam)。closed 4面を runtime + 型で強制、kiro/kiro-ide を loud reject。

package.ts 側:
- `writeNeutralBundle()` / `checkNeutralBundle()` — `scripts/package.ts:770` / `:784`。`dist/plugins/` の harness-neutral bundle を write/check。
- `projectPluginsIntoHarnessTree(m, treeRoot, readSources)` — buildTree の step 6。`<harnessDir>/plugins/<name>/` へ投影。0件で no-op。
- plugin 発見の source root と neutral bundle の dist root は `AMADEUS_PLUGINS_ROOT` / `AMADEUS_DIST_ROOT` で override 可(call 時読み取り)。テストが実 `plugins/`・`dist/` を汚さず隔離実行するための project-root override(scratch-script-discipline 準拠)。

## 所有境界と決定性

- `plugins/<name>/` = 手書き正本(read-only)。`dist/plugins/`・host projection = generator 所有(clean-sweep 生成)。手編集 dist は DIFFERS/ORPHAN に落ち、source 化しない。
- host projection は namespaced(`plugins/<name>/`)のため既存の byte-diff/orphan スキャンが自動被覆。cross-plugin collision は構造的に不能。
- plugin・artifact・harness・drift をすべて canonical sort。同一 source bytes から同一 projection bytes。

## 検証コマンドと実測 exit code(全フォアグラウンド)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint:check` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| `bun tests/complexity-gate.ts --check` | 0 |
| `bun tests/gen-coverage-registry.ts --check` | 0 |
| `bash tests/run-tests.sh --ci` | 0(408 files、0 failed、5860 assertions) |
| `bun test tests/unit/t-plugin-projection.test.ts` | 0(23 pass) |
| `bun test tests/integration/t-plugin-projection-packaging.test.ts` | 0(6 pass) |

- **byte-identical 実証**: `bun scripts/package.ts`(0件、env override なし)再生成後 `git status --short dist/` が空。`dist/plugins/` は生成されない。
- **local lcov(patch 未カバー0)**: `scripts/plugin-projection.ts` / `scripts/harness-transform.ts` は未カバー0行。`scripts/package.ts` の追加行(`pluginsRoot`/`distRoot`/`repoPlugins`/`projectPluginsIntoHarnessTree`/`neutralBundleExpected`/`writeNeutralBundle`/`checkNeutralBundle`/runCli 追加2行)はすべて in-process 被覆。spawn 盲点回避のためロジックは純関数化。
- **落ちる実証**: integration test が DIFFERS(bundle 改変)・ORPHAN(stray 注入)・MISSING(未 commit surface)を注入 → 検知を assert → clean-sweep 復元 → green を assert する対照を内蔵。

## 実装判断(U09 レーン内・ユーザー可視契約の変更なし)

- host projection 先を `dist/<harness>/<harnessDir>/plugins/<name>/`、neutral bundle を `dist/plugins/<name>/` と定義(要件は path 形状を pin していない設計詳細)。前者は既存スキャンで被覆、後者は U10 の compose 入力。
- 共有 prose 変換を `harness-transform.ts` へ抽出し core/plugin で1所有者に。挙動不変(dist byte-identical で実証)。
- complexity gate 対策として (a) plugin 投影ループを `projectPluginsIntoHarnessTree` へ分離し `buildTree` の CCN を据え置き、(b) comparator を `cmpStr`(balanced `<`/`>`)へ統一。後者は lizard の naive TS parser が unbalanced な `<`/`>` を generic と誤認して関数境界を溶かす既知の罠への対処。

## 付随修正(既存債務)

`tests/unit/gen-coverage-registry.test.ts` の `EXPECTED_NONE_TO_CLI` に `t248-stage-contract-routing` / `t249-workspace-inspection` を追加。両者は先行 Unit(U01/U06)が追加した CLI spawn 型 integration test だが本リストへ未反映で、`--ci` の該当 meta test が赤だった(本 Unit の変更とは無関係の pre-existing 失敗)。安全・低コストな同期のため同一変更で是正した。

## 既知の制約 / Out of Scope

- host composition(core stage/seam への merge)、plugin manifest の意味論 schema、`when` 評価、marketplace、lockfile、agents/scopes/memory/knowledge 投影は U10/U11。本 Unit は source 発見・構造 validation・投影・drift のみ。
- 構造 validation は identity 一意性・path 安全性・manifest 存在・collision の loud reject に限定(manifest 中身の第二 parser は作らない)。
- self-install の実 byte 反映は既存 `promote-self.ts` の closed 4面が担い、U09 はその境界を型 + runtime で固定するのみ(6面へ拡張しない)。
