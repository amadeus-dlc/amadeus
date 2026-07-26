# Build Instructions — metrics 可視化

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

両 unit の code-generation-plan.md(実施計画・検証手順)と code-summary.md(変更ファイル・検証結果)を検証対象の定義として消費する。

## ビルド

本 intent はビルド成果物を持たない(Bun 直接実行の TypeScript — team-practices.md の技術前提)。ビルド相当の検査は:

```bash
bun run typecheck   # tsc --noEmit(両 tsconfig)
bun run lint        # Biome(scripts/ を含む)
bun run dist:check  # 配布ドリフト(本 intent は core 非接触 — 同期不変の確認)
bun run promote:self:check
```

## 生成物

`bun scripts/metrics-visualize.ts --write` が metrics/index.html を再生成、`--check` が一致検査(code-summary.md の検証結果参照)。
