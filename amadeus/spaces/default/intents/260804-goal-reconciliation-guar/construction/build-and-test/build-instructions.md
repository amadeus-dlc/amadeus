# Build Instructions

## 前提と入力

本手順は `code-generation-plan.md` と `code-summary.md` に記録された Goal Reconciliation Guard の canonical source を検証する。Bun 1.3.13、依存関係が `bun install --frozen-lockfile` 済みであること、repository root で実行することを前提とする。常駐サービス、データベース、追加環境変数は不要である。

## Build 手順

1. `bun run build` を実行する。これは `bun scripts/package.ts` と `bun scripts/promote-self.ts --apply` を通じて全8 harnessとself-install面を生成する。
2. `bun run typecheck` でcoreとtestsのTypeScript型検査を行う。
3. `bun run lint` でBiome検査を行う。既存warningは許容するがerrorは許容しない。
4. `bun run distribution:check` と `bun run source-only:check` で配布parityとcanonical source境界を確認する。

## 合格条件とトラブルシュート

- 全コマンドがexit 0であること。
- `source-only:check` が生成物の追跡混入を報告しないこと。
- cold compile timeoutのみ、失敗したtest fileを `bun test --timeout 120000 <file>` で再実行し、assertion failureと区別する。
- distribution drift時は生成物を手編集せず、`packages/framework/core/`を修正してbuildを再実行する。
