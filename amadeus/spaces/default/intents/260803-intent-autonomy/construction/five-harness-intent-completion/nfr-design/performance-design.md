# Performance Design — five-harness-intent-completion

## 入力と性能オラクル

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceであり、根拠のない数値SLOや常駐runnerを追加しない。

性能オラクルはIntent partition内のbounded cohort評価、harness単位のlive実行分離、canonical auditのincremental receipt検証である。全Intent、全artifact、全harness配布物の横断scanをterminal checkごとに行わない。

## Live authorizationと実行

M06はregistryから解決したcohortをharness ID順へ正規化し、各memberのauthorizationを1回ずつprotected appendする。commit済みauthorization同士に依存はないためnative scenarioはharness単位で並行実行できるが、receipt validation eventは各Intent partitionへidempotentにappendする。

live adapterはpackage install、Judge invoke-once、decision / degradation observationだけを所有する。Core algorithmや期待値をadapterへ複製せず、credential値やraw provider payloadを転送・保持しない。

## Evaluation complexity

M08 evaluatorは指定されたvalidation event identityだけをcanonical readerへ渡し、cohort memberごとexactly oneへ正規化する。cohort解決は`O(H log H)`、receipt検証とevidence組立は`O(H)`、追加memoryは`O(H)`とする。`H`はregistry由来であり、現行5件を定数分岐へ埋め込まない。

duplicate、missing、別revision、cohort外receiptは全量fallbackせずincompleteまたはclosed `ContractError`へ閉じる。skip / failed receiptをpassとして数えない。

## Terminal transaction

terminal planはevaluation snapshotのaudit / state projection revisionを再利用し、lock内で全validation eventを再読する。transaction identityとordered event identitiesを事前計算し、成功時はaudit transaction単位でprojection revisionをexactly 1進める。CAS競合時は再scanで推測せず、新snapshotからevaluationをやり直す。

## Verification

現行5 harness exact tuple、receipt入力順変更、duplicate / missing / skipped / forged authorization、parallel completion、CAS drift、same-plan replayをfixture化する。成功時のreceipt集合・evidence digest・transaction ID・result digestが全harnessで一致し、失敗時にterminal eventが0件であることを要求する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:01:48Z
- **Iteration:** 1
- **Scope decision:** none

公開call shapeはcommit済みrun state、canonical reader、proof verifier、branded permitへ改善された。しかしpermit消費の原子claimがなく、並行process／cloneによる同一attemptの重複dispatchを排除できない。

### Findings

- BLOCKER | RunDispatchPermitのsingle-use性がcanonicalに実装できない。bindTransitionCommitは同じcommit receiptとcurrent authorized stateから複数回同一permitを再構築でき、dispatchの直前再読もrun headを変更しないため、2 process／cloneが同時に同じstartedまたはredispatch-authorized headを読み、双方がrevalidationを通過してnative portを呼べる。設計はreused permit拒否とJudge invocation重複0を要求するが、dispatch-consumed／claimed event、atomic CAS、またはoperation＋attemptをキーにしたnative dispatchの厳密なidempotency contractがない。permit IDの消費をeffect前にcanonical CASで一度だけclaimするか、native portが同一operation・attemptをexactly one operationへ畳み込むauthoritative idempotency receiptを定義し、競合callerをreconcileへ送る必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T16:03:29Z
- **Iteration:** 2
- **Scope decision:** none

dispatch permitはcurrent-head CASによるLIVE_SMOKE_RUN_DISPATCH_CLAIMEDへ一度だけ束縛され、競合process／cloneはreconcileへ戻る。さらにoperation＋attemptのauthoritative idempotency keyがnative側の並行・再送を同一operationへ線形化するため、重複Judge実行と予算再消費を防止できる。全7成果物は整合し、未解決BLOCKERや具体的な循環依存はない。

### Findings

- None
