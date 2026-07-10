# Build Instructions — gate-mechanics-batch

> 上流: `construction/sibling-worktree-guard/code-generation/code-generation-plan.md` / `code-summary.md`(#670)、`construction/delegate-rejection/code-generation/code-generation-plan.md` / `code-summary.md`(#685)。両 Bolt は PR #727 / #729 として main へスカッシュマージ済み。

## 依存インストール

- ランタイム: Bun(TypeScript/ESM 直接実行、コンパイル工程なし)
- 手順: リポジトリルートで `bun install`(約1秒、257 packages)
- 前提: `bun` が非対話シェルの PATH にあること(`~/.zshenv`)

## 環境セットアップ

- 追加の env・ローカルサービス・設定ファイルは不要(フレームワークはファイルシステムのみに依存)
- テストは一時ディレクトリ fixture を自前で構築するため手動セットアップなし

## ビルドコマンド

このリポジトリに古典的なビルド(コンパイル/バンドル)はない。「ビルド」に相当するのは生成物同期と静的検査:

| 目的 | コマンド | 合格基準 |
|---|---|---|
| 型検査 | `bun run typecheck`(tsc --noEmit) | exit 0 |
| リント | `bun run lint`(Biome) | exit 0(エラー0) |
| dist 生成物同期 | `bun run dist:check`(package.ts --check) | exit 0(drift なし) |
| セルフインストール同期 | `bun run promote:self:check` | exit 0(drift なし) |

正本(`packages/framework/core/`)を編集した場合のみ `bun scripts/package.ts` + `bun run promote:self` で再生成する(本ステージは検証のみで再生成不要)。

## ビルド検証手順

1. `bun install` → exit 0
2. 上表4コマンドを順に実行し、すべて exit 0 を確認
3. いずれかが非零の場合: typecheck/lint はエラー出力の file:line を読む。dist:check/promote:self:check の drift は正本と生成物の不一致 — 手編集の混入を疑い `git diff dist/ .claude/ .codex/` を確認

## トラブルシューティング

- `which bun` が失敗 → 非対話シェルの PATH 設定(`~/.zshenv`)を確認
- dist:check が赤 → `dist/<harness>/` の手編集は Forbidden。正本を直して `bun scripts/package.ts` で再生成
- 遅延ビルドヘルパー(ensureSetupCliBuilt 等)を跨ぐ検証ではステールバイナリに注意(`packages/setup/dist/cli.js` を削除してから再実行)
