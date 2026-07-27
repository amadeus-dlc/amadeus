# Build Instructions — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 全8ユニットの code-generation-plan.md(実装順序・検証コマンド)と code-summary.md(変更ファイル・dist 再生成の要否)から、ビルド対象面(正本 → dist 7ハーネス → self-install)とビルドコマンドを導出した。

## 依存インストール

- ランタイム: Bun(1.3 系で検証。`curl -fsSL https://bun.sh/install | bash`)
- 依存: リポジトリルートで `bun install`(typescript / @biomejs/biome 等の devDependencies が入る。`node_modules/.bin/tsc` が無いと typecheck が exit 127 になる — 本セッションで実測)

## 環境セットアップ

- 環境変数・ローカルサービスは不要(CLI/ファイル境界のみ)
- git repository 直下で実行すること(dist drift ガードが git 管理面を比較する)

## ビルドコマンド

このプロジェクトのビルドは「正本 → 生成物の再生成」である:

1. `bun scripts/package.ts` — 正本(packages/framework/core/ / harness/<name>/)から dist/ 7ハーネス(claude, codex, cursor, opencode, kimi, kiro, kiro-ide)+ dist/plugins/ 投影を再生成
2. `bun run promote:self` — セルフインストールツリー(.claude/ ほか)へ反映

## ビルド検証

- `bun run typecheck`(tsc --noEmit ×2 tsconfig)— 実測 exit 0
- `bun run lint`(Biome)— 実測 exit 0
- `bun run dist:check` — 実測 exit 0(dist drift なし)
- `bun run promote:self:check` — 実測 exit 0(self-install drift なし)

## トラブルシューティング

- `tsc: command not found`(exit 127)→ `bun install` 未実行。ツリーごとに node_modules が必要
- dist:check DIFFERS → 正本変更後の `bun scripts/package.ts` 再実行漏れ。7ハーネス全てが対象(5面で止めると kiro/kiro-ide が DIFFERS — project.md 既定)
- distribution writer lock timeout(5秒)→ `.amadeus/distribution-transaction/readers/` に DEAD PID の stale reader が残存している場合は除去(本セッションで実測・回復)
