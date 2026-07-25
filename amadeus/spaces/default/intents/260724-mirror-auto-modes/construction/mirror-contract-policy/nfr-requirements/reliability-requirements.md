# Reliability Requirements — mirror-contract-policy

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Reliability Boundary

本Unitはconfig収集、parse、policy decision、event identity、completion selectionを所有する。GitHub mutation、remote/local partial success、duplicate candidate reconciliationはGateway／State／Lifecycle Unitが所有するため、ここではremote availability SLOを重複定義しない。

## Requirements

| ID | Requirement | Verification |
|---|---|---|
| REL-CP-01 | pure transformはdeep-equal inputにdeep-equal outputを返す | repeated／property test |
| REL-CP-02 | event keyは`["mirror-event",1,intentUuid,boundary.kind,boundary.instance,operation]`を標準JSON、UTF-8、base64url paddingなし、prefix `mirror-event:v1:`でbyte安定させ、表示用detailを含めない | golden vectors、Unicode／escaping cases |
| REL-CP-03 | 同じboundary instanceへのresumeは同じevent keyへ収束し、別instanceは別keyになる | identity table test |
| REL-CP-04 | invalid configが1件でもあれば全issueを返し、partial mode、fallback、operation attemptを返さない | multi-invalid test |
| REL-CP-05 | config missingは未指定、permission／I/O／selector ambiguityはtyped `read-failure`として区別する | filesystem failure injection |
| REL-CP-06 | completion selectorはcurrent completion instanceのreceiptだけを参照する | cross-instance isolation test |
| REL-CP-07 | current receiptが`prepared | attempted | pending`なら同じoperationを返し、後続operationへ飛ばない | state table test |
| REL-CP-08 | create／syncのskip、failure、safety-blocked後は後続operationを返さない | predecessor failure test |
| REL-CP-09 | unknown union variantはfail-fastし、`prompt`や`null`へ暗黙fallbackしない | compile-time exhaustive check＋runtime corrupted-input test |

## Fault Tolerance and Recovery

- GitHub利用不能でも本Unitのconfig／policy failureでAI-DLC stage stateをrollbackしない。coordinatorはtyped outcomeをwarningへ変換し、workflowを継続する。
- `off`は既存pendingを削除せずretry actionだけを抑止する。後続eligible boundaryでmodeを再解決する。
- `prompt` skipは同じeventだけに適用し、attempt countを増やさず、別eventのwarningを消さない。
- manual operationはmode failureから独立するが、C6の安全guard失敗を成功へ変換しない。
- policy自身はretry loopやstate mutationを持たず、reconciliationの再入点をtyped operationとして返す。

## Durability, Availability, and Observability

- 本Unitは独自永続storeを持たないためRPO／backup／restoreは非適用である。Intent state durabilityはState Provenance Unitのatomic write契約へ委譲する。
- 常駐serviceではないためmonthly availability SLO／MTTRは非適用である。
- configuration issueはlayer、path、key、actual type、expected valuesを含む利用者可視warningへ投影可能でなければならない。
- 本Unitは新しいaudit event typeを作らない。C3が既存`ARTIFACT_UPDATED`をemitするために必要な`MirrorAuditContext`を、C2のevent identity／decision reasonからC7へ渡す。

| Signal | Required fields | Emission／Projection condition | Deduplication | Downstream owner／Verification |
|---|---|---|---|---|
| operation開始 | trigger event、operation event、operation ID、`reconciliation=false` | C3の`prepare`／`attempted` transition成功時に既存`ARTIFACT_UPDATED` Contextへprojection | idempotent state再入が`unchanged`ならaudit追加0件 | C3／audit fixture |
| operation成功 | operation event、operation ID、classificationなし | `succeeded` transitionのatomic write成功時 | 同じreceiptの再completeは`unchanged` | C3／state＋audit integration |
| operation失敗 | operation event、operation ID、failure classification | `pending | safety-blocked` transition成功時 | 同じoperation ID／classificationの同値再入は0件 | C3／failure injection |
| prompt skip | operation event、operation ID、skip reason | `skipped-for-event` transition成功時 | 同じevent再入はreceiptを再利用しaudit追加0件 | C3／resume integration |
| reconciliation | trigger event、operation event、operation ID、`reconciliation=true`、classification | retry／adopt／remote-view convergence transition成功時 | 同じ収束済みreceiptの再入は0件 | C3／reconciliation integration |
| configuration warning | mode resolution failure、layer、path、key、actual type、expected values | C7がC3 `set-global-warning`へ渡し、status／次boundaryに表示 | 同じ内容はstate `unchanged` | C3／C8 status fixture |
| unsynchronized warning | operation、boundary、attempt timestamp、retryable、secret-free summary、effect | pending／safety-blocked時にstatusと次boundaryへ表示 | operation ID単位。対象successだけをclear | C3／C8 status fixture |

C2はevent identity、decision kind、reasonだけを返し、audit write、warning state、status renderを行わない。C7はこれらを`MirrorAuditContext`とwarning commandへ写像し、C3がatomic state／既存audit event、C8が利用者表示を所有する。

## Acceptance

1. 100回の同一入力評価で出力bytesが一致する。
2. remote状態を含まないpolicy再実行でoperation identityが増殖しない。
3. completion Aのreceiptがcompletion Bのoperation選択へ影響しない。
4. filesystem failure injectionの各caseでGitHub adapter callは0件、workflow resultは非阻害warningになる。
5. started／succeeded／failed／skipped／reconciledの各fixtureで必須Context fieldが揃い、同値再入のaudit追加が0件になる。
6. status fixtureがresolved mode、Issue、provenance、pending、warningを表示し、別operationのwarningを誤clearしない。
