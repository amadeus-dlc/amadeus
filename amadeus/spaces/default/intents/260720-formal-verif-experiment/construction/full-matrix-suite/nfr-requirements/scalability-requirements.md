# Scalability Requirements — full-matrix-suite

## Closed capacity

`business-logic-model.md` のinput / schedule / matrix、`business-rules.md` のclosed counts、`requirements.md` の2-arm experiment、`technology-stack.md` のsingle-runner stackに従う。容量単位は`revisionId + InputSetIdentity + MeasurementScheduleId`である。

## Cardinality model

- arms=2、warmup=1/arm、measured=5/arm、schedule entries=12、subjects=8または6、cells=96または72に固定する。
- each expected cellはbundle 1、runner entry 1、store entry 1、schedule start receipt 1 suiteごとに要求する。
- active revision / schedule / suite / cell processは各1とする。
- matrix indexはcell countに線形で、raw bundle bytesをaggregateへ複製しない。

## Multi-revision lifecycle

runtime / manifest / bound / schedule変更は新revisionへ全12 suitesを再実行し、旧raw evidenceをappend-only保持する。新revision開始前にdurable `ACTIVE` capacity / execution claimを取得し、live owner競合を拒否する。stale ownerはnon-live確認後、元と同じhost identity / CPU model / exact core IDs / memory limit / sandbox providerのexclusive leaseを再取得し、`ResourcePolicyIdentity`完全一致を再検証してからatomic `RESUMED` eventをcommitする。不一致または同じleaseを再取得不能なら残scheduleを開始せずrevision `INCOMPLETE` terminalをcommitする。終了は`CLOSED | ABORTED`で閉じる。

## Verification

12 / 96 / 72 exact accept、11 / 13 schedule、71 / 73 / 95 / 97 cells reject、2 revision分離、claim競合、same-policy lease resume、host / core / memory / provider drift時INCOMPLETE closeを検査する。sampling、parallel benchmark、silent truncationは0件とする。
