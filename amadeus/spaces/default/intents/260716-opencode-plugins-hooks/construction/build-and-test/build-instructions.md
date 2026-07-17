# Build Instructions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../code-generation/code-generation-plan.md`(検証列・統制)、`../code-generation/code-summary.md`(出荷物・検証結果・レビュー)。2026-07-17。

## ビルド手順(本 Bolt の実手順)

本 Bolt の出荷物は docs+record(コード変更ゼロ — code-summary.md)のため、専用ビルドは存在しない。リポジトリ標準のビルド面のみが対象:

1. `bun install --frozen-lockfile` — 依存整備(tsc 等の devDependencies。未整備だと typecheck が exit 127 になる — 本ステージで実測)
2. `bun scripts/package.ts` — dist regen(本 Bolt は docs/guide 非配布につき **regen 不要** — manifest 実測は code-summary.md 参照。ドリフト検査で機械確認)

## ビルド検証(fresh 実測、main 取込済みツリー 0a1c5a328)

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0(初回 127 は node_modules 未整備の環境起因 — 実文「tsc: command not found」で帰属確定、bun install 後 0) |
| `bun run lint` | 0 |
| `bun run dist:check` | 0(全ハーネス in sync) |
| `bun run promote:self:check` | 0(self install in sync) |
