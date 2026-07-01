# D002: BC001 自己開発運用を参照する

## 背景

Issue #272 は、Amadeus 自己開発で `.amadeus/` 全体から次 Intent 候補を探索する用途を扱う。

Domain Map には `BC001 自己開発運用` が adopted として登録されている。
この Bounded Context は、stage 判定、stage0 採用判断、build workspace と target workspace 対応記録を一貫して扱う。

## 判断

この Intent の Unit は、Domain Map の `BC001 自己開発運用` を参照する。

新しい Bounded Context は採用しない。
Context Map の依存も追加しない。

## 理由

`dry-run` は、Amadeus 本体の自己開発で次 Intent 候補を確認する運用上の入口である。
既存の `BC001 自己開発運用` の役割に収まるため、新しい境界を採用する必要はない。

## 影響

`state.json.inception.gate` は、既存 adopted Bounded Context を参照できるため `passed` にできる。

Construction で詳細な Domain Model や Intent Contracts は作らず、必要な設計詳細は Functional Design に渡す。
