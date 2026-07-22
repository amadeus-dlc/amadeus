# Scalability Requirements — plugin-composition

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、plugin、declared contribution、write-set、crash境界の増加に対する決定性を対象とする。

## Capacity境界

| ID | Dimension | Target |
|---|---|---|
| SCALE-U10-01 | inspection | 対象pluginのdeclared入力を決定順で全数検査する。 |
| SCALE-U10-02 | shared contributions | recordされた適用順で寄与を適用・除去し、残存寄与から再構築する。 |
| SCALE-U10-03 | transaction | canonical mutation前に三面の全write-set/preimageを固定する。 |
| SCALE-U10-04 | recovery | workspaceごとの未完了journalをlock下でpre-stateへ収束させる。 |

独自priority queue、parallel commit、partial journal、cross-workspace batching、retry policy、別ownership indexを追加しない。

## Scaling strategyと検証

単一/複数plugin contribution、複数shared file、全write境界のtable-driven fixtureで、入力数が増えても適用順、期待post-state、三面回復が変化しないことを検証する。U11 reference内容やdeferred plugin面へcapacity scopeを拡張しない。

## トレーサビリティ

SCALE-U10-01〜04は`business-rules.md`のBR-U10-01〜22、`business-logic-model.md`のShared ownership/Atomic workflows、`requirements.md`のNFR-1/4/7、`technology-stack.md`に対応する。
