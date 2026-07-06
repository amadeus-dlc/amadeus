# Build and Test Summary

Unit: feature-diff（docs 系 refactor）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../feature-diff/code-generation/code-generation-plan.md) と [code-summary.md](../feature-diff/code-generation/code-summary.md) を参照）である。

## 結果概要

すべての適用検証が pass した。失敗・保留はない。

## 受け入れ条件との対応

| 区分 | 受け入れ条件 | 状態 |
|---|---|---|
| Issue | 三者の機能差が 1 文書で一望・各行に出典 | 充足（12 軸 5 列表 + main/v2 要約節、出典空欄 0 を機械確認） |
| Issue | 追従手順の明記 | 充足（5 手順 + 各機構文書リンク、参照先実在確認済み） |
| Issue | #428 と矛盾しない | 充足（ドリフト 8 項目を追跡欄として反映、reviewer 照合済み） |
| 追加要件 | en + ja の対 | 充足（構成 15=15 一致、意味論一致を reviewer 全文照合） |

## 判定

build-and-test を完了とし、workflow 完了 → draft PR 作成へ進む。
