# Unit Test Instructions

Unit: u001-harness-codex

## 上流入力

検証対象は code-generation の実装（内訳は [code-generation-plan.md](../u001-harness-codex/code-generation/code-generation-plan.md) と [code-summary.md](../u001-harness-codex/code-generation/code-summary.md) を参照）である。

## 適用判断

コード単体テストは不適用とする（実装コード・テストコードの変更なし）。文書・設定に対する要求駆動の検証は次で行った。

- 純正性検証（FR-1）: fresh clone + b67798c3 で上流 38 件の sha256 全件一致を実測（provenance.md に記録）。
- 全件突合（FR-3/FR-5）: source と promoted の 38 ペアを diff -q で全件一致確認（reviewer が独立再現）。
- 写像整合（FR-2）: 各 yaml のヘッダ（上流名 ↔ amadeus 名）を機械照合（reviewer 実施、ミスマッチ 0）。
