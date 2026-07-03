# Memory: functional-design

## Interpretations

- B001 の商品選択は、商品名と価格の表示、選択済み商品の受け渡しまでを扱う。
- 在庫参照結果にもとづく選択可否は B002 で扱う。

## Deviations

- `requirements.md` は R001 と R002 に在庫状況の表示と選択可否を含めているが、B001 では `bolt-plan.md` に従って在庫状況を扱わない。

## Tradeoffs

- B001 から在庫参照を外すことで、外部システム未確認の状態でも UI、サービス層、リレーショナルデータベースの経路を先に証明できる。

## Open questions

- 商品一覧の取得元は未確認である。
- 商品識別子の形式は未確認である。
