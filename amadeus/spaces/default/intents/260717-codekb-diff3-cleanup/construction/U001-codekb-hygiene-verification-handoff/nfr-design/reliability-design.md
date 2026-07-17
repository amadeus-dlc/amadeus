# Reliability Design — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Reliability Strategy

`reliability-requirements.md` のfalse-green 0件を最優先し、`business-logic-model.md` のstate machineをfail-fast / fail-closedで実行する。`performance-requirements.md` のcomplete tuple、`scalability-requirements.md` のref isolation、`security-requirements.md` のvalid provenance、`tech-stack-decisions.md` の既存Git / Amadeus toolsを組み合わせる。

Remote dependencyやlong-running serviceがないため、circuit breaker、exponential backoff、bulkhead process、health endpoint、multi-AZ failover、replication、backup / restoreを追加しない。Resilienceはinvalid evidenceを次boundaryへ流さないことに置く。

## Failure-State Design

| Failure | Detection | State / output | Recovery |
|---|---|---|---|
| Ref unresolved | Git resolve failure | `pre-landing-stopped` | explicit refを修正しcomplete set再実行 |
| Target missing | blob read failure | `pre-landing-stopped` | 同一または新refを明示してcomplete set再実行 |
| Marker / H2 mismatch | actual count != invariant | `pre-landing-stopped` + diagnostics | content修正後に新MeasurementRefで再検証 |
| Evidence missing / non-green | admissibility check | `pre-landing-stopped` | 正規CI / review / sensor / gateを取得 |
| Grant expired / rejected | authority validation | stage stays unapproved | 新human turn / grantを待つ |
| Main not landed | no landed ref | `landing-pending` | human landingを待つ |
| Landed verification red | landed counts mismatch | `post-landing-stopped` | 新attempt ID / timestampと明示ref + SHAで再観測 |
| Issue prematurely CLOSED | Issue state before green evidence | `post-landing-stopped` + ordering violation | human remediation後に新attempt ID / timestampを生成し、同一または新ref + SHAを明示 |

Functional Design Review Finding #5を閉じるため、`MeasurementAttempt = { attemptId, observedAt, measurement: MeasurementRef(ref, SHA) }`をlanded measurementのidentityとする。同一commit / 同一refを再観測する場合でも新しい`attemptId`と`observedAt`を発行し、countsとIssue observationをそのattemptへ結び付ける。`post-landing-stopped`から`landed-measuring`への遷移は新attemptを要求するが、`MeasurementRef`の値自体は同一でもよい。これにより同値再観測を識別し、Issue stateだけの暗黙更新を防ぐ。

## Retry and Idempotency

- Retry unitは1 stepのpartial continuationではなく、1 `MeasurementAttempt`のcomplete measurement setである。
- 同じSHA / command / patternは同じ12-count tupleを返す。
- Completed / approved stageへのreportはengineのidempotencyに任せ、conductorが重複reportしない。
- Git push失敗時はcommit SHAを保持して同branchへ再pushし、成果物を作り直さない。
- No silent fallback: ref / evidence / authorityを推測で置換しない。

## Observability Design

Observability surfaceはversion-controlled artifactとtool-owned auditである。Measurement attempt ID / observedAt / SHA、path、pattern、counts、matches、ancestry、CI head、reviewer、sensor、§13、gate、push SHA、landed ref、Issue observationを別fieldとして保持する。

Alerting backendは追加しない。Stop eventはleader / humanへのhandoff対象とし、reason、owner、required recovery、last admissible SHAを記録する。

## Backup and Disaster Recovery

新規database / object store / service stateがないためRPO / RTO、backup schedule、replicationは非該当。DurabilityはGit commitとremote branch pushで確保し、machine-local scratchをevidence sourceにしない。Force push、history rewrite、main mergeを本conductorは行わない。
