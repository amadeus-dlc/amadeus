# unit-test instructions（260706-engine-consistency）

上流入力: [code-summary.md](../engine-consistency/code-generation/code-summary.md)

## 適用判断

このリポジトリの検証単位は eval（決定論的な検証スクリプト）である。Bolt ごとの回帰検査は既存 eval への RED 先行ケース追加で行った（dev-scripts ルールの TDD 規約）。

## 手順

1. `bun run dev-scripts/evals/engine-e2e/check.ts` — #547 末尾 skip 連続ケースを含む（B001）。
2. `bun run dev-scripts/evals/docs-codekb-guards/check.ts` — #548 stub なし codekb 直接解決ケースを含む（B002）。
3. `bun run dev-scripts/evals/hooks-state-bugfix/check.ts` — #555 完了ガード 3 ケースを含む（B003）。
4. `bun run dev-scripts/evals/pdm-scope/check.ts` — #547 随伴（next の none 解決）の回帰検査（(f) 系）。
