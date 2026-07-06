# Security Test Instructions

Unit: persona-loading（Test Strategy: Minimal、scope: bugfix）

## 上流入力

検証対象は code-generation の実体 2 ファイル修正である。内訳は [code-generation-plan.md](../persona-loading/code-generation/code-generation-plan.md) と [code-summary.md](../persona-loading/code-generation/code-summary.md) を参照する。

## 適用判断

セキュリティテストは不適用とする。変更は文書の文言と parity 宣言であり、認証・認可、入力検証、秘密情報の取り扱いに関わる経路を含まない。認証情報やシークレットのハードコードがないことは差分の目視（surgical diff の reviewer 確認）で担保済みである。
