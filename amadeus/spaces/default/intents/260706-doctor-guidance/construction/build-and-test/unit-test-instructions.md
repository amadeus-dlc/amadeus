# unit-test instructions（260706-doctor-guidance）

上流入力: [code-summary.md](../doctor-guidance/code-generation/code-summary.md)

## 適用判断

検証単位は eval である。#573 の回帰検査は installer eval への RED 先行ケース追加で行った。

## 手順

1. `bun run dev-scripts/evals/installer/check.ts` — #573 一連 11 検査（fresh 導入 → doctor advisory → 実 birth → advisory 消滅 → 破損時 fail + 実行可能誘導）を含む。
