# Build Instructions — tie-choice-resolution

上流入力: `construction/tie-choice-resolution/code-generation/code-generation-plan.md`、`construction/tie-choice-resolution/code-generation/code-summary.md`。

## 前提と環境

- Bun と Node.js/TypeScript toolchain はリポジトリの `package.json` / lockfile を使用する。
- 外部サービス、環境変数、秘密情報、データベースは不要。
- 依存が未導入の場合だけ `bun install --frozen-lockfile` を実行する。既存 worktree では導入済み依存を再利用する。

## Build と検証

1. `bun run typecheck` — core と tests の TypeScript 型検査。
2. `bun run lint` — Biome による source/test 静的検査。
3. `bun run dist:check` — committed dist と正本の drift がないことを確認。
4. `bun run promote:self:check` — self-install 投影の drift がないことを確認。

すべて exit 0 を完成条件とする。型エラーは対象 file:line を修正して再実行し、dist drift は正本・manifest 所有関係を確認してから生成する。今回の変更は配布対象外の `scripts/` と SKILL 3面であり、設計どおり dist 再生成は不要である。
