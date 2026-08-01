# Build Instructions — 260801-kimi-bootstrap-deadlock

上流入力(consumes 全数): `../fix-1922-session-start-ordering/code-generation/code-generation-plan.md`、`../fix-1922-session-start-ordering/code-generation/code-summary.md`

本プロジェクトはコンパイル成果物を持たない(TypeScript / Bun 直接実行)。「ビルド」に相当するのは配布物の再生成と drift 検査であり、本 intent では code-generation 段で実施済み(commit 9c844904d)。本ステージでは drift 0 を再確認する。

## ビルド手順

1. `bun install --frozen-lockfile`(依存は導入済み。未導入 worktree のみ)
2. `bun run dist:check` — dist 7 ハーネスの drift 検査(`bun scripts/package.ts --check`)
3. `bun run promote:self:check` — project-local self-install の同期検査
4. `bun run typecheck`(tsc `--noEmit` ×2)/ `bun run lint`(Biome)

## 結果の読み方

- 全コマンド exit 0 が合格。lint の cognitive-complexity **warnings** は既知の baseline であり退行ではない(AGENTS.md 記載どおり)。
- 本 intent での実測値(exit code)は `build-test-results.md` を参照。
