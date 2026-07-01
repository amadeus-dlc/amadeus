# S001: Maintainer の分類確認

## ストーリー

Maintainer として、内部 skill と公開入口 skill の境界を確認したい。

そうすることで、README の Internal Skills 一覧と暗黙起動ポリシー設定対象を同じ判断に基づいて承認できる。

## アクター

- ACT001 Maintainer

## 対象要求

- R001
- R002
- R005

## 受け入れ状態

- 内部 skill と公開入口 skill の判断基準を確認できる。
- README に載せる対象と載せない対象を確認できる。
- 後続候補に分けた作業を確認できる。

## 未確認事項

- `amadeus-validator` を Internal Skills 一覧に移すか、横断的補助 skill に残すかは Construction で確認する。
