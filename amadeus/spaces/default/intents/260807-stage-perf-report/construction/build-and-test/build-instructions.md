# Build Instructions — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(実装ステップ 1〜12 とビルド前提を消費)、code-summary(実装成果・依存閉集合・検証 exit code を消費)

## 前提

- **bun**(必須): CLI・フック・テストランナーのすべてが bun 直接実行。PATH 上にあること
- 依存インストール: `bun install --frozen-lockfile` — **本ステージで実測した落とし穴**: `@ast-grep/napi` が未インストールだと no-silent-drop 系 35 テストが `InfraFailure: TOOL_MISSING` で落ちる(コード欠陥と紛らわしい)。フルスイート前に必ず実行する

## ビルド

```bash
bun install --frozen-lockfile
bun run build          # dist/ と self-install 面を再生成(未追跡のローカル生成物)
```

`amadeus-stage-stats.ts` は `packages/framework/core/tools/` にあり、coreDirs 投影で全ハーネス dist へ入る(NFR-4)。正本を編集したら `bun run build` を再実行する。

## 検証手順

```bash
bun run typecheck      # tsc --noEmit(tsconfig.json + tsconfig.tests.json)
bun run lint           # Biome
bun tests/gen-coverage-registry.ts --check
```

## 既知のトラブルシューティング(本ステージ実測)

| 症状 | 原因 | 対処 |
|------|------|------|
| `tsc` が `dist/claude/.claude/tools/amadeus-lib.ts` の export 不在を報告 | `dist/` が正本より古い | `bun run build` を先に実行 |
| no-silent-drop 系が大量に `TOOL_MISSING` | `@ast-grep/napi` 未インストール | `bun install --frozen-lockfile` |
| coverage registry が drift | `dist/` 未生成のまま `--write` すると既存エントリが脱落 | `bun run build` → `--write` → `--check` の順 |
| `bun run typecheck` の exit code が 0 に見える | パイプ越しに `$?` を読んでいる | パイプなしで実行し exit を直接読む |
