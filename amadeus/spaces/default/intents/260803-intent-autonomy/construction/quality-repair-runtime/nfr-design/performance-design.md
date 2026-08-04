# Performance Design — quality-repair-runtime

## 入力と性能オラクル

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、Issueにない時間・費用SLOを推測しない。

性能オラクルは、quality projectionを直近T+1 snapshotへbounded化すること、raw proseや全audit履歴を比較しないこと、T-1までJudgeを0回にすること、同一stalled fingerprintの再起動でPlugin / Judge / LLM / repairを0回にすることである。

## Evidence normalization

M03はclosed `QualityObservation[]`をsource parserで1回正規化し、stable obligation IDでsort / dedupeする。差分は前snapshotとのID集合比較で`resolved / added / retained`を計算し、reviewer文面、sensor出力全文、編集回数、時刻をhot-path comparisonへ含めない。

snapshotにはcanonical obligation、fingerprint、deltaだけを保持する。evidence本文は必要なartifact / verifier identityへの参照にし、同じreceiptを複製しない。scopeまたはprovider identityをparseできないbatchは全量再試行せず`INCOMPLETE`へ閉じる。

## Bounded convergence

`QualityConvergenceProjection`はT+1 snapshot、`consecutiveNonProgress`、`replanSinceLastProgress`、current review cycleだけを保持する。strict progressは真部分集かつaddedなしの場合だけで、件数同数、置換、plan digest変更をprogressにしない。

replan effect projectionはbase reservationごとにclosed attempt 0/1とterminal stateだけを保持する。crash回数やreceipt数に比例するretry listを作らず、attempt 1 successor reservationの存在をredispatch budget消費オラクルにする。

初回T到達時だけsingleton `replan` Judgeを発火し、replan後に再度Tへ達したらsingleton `repair-stalled`へ移す。local reviewer iteration上限を超えて同cycleを延長しない。strict progressでcountをresetできるが、各non-progress区間のJudge回数は1回に固定される。

## Verification

obligation数、T、source数の境界fixtureでT+1以外の履歴保持が0件であること、T-1 Judge 0、初回T replan 1、replan後T stalled 1、同一latch再開時の外部呼出し0を検査する。advisory sensorや人間Request Changesをobligationへ加えて余計なworkを発生させない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:25:26Z
- **Iteration:** 1
- **Scope decision:** none

evidence provenance、local reviewer cap、atomic stall/resumeは実装可能に閉じており、具体的な循環依存もない。一方、replanのno-effect後redispatchに永続的な試行予算がなく、bounded convergenceとcrash後の決定論的replayを保証できない。

### Findings

- BLOCKER | `reliability-design.md`はattested `no-effect-confirmed`後に同じ`ReplanReservation` IDで再dispatchを許すが、再dispatch許可を消費するcanonical event、閉じたattempt状態、最大試行数を定義していない。no-effectが反復した場合や、再dispatch許可後・agent call前のcrash/replayで外部呼出しを無制限に再発行でき、bounded convergenceとcross-session / cloneでの決定論的なreplan recoveryを保証できない。永続的なattempt projection、許可消費のatomic commit、上限到達時のterminal遷移を定義する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T15:27:20Z
- **Iteration:** 2
- **Scope decision:** none

反復1のBLOCKERは解消済み。base reservation配下のclosed attempt 0/1、attempt 1 successor commitによるredispatch許可と予算消費の一体化、crash後の同一attempt reconcile、attempt 1後のterminal-uncertain遷移により、外部dispatch上限と決定論的replayが実装可能に閉じた。bounded convergence、evidence provenance、local reviewer cap、atomic stall/resumeも整合しており、具体的な循環依存はない。

### Findings

- None
