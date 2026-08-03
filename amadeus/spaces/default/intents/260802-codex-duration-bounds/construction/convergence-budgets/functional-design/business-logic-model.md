# Business Logic Model — convergence-budgets

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

## 目的と境界

`unit-of-work` の #1998 Unitを、`unit-of-work-story-map` に従い #1602のexecution identity上で実行する。`requirements` FR-02／FR-03／FR-04A、`components` C2／C3、`component-methods` のConvergence Policy／Error Contract、`services` のrecoverable failure flowを正とする。対象は既存のStop／continuationとswarm dispatch系retryだけであり、任意toolやapprovalを自動retry対象へ広げない。

## Budget Reserve アルゴリズム

1. callerは`rootOperationId`、budget kind、安定したsubject、idempotency key、検証済みcap、config version／digestをC2へ渡す。
2. C2はper-intent lock内でcanonical auditをfoldし、同じkeyの既存receiptがあれば再利用する。
3. 初回reserveではC2がeffective capとconfig version／digestをBudgetSubjectへ耐久化する。後続要求は保存済みpolicyと完全一致しなければ`budget-policy-mismatch`で拒否し、counterを変更しない。
4. C3は現在値と耐久化済みcapを純粋評価する。`current < cap`だけをreservedとし、次値は`current + 1`とする。
5. C2はreservation、counter、必要なattempt IDを1 event batchでcommitする。
6. required projection receiptから`StartPermit`を得たcallerだけが同じreservationを`claimDispatch`し、最初のclaimだけがdispatch権を得る。native受付直後にC2の`confirmDispatch`でhandle、`nativeAcceptedAt`、`startedAt: Fact`をcommitして処理を継続する。
7. cap回目は実行可能だが、次の開始要求はexhaustedとなりcounterはcapのまま維持する。
8. exhausted時は新attemptをmintせず、typed reason、value／cap、last durable progress、next actionをtermination recordへ書く。

### Reserve・Claim・Dispatch・Finish 状態遷移

| State | Command | Result |
|---|---|---|
| absent | reserve | policy snapshot、counter、attemptをcommitし`reserved` |
| `reserved` | same reserve replay | 同じreceipt、counter不変 |
| `reserved` | claim | 一度だけ`claimed:true` |
| `claimed` | same claim replay | `claimed:false, already-dispatched`。native再dispatchは禁止 |
| `claimed` | confirm native handle | `dispatch-confirmed` |
| `claimed` recovery | no-effect-confirmed | `dispatch-not-started`でfinishし、新retry reserveを評価 |
| `claimed` recovery | effect possible／unknown | `dispatch-effect-unknown`で安全停止 |
| `dispatch-confirmed` | finish | outcomeとtermination reasonを一度だけcommit |

未claim reservationは同じsemantic requestがclaimでき、別callerが勝手に破棄しない。reservation commit時にattemptを消費するため、claimed recoveryでnot-startedになってもcounterを戻さない。

## Stop／Continuation 処理

Stop評価が継続を必要とするたびに、stage instanceに結び付いた`stop-continuation` budgetを予約する。audit noise、compact、session resume、別hook invocationでsubjectを変えず、同じrootへfoldする。同じ意味上のcontinuationの再送は同じidempotency keyを使う。

budgetが残る場合だけcontinuationを開始する。exhausted、state不整合、canonical write失敗では新しいcontinuationを開始せず、安全停止を返す。停止表示は全harnessで同じtyped termination recordから描画する。

## Recoverable Retry 処理

1. adapter／executorは`retryClass`、`effectStatus`、`causeCode`、`sourceSurface`をfactとして返す。
2. C3はversioned allowlistと4 field完全一致で分類する。v1の許可行は次表だけであり、表にない組合せは許可しない。
3. 非許可、unknown、effect possible、auth／permission／config／validation、canonical write失敗はretryしない。
4. 許可時も`recoverable-retry` budgetをC2でatomic reserveできた場合だけ、同じoperationの新attemptを開始する。
5. 開始時にattemptとremainingを短く通知し、成功すれば通常flowへ戻る。exhaustedなら安全停止する。

| ruleId | allowlistVersion | retryClass | effectStatus | causeCode | sourceSurface |
|---|---:|---|---|---|---|
| `RR-V1-WSU-DISPATCH` | 1 | `recoverable-transient` | `no-effect-confirmed` | `worker-spawn-unavailable` | `swarm-dispatch` |
| `RR-V1-WSU-WORKER-START` | 1 | `recoverable-transient` | `no-effect-confirmed` | `worker-spawn-unavailable` | `swarm-worker-start` |
| `RR-V1-ROPT-STOP` | 1 | `recoverable-transient` | `no-effect-confirmed` | `read-only-probe-timeout` | `stop-continuation` |
| `RR-V1-ROPT-RESULT` | 1 | `recoverable-transient` | `no-effect-confirmed` | `read-only-probe-timeout` | `swarm-result-collection` |

unknown allowlist version、4 field欠落、cross-product上の未列挙組合せは`retry-policy-version-unknown`または`retry-not-allowlisted`としてfail-closedにする。

## Termination Reason Mapping

正準型は`TerminationReasonV1`だけとする。schema version 1のreason codeは`budget-exhausted | retry-not-allowlisted | retry-effect-unknown | retry-policy-version-unknown | budget-policy-mismatch | dispatch-effect-unknown | state-inconsistent | canonical-write-failed`である。全recordは`schemaVersion: 1`、`reasonCode`、`budget: Fact<{consumed,cap}>`、`lastDurableProgress`、`recommendedNextAction`、`rootOperationId`を持つ。budget非適用reasonでもbudget factを明示する。

decoderが未知reason codeを受けた場合はraw codeを保持した`unknown-termination-reason`へ正規化し、新規実行を開始しない。mappingは、cap拒否→`budget-exhausted`、allowlist不一致→`retry-not-allowlisted`、effect unknown→`retry-effect-unknown`、policy不一致→`budget-policy-mismatch`、dispatch crash unknown→`dispatch-effect-unknown`、不整合／write失敗→対応するsystemic codeとする。

## 境界決定表

| Current | Request | Decision | Counter | New attempt |
|---:|---|---|---:|---|
| 0..cap-1 | first delivery | reserved | current+1 | 必要時にmint |
| 0..cap-1 | same idempotency replay | existing receipt | 不変 | 既存ID |
| cap | new delivery | exhausted | cap | なし |
| any | non-allowlisted retry | non-retryable | 不変 | なし |
| any | canonical state unsafe | safe-stop | 不変 | なし |
| any | cap／config version mismatch | typed refusal | 不変 | なし |

## Unit間接続と測定

#1602のroot／operation／attemptを再利用し、controlとtreatmentでduration、attempt数、counter、termination reasonを比較する。`interaction-budgets`と`bounded-unit-pool`は同じreserve意味論を再利用する。具体的なdefault／hard capは #1602 baselineを入力にNFR Requirementsで決める。

## Revision 1 Reconciliation

Application Designの`confirmDispatch`と`StartPermit`へ状態遷移を接続し、4 allowlist行へstable rule IDを付与した。classificationをdiscriminated union、terminationを`TerminationReasonV1`へ一本化し、canonical write失敗は`persisted:false`のprocess-boundary refusalとして扱う。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:02:07Z
- **Iteration:** 1
- **Scope decision:** none

required-sections と upstream-coverage は全3成果物で通過した。TypeScript/JavaScript snippetがないためlinter/type-checkは対象外。明示的Q&A consumeがないためanswer-evidenceも対象外。一方、再開時の重複dispatch防止、retry allowlist、capの耐久性、termination schemaに実装を一意化できない欠落がある。

### Findings

- Major | business-logic-model.md「Budget Reserve アルゴリズム」手順4–5・「Recoverable Retry 処理」手順4、domain-entities.md「ExecutionReservation」「Lifecycle」、component-methods.md「Execution Lifecycle Coordinator」 | Functional Designはreserve commit直後に処理を開始するとするが、上流契約が要求するreserved → claimedのclaimDispatch遷移を記述していない。同じreceiptのreplay後に再dispatchするのか、未claim reservationを回収するのかが不明で、crash windowで二重実行または永久滞留が起こり得る。Action: reserve、claim、native dispatch、finishの状態遷移表を追加し、claimのidempotency、crash replay、already-dispatched、未claim回収、attempt消費時点を明示する。
- Major | business-logic-model.md「Recoverable Retry 処理」手順2、business-rules.md BR-CB-07〜11、domain-entities.md「RetryClassification」、component-methods.md「Convergence Policy」 | 初期allowlistを「許可済みsurface上のcause」としているが、causeCode × sourceSurfaceの許可組合せが列挙されていない。各adapterが異なる組合せを許可でき、共有core predicateの一意性を満たさない。Action: 4 fieldすべてを含むversion付き完全一致表を定義し、各許可行と全negative組合せ、unknown versionのfail-closed結果を固定する。
- Major | business-logic-model.md「Budget Reserve アルゴリズム」手順1–3、business-rules.md BR-CB-04・06、domain-entities.md「BudgetProjection」「Lifecycle」 | callerが毎回capを渡す一方、進行中BudgetSubjectで設定値またはversionが変わった場合の規則がない。resume後にcapを増やせばhard budgetを延長でき、減らせばvalue <= cap不変条件を破る。Action: 初回reserveでeffective capとconfig versionを耐久化し、同一subjectでは固定する。後続要求のcap不一致をtyped refusalまたは既存cap再利用へ一意化し、境界testを追加する。
- Major | business-rules.md BR-CB-14・16、domain-entities.md「BudgetExhausted」「TerminationRecord」、components.md「Public Contract Shape」 | terminationReason／reasonが未型付けで、budget exhaustion、non-allowlisted retry、unsafe state、canonical write failureの正準reason codeと対応関係がない。全harness rendererとconformance testを同じunionから実装できない。Action: versioned termination reason union、各決定からのmapping、必須payload、未知reasonの扱いを定義し、BudgetExhaustedとTerminationRecordのfield名・型を統一する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T05:09:03Z
- **Iteration:** 2
- **Scope decision:** none

required-sections と upstream-coverage は全3成果物でPASS。linter／type-check／answer-evidenceは非該当。iteration 1のimmutable cap policyは解消済みで、allowlist完全一致表も概ね追加されたが、claim遷移を実行する公開APIがなく、allowlist classificationおよびtermination schemaにも実装不能な型矛盾が残る。

### Findings

- Major | business-logic-model.md「Reserve・Claim・Dispatch・Finish 状態遷移」、component-methods.md「Execution Lifecycle Coordinator」 | claimed → dispatch-confirmedを必須遷移として追加したが、C2の公開契約にはこれをcommitするconfirmDispatch相当のmethodが存在しない。さらに上流ではclaimDispatchが実開始時刻をcommitする一方、本成果物ではnative開始確認後にdispatch-confirmedをcommitするため、正準開始時点も矛盾する。Action: native handle／開始確認をcommitするC2 commandを定義し、claim時刻・native開始時刻・AttemptStart生成時点、replay時の返却型を一意化する。
- Major | domain-entities.md「RetryClassification」、business-logic-model.md「Recoverable Retry 処理」 | RetryClassificationは常にmatchedRuleIdを持つが、v1 allowlistの4行にはrule IDがなく、non-match／unknown-version時には参照可能な行自体がない。型どおりのclassificationを生成できない。Action: 各許可行へ安定したrule IDを付け、matchedRuleIdをretryable branchだけに持つdiscriminated unionとし、non-retryable／unknown-version branchのreason codeを固定する。
- Major | business-logic-model.md「Termination Reason Mapping」、business-rules.md BR-CB-14／17A、domain-entities.md「BudgetExhausted」「TerminationRecord」、components.md「Public Contract Shape」 | iteration 1で要求されたfield名・型統一が未完了。BudgetExhausted.terminationReasonCode、TerminationRecord.reasonCode、BR-CB-14のreason、上流ReserveResult.terminationReason: stringが併存する。またbudget非適用reasonではconsumed/capをFactとするとしながら、Domain Entityはその型を定義していない。Action: versioned termination unionを単一のdiscriminated unionとして定義し、全結果型でreasonCodeへ統一する。consumed/capのavailable/unavailable型と、canonical write失敗時に耐久記録不能でも返せるfail-closed response境界も明記する。
