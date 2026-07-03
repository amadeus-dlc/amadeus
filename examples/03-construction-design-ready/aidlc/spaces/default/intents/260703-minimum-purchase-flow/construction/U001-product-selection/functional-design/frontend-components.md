# Frontend Components：商品選択

## 構成

| コンポーネント | 責務 | 対応するモック |
|---|---|---|
| 商品一覧表 | 商品ごとに商品名、価格、選択操作を 1 行で表示する | [mockups.md](../../../inception/refined-mockups/mockups.md) の商品一覧画面 |
| 選択ボタン | 押すと商品識別子を注文内容確認画面へ引き継ぐ。商品ごとに可否を制御でき、在庫にもとづく可否は U002 が加える | [mockups.md](../../../inception/refined-mockups/mockups.md) の商品一覧画面 |

モックの在庫列と、在庫参照に失敗した場合の表示は在庫参照（U002）の対象である。
B001 では商品名、価格、操作の列だけを実装する（bolt-plan.md の B001）。
