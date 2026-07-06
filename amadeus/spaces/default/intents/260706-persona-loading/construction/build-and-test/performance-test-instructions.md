# Performance Test Instructions

Unit: persona-loading（Test Strategy: Minimal、scope: bugfix）

## 上流入力

検証対象は code-generation の実体 2 ファイル修正である。内訳は [code-generation-plan.md](../persona-loading/code-generation/code-generation-plan.md) と [code-summary.md](../persona-loading/code-generation/code-summary.md) を参照する。

## 適用判断

性能テストは不適用とする。変更はプロトコル文書の文言と parity 宣言であり、実行時の処理経路・データ量・応答時間に影響する要素を含まない。副次効果として、persona/knowledge の prompt 重複注入が止まることで subagent prompt のトークン量はむしろ減る方向であり、性能退行の懸念はない。
