# Scalability Requirements — routing-and-autonomy-guards

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。runtime traffic serviceではないため、scalabilityは単一marker・共有decision table・6 harness projectionの有界性として定義する。

## Capacity境界

| ID | Dimension | Target | Evidence |
|---|---|---|---|
| SCALE-U04-01 | marker ownership | workspace-levelの単一pathと単一TTL定義をStop hook/doctorが共有する。 | duplicated marker/TTL definition 0。 |
| SCALE-U04-02 | parser surfaces | engine、terminal、direct utilityが同じhelp matrixを使う。 | 3入口のtable-driven parity。 |
| SCALE-U04-03 | package surfaces | authored sourceから現行6 harnessへ決定的に投影する。 | source/projection drift 0。 |
| SCALE-U04-04 | self-install | 現行4面closed listを増減しない。 | promote-self checkで対象不変。 |

単一、3入口、6 harness、4 self-installは既決inventoryであり予測値ではない。新harnessやgrammar追加時は正本更新なしにsilent expansionしない。

## Scaling strategy

- help classificationはtoken数に対する有界走査で完結し、intent/space directory inventoryを検索しない。
- marker判定は単一statで完結し、workspace数やrecord数へfan-outしない。
- stale cleanupはStop hook invocation内のbest-effort unlinkであり、background sweepへ拡張しない。
- new service、worker pool、database sharding、cache、queue、autoscaling infrastructureを追加しない。

## Validation

source/6 projectionのbyte drift、3 parser入口、4 marker経路、doctor read-only、autonomous recompose before/after bytesを自動testで検証する。scopeやharnessが増えてもrecursive workspace sweepへ変化しないことを守る。

## トレーサビリティ

SCALE-U04-01〜04は`business-rules.md`のBR-U04-07〜20、`business-logic-model.md`の責務境界/Projection、`requirements.md`のFR-1、NFR-1、NFR-4、`technology-stack.md`の6/4配布構成に対応する。
