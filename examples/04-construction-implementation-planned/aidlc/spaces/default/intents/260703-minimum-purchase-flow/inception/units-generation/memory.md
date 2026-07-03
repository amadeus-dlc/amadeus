# Memory: units-generation

## Interpretations

- Unit は Application Design のコンポーネントをドメインの 3 領域で束ねた。各 Unit が UI とサービス層を縦に貫くため、Unit 単独で観測可能な振る舞いを持つ。
- R001（商品一覧の表示）は商品名と価格の表示を U001、在庫状況の表示を U002 に分けて対応付けた。

## Deviations

- 実行指示により質問を対話で行わず、units-generation-questions.md に推奨回答と確定理由を記録する形へ代替した。境界戦略と粒度の確定判断も同ファイルに記録し、grilling セッションを実行していないため inception/grillings.md は作成していない。

## Tradeoffs

- 粗い粒度（3 Unit）にしたため、Unit 内の作業は Construction のステージ内で分解する。細かい Unit で進捗を刻むより、依存 DAG の単純さを優先した。
- U003 を U002 に依存させなかったため、注文作成は選択済み商品の在庫状況を再確認しない。この前提は application-design/decisions.md の判断 3 と一致する。

## Open questions

- 実装順序と経済的な順序付けは Delivery Planning で確定する。
