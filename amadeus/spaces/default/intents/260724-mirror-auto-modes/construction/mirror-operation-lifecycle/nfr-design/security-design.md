# Security Design — mirror-operation-lifecycle

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Authorization

autoはstanding consent、prompt／manualはone-operation consent、repairはTTL 10分のelevated consentとする。全経路でprovenance、repository、landing、final-sync guardを必須にする。

```text
MirrorExecutionAuthorization =
  | { kind: "auto"; event; operation; resolvedMode: "auto" }
  | { kind: "prompt-approved"; event; operation; expectedBindingId; answerId }
  | { kind: "manual"; event; operation; invocationId }
```

C7はauthorizationと最新snapshotをC6へ渡す。C6はoperation-specific guardを再評価し、durable attempted CAS winnerだけにrepository／Issue／event／operationをbindしたpermitを発行する。authorization自体はpermitではなく、guard／CASを迂回できない。

prompt承認ではC3 `approve-prompt-and-prepare`がexpected bindingのevent／operation／answerを検証し、そのconsumeと`prepared` receipt作成を1 atomic transitionで行う。receiptは`approval={kind:"prompt",expectedBindingId,answerId}`を永続化する。crash後はこのprepared receiptからreadinessを再開でき、新しいprompt回答を要求しない。auto／manual prepareも`approval={kind:"auto",modeSource}`または`{kind:"manual",invocationId}`を保存する。

C6はC3から返されたwritten receiptだけを受け、readiness成功後にC3 `mark-attempted(expectedRevision, receiptKey, approval)`をCAS実行する。CAS winnerのattempted receiptとbinding一致をcapability factoryへ渡した場合だけpermitを発行する。

## Safe Flow

prompt answerはexpected event／operationと一致させてatomic consumeする。mutation permitはdurable attempted receipt後だけ発行する。title／body／repositoryはshell falseのargument arrayで渡す。raw diagnostics／credentialをprompt、status、Issueへ含めない。

repairはinspectionがcanonical plan digestを作り、C3がchallenge ID、Intent、repository、operation、digest、exact phrase、issuedAtを保存する。applyは同じstate lock内で全binding、未消費、10分TTLを再検証し、repair transitionとchallenge削除を同じatomic commitへ含める。repairは通常permitへ変換せず、auto consentの対象外である。

## Verification

stale prompt、forged permit、guard failure、metacharacter、challenge replayでstate／remote mutation 0件を検証する。
