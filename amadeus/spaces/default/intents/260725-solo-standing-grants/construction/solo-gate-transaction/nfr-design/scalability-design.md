# Scalability Design: solo-gate-transaction

## Inputs and Dimensions

`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`を根拠とする。32 concurrent sessions、100 intents、10 per-unit unitsを対象とする。

## Lock Partitioning

- full grant pair: workspace outer lockでreceipt ownerをpinし、owner inner lockでfresh grant再検証とapproval。
- targeted human: registry-resolved owner intent lockだけでpresence/target/stageを検証してapproval。
- normal human/team:既存lockingを変更しない。
- reservation: normalized session digestごとのfile lock/atomic writeで分離する。

workspace→owner以外のnested lock順を禁止する。targeted humanはworkspace lockを取らないため、通常approvalのcontentionを増やさない。

## Session Scaling

sessionごとにunconsumed reservationは1件だけとする。2件目armはlatest-winsにせずfail-closed。32 distinct session/owner fixtureでmarker、HUMAN_TURN、consumeを相互分離する。

## Per-unit Scaling

all-covered final gateだけgrant carrierを持つ。U=`1/3/10`でunit artifact/review hash、body/reviewer countersを比較し、fallback/human continuationで増分0を保証する。

## Growth Limits

remote session store、distributed lock、background cleanupを導入しない。target invalidationまたはsuccessful consumeだけでreservationをcleanupする。
