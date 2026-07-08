# リバースエンジニアリング実施記録

## 実行メタデータ

- Date: 2026-07-08
- Intent: `260708-installer-distribution`
- Scope: `installer-distribution`
- Repository: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.claude/worktrees/installer-distribution`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(前回スキャンコミットからの差分更新。project.md 是正事項 cid:reverse-engineering:c1 に従う)
- Base commit: `bc9a6043`(前 intent `260707-layout-normalization` のベースライン、`amadeus/spaces/default/codekb/amadeus/` に記録)
- Observed commit: `8510281ae`
- Focus: installer/distribution 資産(`scripts/package.ts`、`scripts/promote-self.ts`、`dist/` 構造、バージョン管理)。project.md 是正事項 cid:reverse-engineering:c2 に従い重点スキャンした

## 分析範囲

`git diff --name-status bc9a6043..HEAD` は675ファイルの変更を示した(`amadeus/` 229、`core/` 203〈全て削除=移動〉、`docs/` 170、`harness/` 58〈全て削除=移動〉、`packages/` 以下223ファイルの追加、その他 `package.json`/`tsconfig.json`/`scripts/package.ts`/`scripts/promote-self.ts`/`README.md`/`AGENTS.md`/`CLAUDE.md`/`bun.lock`/`CHANGELOG.md`)。`git diff -M50` で250ファイルが R100(完全 rename)、9ファイルが R097–R099(harness の相対 import 深さのみの差分)と確認され、layout-normalization intent によるロジック変更を伴わない純粋な移動であることを検証した。

スキャン対象は次の通り。

- `scripts/package.ts`、`scripts/promote-self.ts`、`scripts/manifest-types.ts`
- `packages/framework/package.json`(新規存在の確認)
- root `core`/`harness` のシンボリックリンク実体(スキャン時点。直後の PR #644 で削除 — 下記追記参照)
- `.github/workflows/ci.yml`
- root `package.json`(license/repository/workspaces)
- `packages/framework/core/tools/amadeus-version.ts`(`AMADEUS_VERSION`)
- `CHANGELOG.md`、`README.md`(バージョンバッジ)
- `git tag -l` の実行結果(0件)
- `dist/`(claude/codex/kiro/kiro-ide)
- `tests/harness/fixtures.ts` の `AMADEUS_SRC` anchor
- テストファイル数(smoke 12/unit 120/integration 100/e2e 64、計296)

## 鮮度に関する注記

ベースライン `amadeus/spaces/default/codekb/amadeus/`(2026-07-07、commit `bc9a6043` でスキャン)は「`packages/` が checkout に不在であり、root `core`/`harness` が source of truth である」という前提のもとで書かれていた。この前提は本スキャン時点で **stale** である。

`260707-layout-normalization` intent のマージにより次が変化した。

- `packages/framework` が実在し、`packages/framework/core`・`packages/framework/harness/<name>` が物理 source になった。
- root `core`・root `harness` は `packages/framework/{core,harness}` を指すシンボリックリンクになった(authored source ではなく互換レイヤー)。

## 追記(2026-07-08 リベース後)

- スキャン直後に upstream PR #644(`f3713466b`、`bb0b2c3a3`)が root `core`/`harness` symlink を削除。`packages/framework/{core,harness}` が唯一の参照先となり、biome/knip/tsconfig/tests の参照も直接パスへ更新された。本 codekb の symlink 記述は同日この追記とともに差分修正済み。観測コミットはリベース後の origin/main 先端(`f3713466b`)ベース。
- `packages/framework/package.json`(`@amadeus-dlc/framework`, private:true, 0.0.0)が新設されたが、独自ビルドロジックは持たず、`dist`/`dist:check`/`promote:self`/`promote:self:check` はすべて `../../scripts/*.ts` への委譲。
- root `scripts/`(実行可能な source of truth)、`dist/`、`tests/` は root に残ったまま変化していない。

`packages/setup` は依然として不在(`ls packages/` → `framework` のみ)であり、この intent `260708-installer-distribution` が新設する対象である。

本リフレッシュは、ベースライン codekb の「`packages/` 不在」という前提を上記の通り置き換え、それ以外の manifest 契約・drift guard 機構・preservation rules 等の記述は正確性を維持したまま継承した。

## 更新した成果物

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `reverse-engineering-timestamp.md`
