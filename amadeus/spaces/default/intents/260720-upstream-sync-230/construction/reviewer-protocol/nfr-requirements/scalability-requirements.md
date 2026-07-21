# Scalability Requirements — reviewer-protocol

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。本Unitはruntime trafficを処理するserviceではない。scalabilityはreview scopeの有界性と6 harness projectionの決定性として扱う。

## Capacity境界

| ID | Dimension | Target | Evidence |
|---|---|---|---|
| SCALE-U08-01 | package projection | authored正本から現行6 harnessへ同じreview contractを投影する。 | source/projection drift 0、dist手編集0。 |
| SCALE-U08-02 | default declared scope | `stage_file`、current Unitの実在`produces`、present consumesだけに閉じ、Q&Aは`directive.consumes`明示時だけ含める。 | sibling Unit数に依存するbrowse/scan request 0。 |
| SCALE-U08-03 | spot-check expansion | `check-read`で4条件成立時の単一owner fileを当該invocationにだけ追加する。 | directory、複数file、次iteration継承0。 |
| SCALE-U08-04 | review record | 1 review recordはVerdict、Reviewer、Date、Iterationの4 fieldを持つ。 | field欠落reviewのREADY受理0。 |

6、単一file、4 fieldは既決closed contractであり、将来予測値ではない。harnessやReview schemaの変更が必要な場合は正本更新と再承認なしに数値を拡張しない。

## Scaling strategy

- scale-outは既存manifest-driven generatorで行い、harness別の手作業copyを増やさない。
- reviewer invocationはengineが渡すauthoritative declared path集合を使い、record rootや`construction/*/`を探索するrequestを受理しない。
- integration ownerが不明または複数ならread scopeを拡大せず、contract findingを返す。
- new service、worker pool、database sharding、cache、queue、autoscaling infrastructureを追加しない。

## Capacity validation

core正本、reviewer persona/protocol/knowledge、6 harness skill surfaceをcontent testとpackage checkで比較する。positive/negative fixtureでsingle-file carve-out、bypass/tamper/outside request不受理を対照検査し、Unitやharnessの増加がsibling browse requestへ変化しないことを保証する。

## トレーサビリティ

SCALE-U08-01〜04は`business-rules.md`のBR-U08-03〜17、`business-logic-model.md`のFlow A/BとProjection flow、`requirements.md`のFR-5、NFR-1、NFR-4、`technology-stack.md`の6 harness/4 self-install配布構成に対応する。
