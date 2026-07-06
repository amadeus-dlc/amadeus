# Unit Test Instructions

Unit: pr-gate-discipline（Test Strategy: Minimal）

## 上流入力

検証対象は code-generation の実装 6 変更である。内訳は [code-generation-plan.md](../pr-gate-discipline/code-generation/code-generation-plan.md) と [code-summary.md](../pr-gate-discipline/code-generation/code-summary.md) を参照する。

## 適用判断

コード単体テストは不適用とする（実装コード・テストコードの変更なし。docs 系 refactor）。文書に対する要求駆動の検証は次で行った。

- ポインタ解決の機械的確認（requirements Q4 = A）: ルール側 3 ファイルの参照文字列が知識文書の実在パスへ解決することを grep + ファイル実在検査で確認した（結果は build-test-results.md の表を参照）。
- 不変条件 4 項目の意味一致（知識文書 §1、team.md、construction.md、stage-protocol.md）と分量上限（NFR-2）は reviewer iteration 2 が確認した。
- 知識文書の 8 内容項目カバレッジと固有名不在（grep 実測）は reviewer iteration 1〜2 が確認した。
