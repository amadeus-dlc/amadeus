# D002: BC001 自己開発運用

## 背景

- Domain Map には採用済み Bounded Context が未登録だった。
- Inception gate を passed にするには、Unit の `コンテキスト` が Domain Map の adopted Bounded Context を参照する必要がある。
- この Intent は、Amadeus 本体の自己開発 cycle、stage 判定、workspace 対応記録を一貫して扱う。

## 判断

- Subdomain `SD001 自己開発運用` を採用する。
- Bounded Context `BC001 自己開発運用` を採用する。
- U001 と U002 は `BC001` を参照する。

## 理由

- stage 判定と workspace 対応記録は、同じ自己開発運用の語彙と判断基準に属する。
- 別々の Bounded Context に分けるほどのモデル差は、現時点の Inception 成果物からは確認できない。

## 影響

- Domain Map に `SD001` と `BC001` を追加する。
- Context Map に依存は追加しない。
- 詳細な Domain Model は Construction の Functional Design で扱う。
