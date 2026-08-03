# Build Instructions — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): code-generation-plan.md(全6 unit — 各 Bolt の実装方針・TDD・検証計画)、code-summary.md(全6 unit — 着地 PR・実装内容・テスト・実測ゲート・逸脱裁定)

## ビルドの性格

本 intent はライブラリ/CLI であり、専用のビルド成果物は持たない。code-summary.md が記録するとおり、**プロダクション改修は election-readpath unit の1箇所のみ**(`packages/framework/core/tools/amadeus-election-store.ts`)で、それ以外の5 unit はテスト・CI・文書に閉じる。したがって「ビルド」に相当するのは **core 正本から配布物への投影**である。

## 手順

```bash
bun install --frozen-lockfile
bun run typecheck          # tsc --noEmit(本体 + tests)
bun run lint               # Biome(フォーマッタ無効)
bun scripts/package.ts     # dist/ 7ハーネス全ての再生成
bun run promote:self       # セルフインストールツリーへの反映
bun run dist:check         # 生成物のドリフト検査
bun run promote:self:check # セルフインストールの同期検査
```

## 投影の必須条件

code-generation-plan.md(election-readpath)が定めるとおり、core を触る変更では **dist 7ハーネス全て**(claude / codex / cursor / kimi / kiro / kiro-ide / opencode)を再生成する。5面で止めると kiro / kiro-ide が DIFFERS になる。本 intent では Bolt 1 のみがこの条件に該当し、PR #2085 で実施済み。

## 実測(main = `bfc44e062`)

| コマンド | exit |
|---|---|
| `bun install --frozen-lockfile` | 0 |
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
