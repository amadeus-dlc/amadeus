# Memory: application-design

## Interpretations

- 「新しいコンポーネントとサービス層の設計が必要」という実行指示の事実から Condition を真と判定した。greenfield のため、全コンポーネントを新規に設計した。
- メソッド境界はドメイン知識の言葉で定義し、型と例外表現の確定は Construction に委ねた。

## Deviations

- 実行指示により逐次質問を行わず、指示内容と既存成果物から回答を確定した。質問と回答は application-design-questions.md に、設計の確定判断は inception/grillings.md（G002）に記録した。

## Tradeoffs

- 最小スコープに対して 3 層構成はやや厚いが、在庫参照失敗の判定（GD001）を UI から分離すること、Unit 境界の材料になることを優先した。
- 在庫参照の共有はサービス間の結合を生むが、API 仕様が未確認の外部連携を一箇所へ集約する利点を優先した。

## Open questions

- 在庫管理システムの API 仕様が確定した際、在庫参照のメソッド境界（一括参照か個別参照か）の見直しが必要か。
- Web フレームワークと ORM の選定（Construction の NFR Requirements で扱う）。
