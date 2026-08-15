# Build Instructions — 260814-priority-bug-batch

> Depth Minimal(コマンドと env のみ)。upstream: `construction/priority-bug-batch/code-generation/code-generation-plan.md` と `code-summary.md` の変更ファイル集合を対象とする。

## コマンド

```bash
bun install            # 依存(lockfile 準拠)
bun run build          # dist/ + セルフインストール投影の再生成(source-only 境界)
bun run typecheck      # tsc --noEmit(tsconfig.json + tsconfig.tests.json)
bun run lint           # Biome
```

- 前提 env: `bun` 1.3.13 が PATH にあること。`TEST_TIME_FACTOR` は CI 既定 2(ローカル未設定は 1)
- build 後は `git status --porcelain --untracked-files=no` が空であること(追跡ファイル不変)
