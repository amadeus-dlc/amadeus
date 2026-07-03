# Memory: delivery-planning

## Interpretations

- Bolt 識別子はユーザー指定に従い `B001` からの連番にした。
- B001 は注文作成の貫通 walking skeleton とし、U001 と U002 を束ねた。

## Deviations

- Ideation の「在庫参照をリスク先行で確認する」方針は、B001 の後に B002 として在庫参照を統合する形で適用した。

## Tradeoffs

- 在庫参照を B001 から分離することで、未確認の在庫管理システム API 仕様により walking skeleton が止まるリスクを下げた。
- B001 の購入者公開可否は B002 完了後に判断する。

## Open questions

- 在庫管理システムの API 仕様と接続条件は未確認。
- リレーショナルデータベースの製品選定は未確認。
