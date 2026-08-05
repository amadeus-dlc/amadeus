# Reliability Design — five-harness-intent-completion

## 入力とfailure semantics

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

live authorization、native observation、receipt validation、cohort evaluation、terminal commitを別checkpointにし、各境界をcanonical event / commit receiptで再開可能にする。runtime scratchや一時workspaceを正本にしない。

## Crash and replay

authorization append前crashは未認可、append後crashは同じauthorization ID / commit receiptから再開する。native effect前にharness単位の`LIVE_SMOKE_RUN_RESERVED`をcommitし、stable run ID / operation reference / Judge invocation ID、`maxDispatches=2`を保存する。resumeは常に同じoperationをreconcileし、completedならdispatchせずreceiptを回収する。

coordinatorはcaller提供run stateやproofを受けずcanonical current runを再読する。reservation / started / redispatch transitionごとにM07 commit receiptを検証して`CommittedIntentLiveRunState`へbindし、startedまたはredispatch-authorized eventがcanonical headである場合だけbranded dispatch permitを発行する。native portはこのpermit以外のdispatch overloadを持たない。

dispatch permitはeffectを直接許可しない。coordinatorはpermit ID / operation / attempt / authorized headを含む`LIVE_SMOKE_RUN_DISPATCH_CLAIMED`をM07のcurrent-head CASでappendし、commit receipt検証後の`ClaimedRunDispatch`だけをnative portへ渡す。並行claimのloserは`CONFLICT(dispatchClaim)`から同じoperationのreconcileへ戻る。

native portはoperation reference + attemptのdomain-separated digestをauthoritative idempotency keyにし、並行・再送をexactly one native operationへ線形化する。重複callerは同じnative operation IDへattachし、別Judgeを起動しない。dispatch receiptのkey / operation / proofはcoordinatorがcanonical claimと照合する。

初回started後にnative側がattested no-effectを返し、専用proof verifierがcanonical operation logへexact matchした場合だけ、永続`LIVE_SMOKE_RUN_REDISPATCH_AUTHORIZED`でattempt 2を消費して最大1回再dispatchする。dispatch直前にもpermitとcanonical head / budgetを再検証する。effect-possible / unknown、またはattempt 2後の未回収は`LIVE_SMOKE_RUN_INCOMPLETE`へterminal化し、追加dispatchせずcohortをincompleteに保つ。validation append後はcanonical validation eventを再利用する。同一event identity / payloadはidempotent、同一identityの異payloadは`CONFLICT`とする。

evaluatorはcanonical validation set snapshotだけからcomplete / incompleteを返す。missing、skipped、failed、別revision receiptを補完・推測せず、incomplete時はcompletion evidence eventを作らない。

## Atomic terminal transition

terminal event順は`LIVE_COMPLETION_EVIDENCE_VALIDATED`、nullable grant-completed、workflow-state-null、`WORKFLOW_COMPLETED`に固定する。transaction IDはevidence、cohort、ordered event identities、audit / projection revisionへ束縛し、M07 lock内で再計算する。

全event appendまたは全件拒否とし、grantだけcompleted、workflow stateだけnull、completion eventだけ存在する部分状態を公開しない。same plan replayはidempotency indexから同じcommit / terminal receiptを返し、revisionを再度進めない。

## Persistence

session / process / compaction / clone後にcohort、revision、authorization、live run reservation / attempt budget / terminal run state、validation集合、observation proof、evidence digest、grant、workflow result、completion sealを再構築する。completed後のU4 review extensionはterminal identityを変更しない。

## Failure injection

reservation / started / redispatch authorization / dispatch claim / completed / incompleteの各append直前・直後、並行clone claim、native idempotency key競合、Judge invoke直後、native process終了、clone merge、CAS drift、registry / scenario drift、partial receipt、duplicate ID、projection revision overflowへfailureを注入する。native operation / Judge invocation重複0、attempt 3発行0、unknown後dispatch 0、partial terminal 0、duplicate completion 0、same-plan receipt差分0、skipからcompletionへの昇格0を要求する。
