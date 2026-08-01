# Build Instructions — 260801-open-bug-batch-5

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- 各 unit の code-generation-plan.md(5 unit)が宣言した検証コマンド集合(CR-4)と、code-summary.md の dist 同期宣言(CR-3: unit 1〜3 は core 面で9コピー再生成、unit 4 は core+CI、unit 5 は scripts/ のみ)を本書のビルド手順の導出元とした。

## ビルド手順

本プロジェクトはコンパイル成果物を持たない(TypeScript / Bun 直接実行)。「ビルド」に相当するのは配布物の再生成と drift 検査:

1. `bun scripts/package.ts` — dist 7ハーネスの再生成(core 変更時)
2. `bun run promote:self` — self-install ツリーの同期
3. `bun run dist:check` / `bun run promote:self:check` — drift 0 の機械確認
4. `bun run typecheck`(tsc --noEmit strict)/ `bun run lint`(Biome)

## 本 intent での実施

- 各 Bolt worktree で builder が実行済み(全 PR で exit 0 を報告、CI でも Dist and self-install drift ジョブ green)。
- マージ後の統合断面(origin/main + record)での再確認は `build-test-results.md` に実測記録。
