# Build Instructions — intent 260815-priority-bug-batch-2

> Depth Minimal(コマンドと環境変数のみ)。対象は `construction/priority-bug-batch-2/code-generation/code-generation-plan.md` と `code-summary.md` が記す修正一式(PR #3101 として main 着地済み)。

## 依存インストール

```bash
bun install
```

- ランタイム: Bun 1.3.13(実測)。Node ランタイム依存なし
- 環境変数: 不要(ビルドは env 非依存)

## ビルドコマンド

```bash
bun run build   # = bun run dist && bun run promote:self
```

- 出力: `dist/<harness>/`(未追跡ローカル生成物)+ セルフインストール面(`.claude/` ほか)の再生成
- 検証: ビルド exit 0 かつ `git status --porcelain` で追跡ファイルが不変であること(正本→生成物の同期契約)

## 型検査・リント

```bash
bun run typecheck   # tsc --noEmit (main + tests の2プロジェクト)
bun run lint        # Biome (tests/ packages/setup/ packages/framework/core/ scripts/ plugins/)
```
