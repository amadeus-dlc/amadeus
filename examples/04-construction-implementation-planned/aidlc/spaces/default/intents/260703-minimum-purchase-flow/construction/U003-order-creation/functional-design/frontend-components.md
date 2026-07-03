# Frontend Components：注文作成

## 構成

| コンポーネント | 責務 | 対応するモック |
|---|---|---|
| 注文内容表 | 選択した商品の商品名、数量、金額を表示し、合計金額を示す | [mockups.md](../../../inception/refined-mockups/mockups.md) の注文内容確認画面 |
| 数量入力 | 1 以上の整数だけを受け付け、既定値は 1 にする。変更すると金額と合計金額を更新し、不正な値ではその旨を表示して「注文を作成する」を無効にする | [mockups.md](../../../inception/refined-mockups/mockups.md) の注文内容確認画面 |
| 注文作成ボタン | 押すと注文を作成し、注文完了画面へ遷移する。記録に失敗した場合は注文が作成されなかった旨を表示して注文内容確認画面に留まる | [mockups.md](../../../inception/refined-mockups/mockups.md) の注文内容確認画面 |
| 注文完了表示 | 注文を受け付けた旨と注文の識別子を表示する | [mockups.md](../../../inception/refined-mockups/mockups.md) の注文完了画面 |
| 商品一覧へ戻る導線 | 商品一覧画面へ遷移する | [mockups.md](../../../inception/refined-mockups/mockups.md) の注文内容確認画面と注文完了画面 |
