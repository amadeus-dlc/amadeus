# Build Instructions — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../answer-tag-vocab-fix/code-generation/code-generation-plan.md`(検証列・統制)、`../answer-tag-vocab-fix/code-generation/code-summary.md`(出荷物・実測)。測定 ref: bolt head 66f8c885b(PR #1153、origin/main a4a33e59a 起点)。2026-07-17。

## ビルド手順

コード変更は canonical 1文字+regen(専用ビルドなし)。標準面のみ:

1. `bun install --frozen-lockfile`(devDependencies 整備)
2. `bun scripts/package.ts`+`bun run promote:self` — 9コピー機械同期(実施済み — code-summary)

## ビルド検証(fresh 実測、bolt head)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0(9コピー in sync) |
| `bun run promote:self:check` | 0 |
