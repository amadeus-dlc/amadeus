# D002: BC001 自己開発運用参照

## 背景

- Domain Map には `BC001 自己開発運用` が採用済み Bounded Context として存在する。
- Issue #254 は、Amadeus 自己開発で複数 Intent、複数 worktree、複数 Agent の作業判断を扱う。
- Inception gate を passed にするには、Unit の `コンテキスト` が Domain Map の adopted Bounded Context を参照する必要がある。

## 判断

- U001 と U002 は `BC001 自己開発運用` を参照する。
- Domain Map と Context Map は更新しない。

## 理由

- Git ブランチ戦略 policy は、自己開発運用の stage、workspace、PR、merge 後処理と同じ語彙圏に属する。
- 新しい Bounded Context を採用するほどのモデル差は、現時点の Inception 成果物からは確認できない。

## 影響

- Inception の Unit は `BC001` を参照する。
- Construction では詳細な Domain Model を Functional Design で扱う。
