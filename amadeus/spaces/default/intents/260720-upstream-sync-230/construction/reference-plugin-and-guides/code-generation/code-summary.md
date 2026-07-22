# Code Summary — reference-plugin-and-guides (U11)

> 上流入力(consumes全数): `business-logic-model.md`、`business-rules.md`、`domain-entities.md`、`logical-components.md`、`performance-design.md`、`reliability-design.md`、`scalability-design.md`、`security-design.md`。

測定 ref: worktree `bolt-reference-plugin-and-guides`、base HEAD `b58b3789b`(U01/U09/U10 マージ済み)。行数は当該 HEAD の作業ツリーで `wc -l` 実測。

## 実装概要

FR-6 items 21–22 の owner。`test-pro` 最小 reference plugin、authoring source → 6 ハーネス投影 → compose → doctor → drop の**単一 integration fixture**、利用者向け reference/authoring guide を提供。新 runtime API は追加せず、U01(構造検証)・U09(投影)・U10(合成)の既存公開 contract のみを消費する。

## 変更ファイル一覧(実測)

| ファイル | 行数 | 役割 |
|---|---|---|
| `tests/fixtures/plugins/test-pro/plugin.json` | 17 | canonical manifest(1 stage / 1 seam=`code-generation`.`sensors` / 1 fragment) |
| `tests/fixtures/plugins/test-pro/stages/test-pro-review.md` | 10 | 宣言 stage 本文(`{{HARNESS_DIR}}` トークンで投影 transform を観測可能化) |
| `tests/fixtures/plugins/test-pro/skills/test-pro.md` | 5 | prose 投影(token + rules-rename)観測用 artifact |
| `tests/integration/t254-reference-plugin-lifecycle.test.ts` | 365 | 単一 E2E fixture(medium/integration)。9 tests, 63 expect |
| `docs/guide/19-plugins.md` | 143 | 利用者向け reference + authoring guide(英語正本) |
| `docs/guide/19-plugins.ja.md` | 135 | 同 日本語 pair |

合計 675 行(reference source 32、tests 365、docs 278)。U11 概算 605–990 行の範囲内。正本(`packages/framework/core`・`harness`・`scripts`)は無改修 = dist/self-install 再生成不要。

## Baseline 判断(明記)

要件「plugin 0 件で byte-identical」に対する判断を確定した。`scripts/package.ts` の実ビルドは repo-root `plugins/` を discover し 6 dist ツリー + neutral bundle へ投影する(`projectPluginsIntoHarnessTree` :306、neutral bundle :765、call-time env `AMADEUS_PLUGINS_ROOT`/`AMADEUS_DIST_ROOT` override :75-79)。

canonical `test-pro` source を repo-root `plugins/` ではなく **`tests/fixtures/plugins/test-pro/`** に配置した(FD が「fixture filesystem path は実装詳細・非契約」と明示、business-logic-model / domain-entities)。効果:

- repo-root `plugins/` は不在のまま → 実 dist は 0-plugin baseline を**文字どおり byte-identical**に維持(`dist:check` は再生成ゼロで OK、実測 exit 0)。
- test-pro を shipped distribution(6 dist・4 self-install)へ混入させない。
- 6 面投影 + compose/doctor/drop は AC どおり **temp dir 内**でのみ実行(`AMADEUS_PLUGINS_ROOT`/`AMADEUS_DIST_ROOT` redirect + `createNodeBackend` temp host)。`git status` で dist 変更ゼロ・repo-root `plugins/` 不在・`dist/plugins` 不在を実証(Part D の in-test assert とも二重確認)。

## 実装契約(t254 が実証)

- **Part A(6 面投影)**: 0-plugin baseline(空 root → `checkNeutralBundle()==[]`・dist/plugins 未生成)。6 `PACKAGE_HARNESSES` すべてが宣言 path 集合 `{plugin.json, skills/test-pro.md, stages/test-pro-review.md}`(namespaced)のみを**決定生成**(2 回呼び byte 一致)。claude=`.claude`/`.claude/rules/`、kiro=`.kiro`/`.kiro/steering/` の token + rules-rename transform 実測。`.json` verbatim。neutral bundle 書込 → drift-clean。self-install は closed 4(kiro/kiro-ide 非昇格)。
- **Part B(compose→doctor→drop)**: claude 投影バンドルを `discoverPlugins` で読み戻し(`.claude` 展開済みバイト)、temp host(`code-generation` stage-seams + anchor 付き `SKILL.md`)へ `inspectPlugin`(ready)→`applyPluginPlan`(committed)→`diagnosePlugins`(composed)→`planPluginDrop`+`applyPluginDrop`(committed)。宣言成果物のみ生成・検出・除去、shared file は base バイトへ復元、composition 空へ。
- **Part C(failure invariants)**: owned path 先置きで clobber reject → 三面(host bytes/record/audit)不変。temp-verify failure → 三面 byte 不変・journal 不在。
- **Part D(no residue)**: 実 repo `plugins/`・`dist/plugins` 不在を assert。

## 検証コマンドと実測 exit code

| コマンド | exit | 備考 |
|---|---|---|
| `bun test tests/integration/t254-reference-plugin-lifecycle.test.ts` | 0 | 9 pass / 0 fail / 63 expect、`Ran 9 tests across 1 file`(path 実在機械確認済み) |
| `bun run typecheck` | 0 | tsc `tsconfig.json` + `tsconfig.tests.json` |
| `bun run lint:check` | 0 | Biome、214 warnings は全て既存(t254 由来 0 件)。fixtures は biome ignore |
| `bun run dist:check` | 0 | 全 harness ツリー in sync(0-plugin baseline 不変) |
| `bun run promote:self:check` | 0 | self install in sync |
| `bun tests/complexity-gate.ts --check` | 0 | |
| `bun tests/gen-coverage-registry.ts --check` | 0 | registry fresh、guards green、ratchet held(t254 の `// covers:` 認識済み) |
| `bash tests/run-tests.sh --ci`(1 回目) | 1 | `t-team-up-codex-resume.test.ts:706`(safety-wait subprocess race)1 assertion のみ赤 |
| `bun test tests/integration/t-team-up-codex-resume.test.ts`(solo) | 0 | 54 pass / 0 fail(並列負荷起因の flake と確定) |
| `bash tests/run-tests.sh --ci`(2 回目) | 0 | RESULT: PASS(414+ files) |

CI 1 回目の単一赤は U11 と無関係の既存 subprocess race(`FAKE_SAFETY_WAIT_FAIL_ROLE=e3` の exit code 期待、2335ms)。assertion 実文を読み(`expect(result.exitCode).not.toBe(0)`)、変更ファイルが team-up/codex/supervisor を一切触らないことを確認、solo 54/54 pass と CI 2 回目 green で load-induced flake と再帰属(rerun-red-reattribution / local-ci-red-assertion-verbatim)。本 Unit で新規導入した flake ではない。

patch 追加行未カバー: 本 Unit は `scripts/`・`packages/framework/core` に新規行を追加しない(test/fixture/docs のみ)ため patch 計測対象の追加行は 0。coverage-patch-gate は CI 2 回目 green に含まれる。

## 既知の制約 / 判断

- 落ちる実証: t254 は新設ゲート(false-green しうる決定的チェック)ではなく挙動テスト。63 の expect は実投影/実合成バイトに対する具体 assert で、U09/U10 契約が退行すれば loud に赤化する(例: `.claude` 存在 AND `{{HARNESS_DIR}}` 不在 — token 置換退行で反転)。非空性(non-vacuity)は全 assert が実データを消費する構造で担保。人工的な production コードへの failure injection は行っていない(ゲートでないため対象外)。
- 制約遵守: marketplace/lockfile/agents/scopes/memory/knowledge/`when` 評価を持ち込まず、guide の deferred 節で明示的に非サポートと記載。新 runtime API・第二 parser・後方互換シムなし。
- docs は t174(legacy token)・t199(foreign prefix)ゲートを CI で通過。英語正本 + 日本語 pair の既存規約に準拠。
- 逸脱: なし。canonical source の配置は FD が明示した非契約実装詳細の範囲内で決定した(仕様逸脱ではない)。
