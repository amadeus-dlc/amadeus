# Performance Design — experiment-contract-provenance

## Design inputs

`performance-requirements.md` の6-event / 1 MiB / operation counters、`security-requirements.md` のproof validation、`scalability-requirements.md` のclosed capacity、`reliability-requirements.md` のatomic recovery、`tech-stack-decisions.md` のBun stack、`business-logic-model.md` のparse / fold / dispatchを統合する。

## Processing pipeline

`CommandDecoder`は1 MiB capをstream counterで先に強制し、strict schemaへ1回parseする。`CanonicalEncoder`はschemaごとの固定field order tableを使い、array orderを保持してUTF-8 bytesとSHA-256を1回生成する。`StateFolder`は最大6 eventをsingle passし、`CommandRouter`はclosed discriminator tableからhandlerを1回だけ呼ぶ。

各componentへinstrumented counter portを注入し、byte scan、node visit、fold transition、serialize / hash、handler callをreceiptへ記録する。production pathでwall-clock thresholdは判定せず、test fixtureのcounter上限を合否にする。

## Resource layout

current command bytes、最大6 envelopes、64 KiB working allowanceだけを保持する。artifact / evidence payloadはidentity refで渡し、raw bytesをcacheしない。unbounded memoization、worker pool、background retryを持たない。

## Verification

0/1/3/6 eventsと1 KiB/64 KiB/1 MiB payloadでcounter formula、1 MiB+1 reject、handler call<=1、deadline identity不変伝播を検査する。counter receipt自体はcommand identityへbindし、計測無効時はperformance proofを作らない。
