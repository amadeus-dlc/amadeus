# D003: 既存コード分析対象外判断

## 背景

- この workspace は Amadeus の例示成果物を置く workspace であり、対象実装コードを持たない。
- Inception は要求、相互作用、Unit、Bolt の構造を固定する段階である。

## 判断

- `codebase-analysis.md` は作らない。
- 既存コード分析の対象外理由は `traceability.md` に残す。

## 理由

- 既存コードに載せる brownfield ではないため。
- 存在しない対象コードを推測して分析成果物に書くことを避けるため。

## 影響

- Unit Design Brief は、既存コードの統合点ではなく、要求、ユースケース、steering layer、domain layer から作る。
- Construction で実装対象コードが現れた場合は、その phase で対象コードを確認する。
