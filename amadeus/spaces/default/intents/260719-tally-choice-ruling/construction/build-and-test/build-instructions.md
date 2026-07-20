# Build Instructions — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

修正面は `scripts/amadeus-election-*.ts`+`tests/` のみで、**配布物ビルドは不要**(code-generation-plan.md の変更目録どおり scripts/tests は dist 非対象)。「ビルド」に相当するのは型検査と lint:

1. `bun run typecheck`(exit 0 実測)
2. `bun run lint`(exit 0 実測 — 変更ファイルへの指摘 0)
3. 非対象の実証: `bun run dist:check` / `bun run promote:self:check` が**無変更で green**(bolt bd da7834f で実測 exit 0)

## 本 Bolt での実測

bolt `da7834f`(PR #1268)で上記全て exit 0(code-summary.md の検証表)。
