# Scalability Requirements — ts-arm

## Closed capacity

`business-logic-model.md` のuniverse cardinality、`business-rules.md` のpredicate set、`requirements.md` のfinite deterministic checker、`technology-stack.md` のsingle-process Bun実行に従う。容量単位はarm freeze / universe / arbitrary / runtime identityを束ねたrevisionである。

## Cardinality model

- core keys=5,760、identity keys=160、PBT runs=100、predicates=7、workers=1に固定する。
- universe / predicate / arbitraryをruntime pluginで追加しない。unknown tuple / field / discriminatorをrejectする。
- iterationはstreaming、aggregate mapはpredicate / outcomeのclosed keyだけを持ち、case数に比例するobject retentionを禁止する。
- revision変更は旧raw evidenceを保持して全caseを再実行する。同一revisionへcaseを追加しない。
- run開始前にrevision / run / owner session / process-start identityへbindしたdurable `ACTIVE` execution claimをexclusive successorへ取得する。live ownerがあるclaimとの並行runを拒否する。crash recoveryは旧owner non-live確認後、expected claim headを使うatomic `RESUMED` ownership transferを要求し、success / terminal failureは`CLOSED`、明示放棄は`ABORTED` eventで閉じる。

## Growth policy

voter / choice / timestamp / reference / GoA / action budget / predicate / PBT run変更は新revisionと全matrix再測定を要する。adaptive sampling、parallel worker、distributed executionを追加しない。

## Verification

5,760 / 160、PBT green 100 / failure first-index+shrinkをacceptし、各-1 / +1、duplicate / unknown key reject、2 revision分離、heapに全case array 0、claim競合、live owner resume拒否、stale owner RESUMEDを検査する。active process / worker / claim各1を合否とする。
