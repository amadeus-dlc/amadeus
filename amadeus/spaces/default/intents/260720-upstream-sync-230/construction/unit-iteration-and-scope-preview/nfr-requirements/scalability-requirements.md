# Scalability Requirements — unit-iteration-and-scope-preview

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、Unit×compiled stage matrixとscope gridに対する順序保存の有界同期判定を対象とする。

## Capacity境界

| ID | Dimension | Target |
|---|---|---|
| SCALE-U05-01 | unit-major iteration | 既存Unit列を外側、compiled stage列を内側に一方向走査する。 |
| SCALE-U05-02 | default iteration | 既存stage-major resolverだけを使用し、第二matrixを作らない。 |
| SCALE-U05-03 | scope preview | 一つのeffective in-scope集合からstage/gate countを導出する。 |
| SCALE-U05-04 | consumers | 4 consumerは共通`ScopeSummary`を投影し、個別集計しない。 |

独自priority queue、名前順tie-break、consumer別index/count、precomputed第二grid、横断cacheを追加しない。

## Scaling strategyと検証

順序の正本を既存Unit列と`StageGraph`、countの正本を`CompiledGrid`へ一本化する。2 Unit×複数stage、全scope、gate 0/複数のtable-driven fixtureで、規模増加が別順序や別countへ変化しないことを検証する。

## トレーサビリティ

SCALE-U05-01〜04は`business-rules.md`のBR-U05-01〜15、`business-logic-model.md`のIteration/Preview workflow、`requirements.md`のNFR-1/4/7、`technology-stack.md`に対応する。
