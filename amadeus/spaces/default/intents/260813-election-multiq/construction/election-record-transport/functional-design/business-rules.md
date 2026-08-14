# Business Rules — election-record-transport

## Sources

[unit-of-work](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements](../../../inception/requirements-analysis/requirements.md)、[components](../../../inception/application-design/components.md)、[component-methods](../../../inception/application-design/component-methods.md)、[services](../../../inception/application-design/services.md) からU4 ruleを抽出する。

## Record rules

- BR-R1: question sectionsはdefinition順で全questionをちょうど1回含む。
- BR-R2: section identityはquestion IDで、textやindexをidentityにしない。
- BR-R3: established/holdを同時に表現し、global worst stateへ丸めない。
- BR-R4: choice counts、GoA frequency、reservation、late reasonはquestion内に閉じる。
- BR-R5: GoA 2/3/6のreservationをvoter×questionで全件転記する。
- BR-R6: 同一canonical inputはbyte-identical recordを生成する。

## Verification rules

- BR-V1: recordをrecord自身と比較しない。
- BR-V2: ledger/materialized/history/current/recordの独立sourceをjoinする。
- BR-V3: question sectionの欠落/重複/unknown/order mismatchを検出する。
- BR-V4: currentがhistory foldと一致し、established digestが不変であることを検証する。
- BR-V5: summaryとsectionの不一致を検出する。
- BR-V6: findingは全件列挙し、recorded transitionをfail-closedにする。

## Transport rules

- BR-T1: notificationはvoterごと1 view path。
- BR-T2: viewは全question/choicesを含み、recommendation/prior vote/peer statusを含めない。
- BR-T3: shuffleはelection/voter/questionで決定的、ballotはinternalNoを使用。
- BR-T4: transportはquestion business ruleを解釈しない。
- BR-T5:成功確認前にdelivery recordをmintしない。
- BR-T6: delivery provenanceとdistribution runを保持し、duplicate bookingを防ぐ。

## Traceability

FR-DEF-4、FR-TAL-2〜4、FR-OBS-1、FR-BAL-4/5、NFR-4を被覆する。GUI/HTTPはscope外。
