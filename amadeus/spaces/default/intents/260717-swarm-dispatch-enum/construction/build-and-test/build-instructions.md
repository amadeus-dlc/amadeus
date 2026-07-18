# Build Instructions — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): 3 unit の code-generation 成果物(`code-generation-plan.md`・`code-summary.md` ×3)、`requirements.md`、`unit-of-work.md`。

## ビルド手順(既存経路のみ — 新規ビルドステップなし)

1. `bun install --frozen-lockfile`
2. 正本変更時: `bun scripts/package.ts`(dist×6 再生成)→ `bun run promote:self`(self-install 同期)
3. 検証: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check`

## 本 intent での実績

3 Bolt(PR #1204/#1207/#1211)すべてで上記経路のみ使用(`code-summary.md` ×3 の生成物欄どおり、手編集ゼロ)。
