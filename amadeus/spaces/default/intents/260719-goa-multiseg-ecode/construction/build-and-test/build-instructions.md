# Build Instructions — 260719-goa-multiseg-ecode

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

本プロジェクトはコンパイル成果物を持たない(Bun 直接実行)。「ビルド」に相当するのは配布物の再生成と同期検査である(code-generation-plan.md の変更目録 3 のとおり):

1. `bun scripts/package.ts` — 正本(packages/framework/core/ + harness/)から dist 6ツリーを再生成
2. `bun run promote:self` — セルフインストール4ツリーへ反映
3. 検査: `bun run dist:check`(exit 0)/ `bun run promote:self:check`(exit 0)/ `bun run typecheck`(exit 0)/ `bun run lint`(exit 0)

## 本 Bolt での実測

bolt `bd3f6cf74`(PR #1256)で上記 1〜3 を実行済み — 全 exit 0(code-summary.md の検証表)。11コピー(正本+dist 6+self-install 4)の同期を dist:check/promote:self:check で機械確認。
