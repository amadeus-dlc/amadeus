# Performance Design — interaction-budgets

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Budget Adapter

`InteractionBudgetAdapter`はstage instance、kind、key materialをC2へ渡し、resolve-or-createとreserveを1 lockで行う。NFR Requirementsに記載されたprimary 2/4・5/8・8/12、follow-up 1 batch、review 2は`candidateEnvelope`であり、#1602の計測前にはeffective policyとして有効化しない。

`BudgetCalibrationReceiptV1`を#1602 Unitの成果物としてcanonical auditへ保存し、次を含める。

- observed commit SHA、harness、workload ID、3 warmup＋20 measured runs
- controlのduration、primary／follow-up／review counter、termination reason
- sample欠落・timeout・外れ値除外の有無と、全sampleの参照
- candidateEnvelope各値について`accepted | narrowed | rejected`と根拠

`InteractionBudgetPolicyResolver`はreceiptが存在し、observed SHAが#1999 Unitのbase ancestorで、全workloadが完走した場合だけ`effectivePolicy`を返す。欠落・不一致・不完全なら`policy-unavailable`として新しい質問／review dispatchを開始せず、既存approval boundaryへ渡す。後続Unitが#1602着地後にrebaseされる直列Bolt順序を、このruntime preconditionでも強制する。

## Dispatch Bound

cap+1ではrenderer／reviewerを呼ばない。question batchは各primaryをreserveし、follow-upは複数material itemsを1 semantic batchにまとめる。review BudgetSubjectはArtifactSetで分割しない。

## Calibration Benchmark

`InteractionBudgetBenchmark`が同一fixture・同一harness・同一provider設定でcontrolとtreatmentを各3 warmup＋20 runs実行する。採否は次の全条件で閉じる。

1. treatmentのcounterがeffective hard cap以下で、cap+1のnative invocationが0件。
2. resume／crash replayでcounter増分0、termination reasonが全runで決定的。
3. treatment p95 durationがcontrol p95から5%超悪化しない。悪化時はcandidateを狭めるか`rejected`とする。
4. follow-up 1 batchとreview 2回の値は、#1602 receiptと#1999の承認済み裁定を同じcalibration recordへtraceできる。

計測ownerは#1602の`BaselineRunner`、policy採否ownerは#1999の`InteractionBudgetPolicyResolver`とし、receiptなしの暫定値をpackageへpromoteしない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T06:19:27Z
- **Iteration:** 1
- **Scope decision:** none

interaction budgetの主要コンポーネント名は揃っているが、短命CLIでの永続index、worktree横断HMAC key、crash recovery、既存C2/C4/C7との所有境界が閉じておらず、要求された停止性・冪等性・復旧性を開発者が推測なしに実装できない。さらに、上流で未解決のbudget数値根拠をそのまま設計値として固定しており、性能目標の達成可能性も立証されていない。

### Findings

- BLOCKER | scalability-design.md「Stage-scoped Index」／scalability-requirements.md「Growth Rules」／tech-stack-decisions.md「Bun／TypeScript／JSONL audit」 | `InteractionIndex`をMap化してO(1) lookupを実現するとするが、本システムは短命CLIであり、Mapの永続owner、process開始時の復元、canonical JSONL auditとの原子的整合、破損時の再構築が定義されていない。processごとの一時Mapならresume後に同じsemantic keyを見失ってinstance／counterを重複生成し、毎回audit全走査で復元するならO(1)要件を満たさない。Action: durable indexのschema・保存先・lock transaction・auditとのcommit順序・再構築手順を定義するか、永続auditからのlookup計算量を含む達成可能な要件へ改める。
- BLOCKER | security-design.md「Key Availability」／security-requirements.md「HMAC key lifecycle」 | 要件は`amadeus/.amadeus-sessions/interaction-hmac/<intentUuid>.key`を指定する一方、設計はworkspace rootの`.amadeus-sessions`とし、保存先が一致しない。また「全worktree processが同じroot keyを読む」の共通root解決規則、同時初期生成時の勝者確認、既存key読取との同期、cleanup ownerがない。worktreeごとに別keyを生成すると、同じdurable interactionがidempotent successではなくconflict／unavailableへ分岐する。Action: canonical repository共通パスの導出、atomic create後の再読込、mode検証、multi-process/worktree lock、retention・削除ownerを公開契約として固定する。
- BLOCKER | performance-design.md「Budget Adapter」／performance-requirements.md「Review — Iteration 2」／tech-stack-decisions.md「技術選定」 | 設計はprimary 2/4・5/8・8/12、follow-up 1、review 2を確定値として採用しているが、必須consumeであるperformance-requirements自身の最終レビューは、#1602 baseline receipt不足と上流要件との矛盾を理由にこれらの数値を未確定としている。設計には3 warmup＋20 runsの計測点、control/treatment比較、counter／termination reasonの合否判定もないため、固定値の妥当性と性能改善の達成可能性を検証できない。Action: baseline一次証拠を明示consumeして各値を再導出し、計測owner・workload・採否基準へtraceするか、証拠取得までpolicy値を未確定にする。
- BLOCKER | reliability-design.md「Delivery State Machine」「Exhaustion Handoff」／reliability-requirements.md「Failure Handling と Verification」／business-logic-model.md「Delivery と Crash Recovery」 | 状態名だけが示され、要求されたclaimed後crash、表示後delivery commit前crash、回答受信後fingerprint commit前crash、review effect unknown、summary生成commit失敗の各遷移・再開判定・冪等性key・lock境界が設計されていない。特にterminal transitionと「summaryちょうど1件」の原子性、およびsummary投影失敗時の再実行方法が不明で、at-least-once表示とat-most-once reviewを同時に保証できない。Action: state×event×durable evidenceの完全な遷移表、各commandのpre/postcondition、effect照会owner、transitionとsummaryの同一transactionまたはoutbox契約、fault-injection期待値を定義する。
- BLOCKER | logical-components.md「Component Inventory」「Isolation」／performance-design.md「Budget Adapter」／reliability-design.md「Delivery State Machine」／business-logic-model.md「C4からAtomic Reserveへの写像」 | 新規コンポーネントを既存C2/C4/C7のどこが所有するか、公開interface、呼出方向、transaction boundaryが示されていない。C4がC2 reserve後にC7を呼ぶのか、C2内のTransition CoordinatorがC7 portを呼ぶのか、C7のdelivery/effect factを誰がC2へcommitするのかを決められず、C2↔C7の循環依存と二重dispatchの回避方法も評価不能である。さらにfailure domain、共有resource、各障害のblast radiusはKey Vaultの一文以外にない。Action: owner packageを付したcomponent/dependency図、port methodと結果型、C4→C2→C7→C2 commitの唯一のorchestration owner、lock外side-effect境界、component別failure propagation／degradation表を追加する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T06:26:06Z
- **Iteration:** 2
- **Scope decision:** none

永続index、worktree共通key、crash遷移、C2/C4/C7の所有方向は具体化され、第1回指摘の大半は解消した。しかし、policy値の扱いが必須NFRと正反対で、calibration receiptの有効性判定も変更後実装へ結び付かない。加えて公開contract名が機能設計と一致せず、実装時に別APIまたはadapterを推測する必要が残る。

### Findings

- BLOCKER | performance-design.md「Budget Adapter」「Calibration Benchmark」／performance-requirements.md「Interaction Budgets」「Latency と Work Bounds」／tech-stack-decisions.md「技術選定」 | 必須NFRとtech-stackはprimary 2/4・5/8・8/12、follow-up 1、review 2をhard capとして確定し、#1602 baselineはduration比較だけに使う。一方、設計は同じ値を`candidateEnvelope`へ降格し、receipt取得前は全interactionを`policy-unavailable`で停止する。したがって同じ入力から「capを適用して実行」と「一切実行しない」という相反する実装が成立し、要件追跡と利用可能性が確定しない。さらに通常resolverがreceiptなしでcandidateを返さないため、calibration treatmentがcandidate policyを取得するbootstrap経路も公開contract上にない。Action: 上流NFR／tech-stackをcandidate契約へ改訂するか設計を確定capへ戻し、calibration専用の非promote実行経路、通常runtimeとの隔離、receipt生成前後の状態遷移を一意に定義する。
- BLOCKER | performance-design.md「Budget Adapter」「Calibration Benchmark」 | `BudgetCalibrationReceiptV1`の有効条件はobserved SHAが#1999 baseのancestorであることとworkload完走だけであり、実際に計測したtreatment実装・candidate policy・fixture・provider設定のdigestへreceiptを拘束しない。ancestor判定では、計測後にreserve、renderer/reviewer、policy値、fixtureが変更されたdescendantでも古いreceiptを再利用でき、未計測実装へeffective policyを有効化できる。また`narrowed`時の最終default/hard capを表す必須fieldも示されていない。Action: control SHA、treatment tree/commit、candidate/effective policy version・digest・最終値、fixture、harness/provider config digestをreceipt schemaへ追加し、resolverで完全一致または明示された互換規則を検証して、関連変更時は再calibrationを要求する。
- BLOCKER | logical-components.md「Component Inventory」／reliability-design.md「Delivery State Machine」／business-logic-model.md「C4からAtomic Reserveへの写像」「Question／Follow-up Reserve Flow」「Review Reserve Flow」 | 機能設計の正準callはC2 `reserveInteraction`／`commitInteractionTransition`、C7 `deliverInteraction`／`queryInteractionEffect`だが、論理設計はC2 `reserveOrGet`／`claim`／`commitTransition`、C7 `deliver`／`dispatch`／`queryEffect`という別contractを定義する。alias／adapter関係がなく、`ReserveReceipt | Exhausted | Refusal`と機能設計の`InteractionReserveResult`、summaryId、TerminationReasonV1の対応も不明である。reliabilityが必須とする`expectedState`、`deliveryKey`、`idempotencyKey`およびcapability factの型も公開signatureに現れないため、開発者はどちらのAPIを実装するか決められない。Action: 正準method名とrequest/result unionを1組に統一し、C4→C2およびC4→C7のfield-by-field mapping、terminal summary、effect-query capabilityの型を明記する。
