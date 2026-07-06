# unit-test instructions（260706-runtime-graph-registrati）

上流入力: [code-summary.md](../runtime-graph-registration/code-generation/code-summary.md)

## 適用判断

検証単位は eval（決定論的な検証スクリプト）である。FR ごとの回帰検査は既存 eval への RED 先行ケース追加で行った。

## 手順

1. `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` — #558 runtime-compile hook 4 ケースを含む（FR-1）。
2. `bun run dev-scripts/evals/engine-e2e/check.ts` — #558a（自己修復成立）/ #558b（復旧手順つきエラー）を含む（FR-2）。
