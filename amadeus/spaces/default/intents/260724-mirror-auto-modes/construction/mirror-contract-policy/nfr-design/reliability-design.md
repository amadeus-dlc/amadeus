# Reliability Design — mirror-contract-policy

> 上流入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`

## Failure Domains

| Domain | Owner | Failure result | Forbidden fallback |
|---|---|---|---|
| selector／filesystem read | C1 adapter | typed `read-failure` | missing扱い |
| schema／mode parse | C1 parser | all invalid issues | partial precedence |
| event serialization | C2 identity | fail-fast | timestamp／random key |
| policy evaluation | C2 policy | one exhaustive decision | implicit prompt |
| completion selection | C2 selector | same operation or next safe operation | predecessor bypass |
| GitHub／state mutation | downstream C6／C3 | typed outcome | C2内retry |

## Determinism and Idempotency

event keyは`["mirror-event",1,intentUuid,boundary.kind,boundary.instance,operation]`の標準JSON UTF-8 bytesをbase64url paddingなしでencodeする。serializerを1 functionへ閉じ、golden vectorsにASCII、Unicode、quote、backslash、empty detailを含める。表示detail、session、timestamp、呼出し回数はidentityへ含めない。

C2はsame-event `skipped-for-event`を同じreceiptへ収束させる。completion selectorはcurrent completion instanceのreceiptだけを読み、`prepared | attempted | pending`では同じoperationを返す。create／syncのskip、failure、safety-blocked後は後続operationを返さない。

## Recovery and Degradation

本Unitはstate write、audit append、remote retryを実行しないためrollback storeを持たない。C1のread／parse failureはtyped outcomeとしてC7へ返す。C2のexhaustive boundaryでunknown union／corrupted snapshotを検出した場合はfallback decisionを返さず例外を投げ、C7の唯一のadapter boundaryがこれを`invalid-runtime-state` outcomeへ変換する。どちらもoperationは0件で、C7はworkflow stage結果を失敗へ変えず、C3 global warningとC8 statusへ投影する。

- config missingだけを未指定として扱い、permission／I/O／selector ambiguityをretryable missingへ変換しない。
- `off`中も既存pending receiptを保持し、本Unitはretry actionを返さない。
- prompt skipは同じeventだけへ適用し、別boundary instanceで再評価する。
- manual operationはmode failureから独立するが、downstream safety guard failureを成功へ変換しない。
- corrupted state／unknown unionはC2内部でfail-fastし、C7 boundaryでtyped `invalid-runtime-state`へ変換する。exceptionをworkflow engineへ漏らさず、best-effort decisionも返さない。

## Observability Contract

C2はevent identity、decision kind、reason、operation identity素材だけを返す。C7がこれを`MirrorCoordinatorHandoff`へ写像し、C3が既存`ARTIFACT_UPDATED`とstate、C8がstatusを所有する。同値再入でC3 transitionが`unchanged`ならaudit追加は0件である。

最低signalはstarted、succeeded、failed／safety-blocked、skipped、reconciled、configuration warning、unsynchronized warningである。各signalはoperation event／ID、reconciliation flag、secret-free classificationを持ち、別operationのwarningをclearしない。

```text
MirrorCoordinatorHandoff =
  | { kind: "operation-started"; triggerEvent; operationEvent;
      operationId; reconciliation: false }
  | { kind: "operation-succeeded"; triggerEvent; operationEvent;
      operationId; reconciliation: false }
  | { kind: "operation-failed"; triggerEvent; operationEvent;
      operationId; reconciliation: false;
      classification: MirrorFailureClassification }
  | { kind: "operation-safety-blocked"; triggerEvent; operationEvent;
      operationId; reconciliation: false;
      classification: MirrorSafetyClassification }
  | { kind: "operation-skipped"; triggerEvent; operationEvent;
      operationId; reconciliation: false; skipReason: MirrorSkipReason }
  | { kind: "operation-reconciled"; triggerEvent; operationEvent;
      operationId; reconciliation: true;
      classification: MirrorReconciliationClassification }
  | { kind: "configuration-warning"; issueKey; layer; path; key;
      actualType; expectedValues }
  | { kind: "unsynchronized-warning"; effect: "set"; operationEvent;
      operationId; boundary; attemptedAt; retryable; summary; remoteEffect }
  | { kind: "unsynchronized-warning"; effect: "clear";
      operationEvent; operationId }
  | { kind: "invalid-runtime-state"; issueKey; summary }
```

dedup keyはoperation variantが`operationId + kind + classification-or-reason`、configuration／invalid warningが`issueKey`、unsynchronized warningが`operationId`である。warning clearは同じoperation IDの`operation-succeeded`／`operation-reconciled`だけが生成でき、別operation IDやconfiguration warningをclearしない。

## Verification

1. repeated／property testでdeep-equal input 100回のoutput bytes一致を確認する。
2. filesystem failure matrixでGitHub adapter call 0件、workflow継続warningを確認する。
3. distinct boundary instance、cross-completion receipt、prepared／attempted／pendingをstate table testで網羅する。
4. unknown union、corrupted state、invalid configでoperation 0件とfail-closedを確認する。
5. started／succeeded／failed／skipped／reconciledのContext fixtureと同値再入audit 0件をdownstream contract testへ渡す。

## Traceability

| Requirement | Design／Verification owner |
|---|---|
| REL-CP-01 | Determinism、repeated／property test |
| REL-CP-02／03 | Event Identity、golden／resume table |
| REL-CP-04／05 | C1 typed aggregation、multi-invalid／filesystem injection |
| REL-CP-06／07 | keyed Completion Snapshot、cross-instance／in-flight table |
| REL-CP-08 | sequential predecessor rule、failure table |
| REL-CP-09 | C2 fail-fast→C7 typed boundary、corrupted-input test |
| observability signals | `MirrorCoordinatorHandoff`、dedup／clear fixture |
