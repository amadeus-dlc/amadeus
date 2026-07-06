# Integration Test Instructions

Unit: pr-gate-discipline（Test Strategy: Minimal）

## 上流入力

検証対象は code-generation の実装 6 変更である。内訳は [code-generation-plan.md](../pr-gate-discipline/code-generation/code-generation-plan.md) と [code-summary.md](../pr-gate-discipline/code-generation/code-summary.md) を参照する。

## 適用判断

統合テストは不適用とする（外部システム・API・DB との統合点を持たない docs 系 refactor）。統合相当の検証は次で担保した。

- parity 統合: `npm run parity:check` が pass（stage-protocol.md の追記は exceptions[] 既存エントリの理由統合で宣言済み、engineFileExceptions 不変）。
- 配布統合: stage-protocol.md の参照パス `.claude/knowledge/amadeus-shared/pr-gate-discipline.md` が symlink（.claude/knowledge → .agents/amadeus/knowledge）経由で実在ファイルへ解決することを確認した。installer は knowledge/ と amadeus-common/ の両方を配布するため、配布先でも同じ解決が成り立つ。
