# Build Instructions — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/ — 検証対象の Steps・FR 対応・実測 exit code の導出元)。

## ビルド手順

本変更(code-generation-plan.md Step 8)のビルドは配布物生成で構成する。ブランチ `fix/1547-1534-mirror-read-unification`(worktree `.claude/worktrees/mirror-state-split`)で:

1. `bun scripts/package.ts` — 正本(packages/framework/)から dist/ を再生成
2. `bun run promote:self` — セルフインストールツリーへ反映
3. ドリフトガード: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 実測 — code-summary.md 検証表)

## 前提

- bun 1.3.x(リポジトリ標準)。追加の外部依存なし(code-summary.md の変更ファイル一覧に依存追加なし)
