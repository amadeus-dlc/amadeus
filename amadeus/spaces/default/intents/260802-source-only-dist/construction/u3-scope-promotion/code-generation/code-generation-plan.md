# Code Generation Plan — u3-scope-promotion

## 実装前提

- 変更種別は `self-feature`。対象 Unit は FR-0 の正本昇格だけに限定し、`dist/` とセルフインストール面は正本変更後に生成コマンドで同期する。
- 正本は `packages/framework/core/scopes/` と `packages/framework/core/amadeus-common/stages/**`。`scope-grid.json` は stage frontmatter の `scopes:` membership から compile 導出し、手書きしない。
- 移行前 `.claude` の15-key gridを固定 fixture として保存し、compiler と独立した oracle にする。composed scope の追加 row / plugin 固有 stage cell は既存 merge 境界で保持する。
- テスト戦略は scope 定義どおり **Comprehensive**。変更した正本、compile、全 projection、sensor、composed extras、lint/typecheck/drift を一続きで検証する。

## 実装手順

- [x] **Step 1 — 独立 oracle と Red テストを追加する**
  - 移行前15-key grid fixtureを `tests/fixtures/` に固定する。
  - core scope 15種、5昇格 scope の全 canonical stage cell、全 projection の15-key一致、scope prose一致を検証する integration test を追加する。
  - stage membership を故意に欠いた現行 core に対して対象テストが失敗することを実測する。
  - 実測: `bun test ./tests/integration/t-scope-promotion-canonical.test.ts` は 0 pass / 4 fail / exit 1。core から5 scope、projection から installer-distribution、scope file正本が欠落している差分を報告した。
- [x] **Step 2 — 5 scope を core 正本へ昇格する**
  - self-feature / self-fix / self-refactor / self-document / installer-distribution を `.claude/scopes/` の移行前 byte と同一内容で `packages/framework/core/scopes/` に追加する。
  - fixture と正本の内容差をテストで loud fail にする。
- [x] **Step 3 — stage membership から15-key gridを導出する**
  - 32 canonical stage の frontmatter `scopes:` に、fixture の EXECUTE cell と一致する5 scope membershipを追加する。
  - grid JSON を直接編集せず、`bun scripts/package.ts` の compile 経路で全 dist projection を再生成する。
- [x] **Step 4 — self-scope-consistency を全面対称へ更新する**
  - 5 dogfood face が5昇格 scopeのファイル・grid row・canonical stage cellで一致することを検証する。
  - installer-distribution を監視対象へ加え、plugin/composed extras を破壊しない既存境界を維持する。
- [x] **Step 5 — Green と包括検証を完了する**
  - 対象 integration/unit tests、sensor test、package/promote drift checks、lint、typecheckを実行する。
  - cold timeout の場合だけ対象 file を `bun test --timeout 120000 <file>` で単独再実行する。
  - plan の checkbox と `code-summary.md` を実測結果で即時更新する。
  - 実測: 対象10 filesは233 pass / 0 fail、全CI初回は755 filesを完走して旧10-scope固定期待値4 files / 6 assertionsだけを検出した。期待値とcoverage registryを15-scopeへ更新後、該当5 filesは91 pass / 0 fail。cold timeoutは発生しなかった。
  - 実測: smoke全15 filesは364 assertions / 0 fail、scope/compose関連34 filesは257 assertions / 0 fail。lint / typecheck / package drift / promote-self drift / coverage freshness / `git diff --check` はすべてexit 0。

## FR-0 traceability

| 要件 | 実装面 | 検証 |
|---|---|---|
| FR-0.1 | core scopes へ5定義追加、packager discovery による全投影 | scope file count=15、採用源 byte一致、全 face presence |
| FR-0.2 | 32 canonical stage の `scopes:` membership | 移行前15-key fixtureとの全 canonical cell一致、全 projection deep-equal |
| FR-0.3 | self-scope-consistency manifest / TypeScript evaluator | sensor unit/integration test、real dogfood faces pass |
| BR-U3-6 | `mergeScopeGrid` / `scopeGridInSync` は不変 | t370 composed extras / prototype-named extras / idempotence |
| BR-U3-7 | 独立 fixture oracle | 故意の membership 欠落による Red、正本実装後の Green |

## Comprehensive test strategy

- **Characterization / oracle:** 移行前15-key fixtureを実装から独立して固定し、scope key集合と5昇格 scopeの全 canonical stage cellを比較する。
- **Unit:** self-scope-consistency の pass、missing、unexpected、body/cell mismatch、malformed input、CLI flag validationを検証する。
- **Integration:** core正本→compile→全 dist projection→dogfood promotion の同一性を検証する。
- **Regression:** composed extras の保持、plugin固有 stage cell の保持、prototype名 scope、merge冪等性を既存 t370 で維持する。
- **Negative proof:** fixtureがEXECUTEを要求する stageから対象 membershipを1件故意に欠いた状態で新規テストが非0になることを記録する。
- **Quality gates:** Biome lint、strict typecheck、package drift、promote-self drift、対象 test suiteをすべて blocking とする。

## Test configuration

| 層 | コマンド / 設定 | 合格条件 |
|---|---|---|
| 対象 integration | `bun test ./tests/integration/t-scope-promotion-canonical.test.ts ./tests/integration/t-self-scope-consistency-sensor.test.ts ./tests/integration/t413-self-scope-face-parity.test.ts` | 全 test pass、対象3 files実在 |
| composed extras | `bun test ./tests/unit/t370-promote-self-scopegrid-order.test.ts` | 全 test pass |
| projection 生成 | `bun scripts/package.ts`、`bun run promote:self` | 正規コマンド exit 0 |
| drift | `bun scripts/package.ts --check`、`bun run promote:self:check` | 問題0件 |
| static | `bun run lint`、`bun run typecheck` | exit 0（既存 complexity warning は既定 baseline と照合） |
| timeout fallback | `bun test --timeout 120000 <affected-file>` | cold timeout の対象 file が単独 pass |
