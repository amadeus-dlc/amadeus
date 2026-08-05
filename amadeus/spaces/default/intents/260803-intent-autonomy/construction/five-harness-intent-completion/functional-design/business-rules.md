# Business Rules — five-harness-intent-completion

## 上流入力と適用範囲

本規則は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`からU5 `five-harness-intent-completion`の不変条件を抽出する。対象はlive authorization、receipt validation、completion cohort、terminal transaction、persistence、package driftである。

## Cohort・registry規則

| ID | Rule | Violation |
|---|---|---|
| CMP-C01 | registryだけをcohort authoring sourceとし、Coreへharness名分岐を置かない | registry drift |
| CMP-C02 | GA cohortはclaude / codex / cursor / opencode / kimiのexactly five | contract failure |
| CMP-C03 | Kiro / Kiro IDEはregistryに保持するが今回のcohortへ含めない | cohort mismatch |
| CMP-C04 | future harnessはregistry capabilityとadapter追加だけで参加可能にする | architecture violation |
| CMP-C05 | empty / duplicate / unknown / capability不一致cohortを拒否する | malformed cohort |

## Live authorization規則

| ID | Rule | Violation |
|---|---|---|
| CMP-A01 | credential-attested environmentだけがauthorization draftを作れる | unauthorized |
| CMP-A02 | protected authorization eventのcommit receipt確認前にlive runしない | provenance error |
| CMP-A03 | authorizationはIntent / harness / revision / package / registry / scenario / environment / trace / attestationへ束縛する | binding mismatch |
| CMP-A04 | credential / token / raw attestationをrecordへ保存しない | privacy violation |
| CMP-A05 | 同一authorization replayはsame receipt、binding変更は別identity | idempotency error |
| CMP-A06 | U5 authorization eventはregistry / scenarioを含む完全revisionをclosed payloadへ保存する | schema reject |

## Scenario・receipt規則

- live scenarioは認可された一時workspaceでのみ実行し、不可逆な外部effectを持たない。
- Judgeはpending requestと同じinvocation IDで`invokeOnce`し、request / result / trace一致を観測する。
- election native path、またはrecommendationへのloud degradationをcanonical eventで観測する。
- adapter自己申告booleanを成功根拠にせず、M08 validatorがcanonical auditを直接読む。
- validation成功はprotected `LIVE_SMOKE_RECEIPT_VALIDATED` eventへcommitし、commit receipt確認済みのvalidationだけをcompletionへ使う。
- `outcome=passed`、Judge観測、election / loud degradation観測の全条件を要求する。
- `skipped / failed`、null observation、偽authorization、trace / environment / revision mismatchを拒否する。

## Completion規則

| ID | Rule | Violation |
|---|---|---|
| CMP-E01 | 全receiptは同じIntent / cohort / revision / package / registry / scenarioに一致する | evidence mismatch |
| CMP-E02 | cohort memberごとexactly oneのvalidated receiptを要求する | missing / duplicate |
| CMP-E03 | 入力順をidentityにせずcohort順へcanonicalizeする | nondeterminism |
| CMP-E04 | incompleteはmissing / rejected集合を返しsuccess eventを作らない | false completion |
| CMP-E05 | evidence identityは全receipt / authorization / source revisionを含む | identity error |
| CMP-E06 | evidenceはvalidation event / validation digest / Judge・election observation proof digestを全member分含む | evidence mismatch |
| CMP-E07 | completion evidence eventはexactly one `payload_v1`、closed field順、canonical payload / event digestを持つ | schema / identity error |

## Terminal transaction規則

- complete evaluationだけがterminal planへ進める。
- event順はcompletion evidence、optional grant completed、workflow null、`WORKFLOW_COMPLETED`で固定する。
- fullのactive grantはcompletedへ遷移し、none / semiはgrant eventを作らない。
- evaluatorがvalidation event snapshotから得たauthoritative audit revisionをM07 `AuditTransaction.expectedRevision`へ使い、caller入力を受けない。
- evidence、mode / grant / workflow、revisionをappend lock内で再検証する。
- completion evidence payload / digest / event identityをcanonical validation eventsからlock内再計算する。
- terminal transaction IDはevidence ID / digest、cohort、順序付きevent IDs、expected audit revision、source projection revisionのcanonical tupleから生成・lock内再計算する。
- state projection revisionは成功transactionごとexactly 1進み、planにsource+1のexpected post-commit revisionを固定する。
- 全event commitを示すreceipt確認後だけcompleted resultを返す。
- partial / conflict / unknown event / receipt mismatchではstateとresultを完了扱いにしない。
- replayはsame event identities、transaction receipt、completion resultを返す。
- 同一terminal transaction replayはprojection revisionを二重incrementしない。

## Persistence・privacy規則

| ID | Rule |
|---|---|
| CMP-P01 | session / process / compaction / clone後にcanonical auditからcompletion stateを復元する |
| CMP-P02 | runtime scratch / 一時workspace / timestampを正本やidentityにしない |
| CMP-P03 | raw credential / provider prompt / host payloadをaudit、status、OTelへ載せない |
| CMP-P04 | completed review extensionはcompletion evidence / seal / grant / workflowを変更しない |
| CMP-P05 | redaction failureはwithheldとして扱いraw fallbackしない |

## Package・drift規則

- registryからpackage/setup/promote/self-install projectionとHarnessDescriptor ID unionを生成する。
- current fiveのcontract adapterと`autonomyLive=true`をdrift guardで検証する。
- Kiro系falseをpass代替にしない。
- harness adapterへauthorization、completion evaluator、terminal state machineを複製しない。
- contract testは全5件のexact receipt、negative oracle、canonical digestを比較する。
- live credentialなしはskipとして可視化するが、completion evidenceへ寄与させない。

## Failure classification

| Failure | Result | State | Recovery |
|---|---|---|---|
| registry / cohort malformed | error | unchanged | registry修正 |
| credential / authorizationなし | skipped / incomplete | runningまたはAWAITING_HUMAN | 認可済み環境で再実行 |
| live scenario failed | failed / incomplete | unchanged | evidence修正後に再実行 |
| receipt mismatch / forged | provenance error | unchanged | canonical receipt取得 |
| 1〜4harnessのみpass | incomplete | not completed | missing harness収集 |
| terminal CAS conflict | conflict | unchanged | snapshotから再評価 |
| commit receipt mismatch | error | completion未成立 | canonical transaction確認 |

## 要件・AC追跡

| Rule group | Requirement / AC |
|---|---|
| cohort / registry / drift | FR-HAR-001、005〜007、2067-AC22、26 |
| authorization / scenario | FR-HAR-003、2067-AC23〜24 |
| receipt / completion | FR-HAR-002〜004、2067-AC22〜25 |
| terminal / persistence | FR-GRT-009、FR-STP-007、NFR-DET-002、NFR-REL-003 |
| privacy / review continuity | NFR-PRV-001〜002、FR-OBS-004 |

## 非目標

- PR / merge、外部runner / supervisor、Kiro系live、credential保存。
- production不可逆操作、harness別Core fork、新stage。
