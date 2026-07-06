# Unit Test Instructions

Unit: persona-loading（Test Strategy: Minimal、scope: bugfix）

## 上流入力

検証対象は code-generation の実体 2 ファイル修正である。内訳は [code-generation-plan.md](../persona-loading/code-generation/code-generation-plan.md) と [code-summary.md](../persona-loading/code-generation/code-summary.md) を参照する。

## 適用判断

コード単体テストは不適用とする（実装コード・テストコードの変更なし。プロトコル文書の文言修正 + parity 宣言更新）。文書に対する要求駆動の検証は次で行った。

- 旧文言の不在（FR-1 の受け入れ条件）: 旧 3 パターン（「Include the agent persona context in the Task tool prompt」「Agent persona (agent.md), knowledge files, amadeus-state.md」「Cap knowledge files」）の grep が live prose で 0 件であることを確認した（結果は [build-test-results.md](build-test-results.md) を参照）。
- 新文言と実行実体の一致（FR-1.1 / FR-1.3）: §5 と §11 の新文言が `skills/amadeus/SKILL.md` の conductor 記述（named agent の自動読込、prompt へ注入しない）と語彙一致することを reviewer iteration 1 が確認した。
- §11 小節内の内部整合（iteration 1 指摘の解消）: 「Cap knowledge files」bullet 削除後、残存 bullet が手動注入を前提にしないことを reviewer iteration 2 が確認した。
