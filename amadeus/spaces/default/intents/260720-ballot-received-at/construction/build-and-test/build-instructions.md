# Build Instructions — 260720-ballot-received-at

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

修正面は `scripts/amadeus-election-*.ts`+`tests/` のみ(code-generation-plan.md の変更目録)。ビルド相当は:

1. `bun run typecheck`(exit 0 実測)
2. `bun run lint`(exit 0 実測)

## 配布非対象の実証

`bun run dist:check` / `bun run promote:self:check` が無変更で exit 0(bolt `433391d2c` 実測)— scripts/tests は dist 非対象(code-summary.md)。
