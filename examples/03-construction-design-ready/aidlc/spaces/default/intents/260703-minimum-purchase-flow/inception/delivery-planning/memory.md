# Memory: delivery-planning

## Interpretations

- 実行指示の「B001 は注文作成を貫通する walking skeleton」を、U001 商品選択と U003 注文作成を束ねた最小スライスとして解釈した。注文作成は選択した商品を入力にするため、U003 単独では貫通しない。
- Ideation の D004（リスク先行）と walking skeleton の指定を、B001 で骨格を証明し B002 で統合リスクを直後に解消する順序として両立させた。

## Deviations

- 実行指示により質問を対話で行わず、delivery-planning-questions.md に推奨回答と確定理由を記録する形へ代替した。束ね方と順序の確定判断も同ファイルに記録し、grilling セッションを実行していないため inception/grillings.md は作成していない。
- 単独開発者のため team-allocation.md は作成していない（チームがある場合のみの成果物）。

## Tradeoffs

- B001 に在庫参照を含めないため、B001 の完了時点では在庫の裏付けのない注文を作成できる。外部確認待ちによるブロックの回避を優先し、公開の判断は B002 の完了後に行う。
- Bolt を 2 個に抑えたため、B001 の範囲が Unit 2 個分と大きい。単独開発者の切り替えコストの低減を優先した。

## Open questions

- 在庫管理システムの API 仕様と接続条件の確認先が未特定である。B002 の着手前に特定する。
- リレーショナルデータベースの製品選定が未確認である。Construction の NFR Requirements で確定する。
