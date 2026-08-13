# Build Instructions — intent 260813-advisory-requestion-fix

対象: `code-generation-plan.md` / `code-summary.md`(unit `advisory-requestion-fix`)が記録した advisory 修正の build 面。depth Minimal につきコマンドと環境のみ。

## 依存とセットアップ

```bash
mise trust          # worktree 初回のみ
bun install         # 依存インストール(Bun 1.3.x)
```

環境変数: 追加不要(`TEST_TIME_FACTOR` は CI 既定 2、ローカル未設定でよい)。

## Build

```bash
bun run build       # packages/framework/core・harness 正本 → dist/ + 自己インストール面の再生成
```

## Build 検証

```bash
git status --porcelain          # 追跡ファイル不変(生成物は未追跡)を確認
bun run typecheck               # tsc --noEmit (main + tests)
bun run lint                    # Biome
```
