# Security Design — five-harness-intent-completion

## 入力とtrust boundary

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

trust boundaryはcredential-attested environment、protected authorization / validation append、canonical evidence reader、terminal append lockである。caller提供audit、receipt配列、registry membership、revision、observation booleanをauthorityとして信用しない。

## Credentialとauthorization

`LiveAuthorizationPort`はcredential値を返さず、safe environment ID、issuer principal、trace / span、attestation digestだけを返す。U5 serviceはIntent、harness、cohort、implementation / package / registry / scenario revisionをclosed `LIVE_SMOKE_AUTHORIZED.payload_v1`へ束縛する。commit receiptを検証する前にnative scenarioを開始しない。

credential、token、raw command、raw provider prompt、未redact tool payloadをaudit、receipt、status、telemetry、artifactへ保存しない。redactionまたはattestation生成に失敗した場合はauthorizationを発行せず、raw fallbackを禁止する。

## Receipt proof

M08 validatorはM07 adapterからauthorization event、commit receipt、Judge request / result、election decisionまたはloud degradationを同一canonical snapshotで読む。Intent / harness / authorization / environment / trace / revisionをexact matchし、adapter自己申告の`judgeObserved`を単独証拠にしない。

unknown / missing field、duplicate event、forged authorization、trace mismatch、null observation、skipped / failed outcomeはvalidation eventを作らない。validation digestとobservation proof digestをprotected `LIVE_SMOKE_RECEIPT_VALIDATED`へ保存し、terminal lockで再計算する。

## Least privilegeとprivacy

live workspaceは一時的かつ不可逆な外部effectを持たない。adapter権限は対象harnessのnative invocation、same-operation reconciliation、safe observation抽出へ限定し、grant変更、PR / merge、外部deploymentを許可しない。operation reference / Judge invocation IDはeffect前にprotected run reservationへ保存する。dispatch permitはcanonical CAS claim後の`ClaimedRunDispatch`へbindし、native portはoperation + attempt idempotency keyでexactly one operationへ線形化する。attested no-effectは専用proof verifierがcanonical operation logへ一致させる。Event Registry / OTelはIntent、harness、authorization、run / operation、receipt、evidence、transaction、traceのsafe ID / digestだけを相関可能にする。

## Verification

credential不足、issuer mismatch、revision drift、replayed attestation、cross-Intent receipt、forged Judge observation、raw secret混入、validation event改変をnegative fixtureにする。どの場合もcompletion evidence、grant completion、`WORKFLOW_COMPLETED`を0件とする。
