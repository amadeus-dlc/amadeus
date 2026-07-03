# Frontend Components：商品選択

## 構成

| コンポーネント | 責務 | 対応するモック |
|---|---|---|
| 商品一覧表 | 商品ごとに商品名、価格、在庫状況、数量入力、選択ボタンを 1 行で表示する | [mockups.md](../../../inception/refined-mockups/mockups.md) の商品一覧画面 |
| 数量入力 | 1 以上の整数だけを受け付け、未入力を 1 として扱う。不正な値はその場で通知する | [mockups.md](../../../inception/refined-mockups/mockups.md) の商品一覧画面 |
| 選択ボタン | 在庫がある商品だけ押せる。押すと商品識別子と数量を注文内容確認画面へ引き継ぐ | [mockups.md](../../../inception/refined-mockups/mockups.md) の商品一覧画面 |
| 在庫参照失敗の通知 | 在庫を確認できない旨と再試行ボタンを表示し、全商品を選択不可にする | [mockups.md](../../../inception/refined-mockups/mockups.md) の「在庫参照に失敗した場合の表示」 |
