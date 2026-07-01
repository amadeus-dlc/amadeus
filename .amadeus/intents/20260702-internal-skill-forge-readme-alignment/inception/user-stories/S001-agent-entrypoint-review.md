# S001: Agent の入口確認

## ユーザーストーリー

Agent として、README の公開入口案内と内部 skill の役割を取り違えず、`skill-forge` の確認範囲を選べるようにしたい。

これにより、README の説明不足と skill 契約の不整合を混同せずに、必要な確認作業へ進める。

## 対象要求

- R001
- R002
- R003

## 受け入れ状態

- README の skill 分類と実在する `amadeus-*` skill 一覧を照合できる。
- `skill-forge` の確認観点を選べる。
- source skill と昇格先成果物を分けて確認できる。

## 未確認事項

- eval workflow まで実行するかは Construction で判断する。
