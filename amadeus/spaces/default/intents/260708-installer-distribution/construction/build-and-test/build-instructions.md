# Build Instructions — installer-distribution

> ステージ: build-and-test (3.6) / 作成: 2026-07-09 / lead: quality(support: devsecops)
> 出典: 各 Unit の `../*/code-generation/code-generation-plan.md` と `code-summary.md`(U1 Step 1/9、U4 の pack 前提)、ADR-002

## 依存とセットアップ

- 前提: bun(ツールチェーン唯一の要求 — ランタイム依存ゼロは NFR-005)。Node ≥18.3 は npx 実行検証時のみ
- `bun install` — ワークスペース(root+packages/setup)の dev 依存を解決(bun.lock 準拠)
- 環境変数: 通常ビルドでは不要。実ネットワーク E2E のみ `AMADEUS_SETUP_E2E_NETWORK=1`(リリース手順書 docs/guide/publishing-setup.md 章3 が設定者)

## ビルドコマンド

- インストーラ本体(ADR-002): `cd packages/setup && bun build src/cli.ts --target=node --format=esm --outfile dist/cli.js`(shebang 付与込みの正準手順は `tests/lib/setup-lazy-build.ts` の `ensureSetupCliBuilt()` — テストはこれを唯一の取得経路とする)
- framework dist(インストーラ変更では不要): `bun scripts/package.ts` → `bun run promote:self`

## ビルド検証

- `bun run typecheck`(2構成: tsconfig.json + tsconfig.tests.json)
- `bun run lint`(Biome、スコープ: tests/ + packages/setup/)
- `bun run dist:check` / `bun run promote:self:check`(配布物・セルフインストールのドリフトガード)

## トラブルシューティング

- **ステールバイナリ**: `packages/setup/dist/cli.js` は「不在時のみビルド」で供給されるため、ブランチ切替・cli 置換後は削除してから実行する(project.md Corrections — 2回観測済みの偽緑/偽赤源)
- bun が非対話シェルで見つからない場合は ~/.zshenv 等の PATH を確認(CLAUDE.md 記載)
