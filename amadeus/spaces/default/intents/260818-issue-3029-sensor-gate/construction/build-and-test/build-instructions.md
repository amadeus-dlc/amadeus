# Build Instructions

## 上流入力

`construction/sensor-gate/code-generation/code-generation-plan.md` と `code-summary.md` を実行計画の正本として使用する。

## 環境とコマンド

- Bun 1.3.13 を使用する。
- 依存関係: `bun install --frozen-lockfile`
- 配布 build: `bun run build`
- 型検査: `bun run typecheck`
- lint: `bun run lint`（既存 warning は exit 0 の情報として記録）
- source-only: `bun run source-only:check`
- distribution: `bun run distribution:check`

## 検証

各コマンドの exit code を記録し、失敗時は対象ファイルとエラーを `build-test-results.md` に記載する。PR/CI の必須検証は後続 pr-convergence のリモート CI で確認する。
