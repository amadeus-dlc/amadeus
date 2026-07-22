# Code Generation Plan — reference-plugin-and-guides (U11)

> 上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`reliability-design.md`、`scalability-design.md`、`security-design.md`。

## 目的

U11 は C4/C7 の reference 面。`test-pro` 最小 reference plugin、authoring source → 6 ハーネス投影 → compose → doctor → drop の単一 E2E fixture、利用者向け reference/authoring guide を提供する。新 runtime API は追加せず、U01/U09/U10 の公開 contract を利用者視点で実証する(FR-6 items 21–22)。

## Baseline 判断(最重要)

要件は「plugin 0 件で byte-identical」。実測: `scripts/package.ts` の実ビルド経路は repo-root `plugins/` を `discoverPluginSources(pluginsRoot())` で discover し、6 dist ツリー + neutral bundle へ投影する(`projectPluginsIntoHarnessTree` :306、neutral bundle :765)。現状 repo-root に `plugins/` は存在せず、dist は 0-plugin baseline(byte-identical)。

FD は fixture の filesystem path を **実装詳細・非契約**と明示する(business-logic-model「fixture filesystem path は実装詳細であり公開 contract にしない」、domain-entities「具体 slug、文言、fixture path は identity contract に含めない」)。かつ AC は「temp dir へ build→compose→doctor→drop」「tracked tree へ一時生成物を残さない」と規定する。

→ 判断: canonical `test-pro` source は **`tests/fixtures/plugins/test-pro/`** に置く(`plugins/<name>/` authoring レイアウトを鏡写しにするが、実 `package.ts` の discover 対象外)。これにより:
- repo-root `plugins/` は不在のまま = 0-plugin dist baseline を**文字どおり不変**に保つ(`dist:check`/`promote:self:check` は再生成不要で green)。
- test-pro を shipped distribution へ混入させない(test/reference plugin を全ハーネス dist・self-install へ出荷しない)。
- 6 面投影 + compose/doctor/drop の lifecycle は AC どおり **temp dir 内**でのみ実行(`AMADEUS_PLUGINS_ROOT`/`AMADEUS_DIST_ROOT` redirect + node backend temp host)。

Biome は `tests/fixtures/**` を lint 除外(biome.json :27)、docs は harness manifest coreDirs 外で dist 非対象。よって本 Unit は正本(core/harness/scripts)を変更せず、`bun scripts/package.ts`/`promote:self` の再生成を要さない。

## 成果物

1. `tests/fixtures/plugins/test-pro/plugin.json` — U01/U09 が受理し U10 が parse する manifest。1 stage(owned copy)、1 seam(`code-generation`.`sensors`)、1 fragment。
2. `tests/fixtures/plugins/test-pro/stages/test-pro-review.md` — 宣言 stage 本文。`{{HARNESS_DIR}}` トークンを含み投影 transform を観測可能にする。
3. `tests/fixtures/plugins/test-pro/skills/test-pro.md` — prose 投影(token + rules-rename)を観測する追加 artifact。
4. `tests/integration/t254-reference-plugin-lifecycle.test.ts` — 単一 E2E(medium/integration、fs-tests-integration-first)。
5. `docs/guide/19-plugins.md` + `docs/guide/19-plugins.ja.md` — 利用者向け reference + authoring guide(英語正本 + 日本語 pair)。

## t254 fixture 設計(単一 integration fixture)

`AMADEUS_PLUGINS_ROOT`/`AMADEUS_DIST_ROOT` を temp workspace へ redirect(U09 の hermetic パターン踏襲、afterAll で復元・temp 削除)。canonical `tests/fixtures/plugins/test-pro/` を temp plugins root へコピー。

- Part A(6 面投影・table-driven): 0-plugin baseline(空 root → `checkNeutralBundle()==[]`・dist/plugins 未生成)→ 6 `PACKAGE_HARNESSES` それぞれ `buildPluginProjection` が宣言 path 集合のみを決定生成(2 回呼び冪等)→ claude/kiro の token/rules-rename transform 実測 → `.json` verbatim → `writeNeutralBundle`+`checkNeutralBundle()==[]` → self-install closed 4。
- Part B(compose→doctor→drop): claude 投影 artifact を temp claude-bundle へ書き、`discoverPlugins` で claude-transformed バイト(`.claude` 展開済み)を取得 → temp host(`createNodeBackend`、`code-generation` stage-seams file + anchor 付き `SKILL.md`)へ `inspectPlugin`→`applyPluginPlan`→`diagnosePlugins`→`planPluginDrop`→`applyPluginDrop`。宣言成果物のみ生成・検出・除去、shared file は base バイトへ復元、composition 空へ。
- Part C(failure invariants): owned path 先置きで clobber reject → 三面不変。temp-verify failure → 三面 byte 不変・journal 不在。
- Part D(no residue): 実 repo `plugins/`・`dist/plugins` 不在を assert(0-plugin baseline 不変)。temp は afterAll で削除。

## 検証(同期・パイプなし・exit code 実測)

`bun test tests/integration/t254-reference-plugin-lifecycle.test.ts`(path 実在 + `Ran ... across 1 files` 照合)、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bun tests/complexity-gate.ts --check`、`bun tests/gen-coverage-registry.ts --check`、`bash tests/run-tests.sh --ci`。local lcov で patch 追加行未カバー0(本 Unit は新 runtime 行を追加しない = coverage 対象追加行なし)。`git status` で tracked tree に一時生成物ゼロを実証。

## 制約遵守

marketplace/lockfile/agents/scopes/memory/knowledge/`when` 評価を持ち込まない。新 runtime API・第二 parser・後方互換シムを追加しない。宣言逸脱(既存様式準拠含む)は実装前停止・報告。
