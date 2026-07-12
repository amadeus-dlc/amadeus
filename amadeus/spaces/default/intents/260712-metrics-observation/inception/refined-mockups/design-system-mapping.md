# Design System Mapping — metrics-observation(CLI 既習様式への対応)

| 要素 | 本 intent の設計 | 既習様式(対照) |
|---|---|---|
| verdict 行 | `METRICS SNAPSHOT OK / FAILED [COLLECTOR: x] / CHECK OK` | complexity-gate の `OK` / `FAILED [種別]`(#837) |
| 機械可読出力 | metrics/*.json(+tests-totals.json seam) | coverage-totals.json(run-tests :610) |
| ゲート統合 | workflow 赤 = 既存 CI Success 集約に載る | codecov/patch・CCN ゲートと同じ可視化面 |
| 引数なし挙動 | usage+exit 1 | scope-definition:c1(破壊的操作を暗黙デフォルトにしない) |
| バージョン pin | lizard 1.23.0(CI pip pin 済み)を tool_version に記録 | #837 の pin 前例 |
