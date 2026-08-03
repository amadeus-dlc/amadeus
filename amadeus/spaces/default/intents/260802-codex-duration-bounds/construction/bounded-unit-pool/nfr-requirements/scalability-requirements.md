# Scalability Requirements — bounded-unit-pool

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Fixed Pool Contract

`requirements.md` FR-05、`business-logic-model.md` のPoolProjection、`business-rules.md` BR-UP-01〜16、`technology-stack.md` の最大4並行実測を固定長poolへ変換する。

| ID | Dimension | Target |
|---|---|---|
| SC-UP-01 | configured active cap | default=hard cap=4、valid range 1〜4 |
| SC-UP-02 | batch size | Unit数に依存せずactive <= 4、残りはFIFO queue |
| SC-UP-03 | queue growth | Unit／retry entryごとに1 record、重複enqueue 0 |
| SC-UP-04 | attempt growth | Unitごとdefault 2／hard 3、session跨ぎでreset 0 |
| SC-UP-05 | reconciliation growth | attempt×kindごとdefault 2／hard 3、late resultでcounter増分0 |
| SC-UP-06 | distribution | 7 package／影響5 self-install面で同じconfig key、cap、queue semantics |

## Scaling Behavior

- 全Unitをsubmitしてもworkerはslot取得時だけspawnする。queue長が増えてもprocess数を増やさない。
- initial orderはKahn layer＋unitId UTF-8 bytewise順で決め、map／filesystem列挙順へfallbackしない。
- retryは同じUnitの新QueueEntryを末尾へ追加し、別Unitとしてactive capacityを回避しない。
- 同じUnitが同時にqueued／activeとなるgenerationは各1件以下。slot数は未release ActiveSlot数と常に一致する。
- dynamic cap、priority queue、driver別pool、work stealingは対象外とし、固定上限の検証可能性を優先する。

## Saturation Policy

- activeがcapなら新規acquireは0件で、queued状態を維持する。busy loopせず、settle／release eventで再評価する。
- local exhausted Unitはdependentだけを取消し、独立Unitを継続する。systemic failureはdrainingへ移り新規acquireを停止する。
- cap設定不正、DAG不正、未知policy versionはqueue作成前にfail-closedとする。
