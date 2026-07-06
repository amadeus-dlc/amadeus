# Integration Test Instructions

Unit: u001-harness-codex

## 上流入力

検証対象は code-generation の実装（内訳は [code-generation-plan.md](../u001-harness-codex/code-generation/code-generation-plan.md) と [code-summary.md](../u001-harness-codex/code-generation/code-summary.md) を参照）である。

## 適用判断

統合テストは不適用とする（実行時 API・外部サービス統合を持たない）。統合相当の検証は次で担保した。

- promote 統合: `npm run test:it:promote-skill` pass（38 skill の昇格が既存経路で成立）。
- 検出器統合: rename-leftovers（scanRoots へ harness 追加後）が新設文書の旧名トークンを実検出 → 修正 → pass（検出器の機能実証。FR-6.4/6.5）。
- parity 統合: `npm run parity:check` ok（39 skills、199 engine files。yaml 追加は非照合 = FR-6.2）。
