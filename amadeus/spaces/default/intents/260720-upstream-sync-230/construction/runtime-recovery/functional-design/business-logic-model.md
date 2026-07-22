# Business Logic Model — runtime-recovery

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 一次同期根拠: upstream `51b515a`（bolt DAG self-heal）と`48306cc`（gate revision backstop）。

## 責務境界

U02はC2 Workflow Runtime Correctnessのrecovery面を所有する。`recoverBoltDag`はunit dependency正本からread-sideのUnit順序を回復し、`recoverGateRevision`はapprove直前に欠落したrevision履歴をauditから回復する。どちらも既存orchestrate/state/audit lockのchoke pointへ統合し、新しいservice、database、queue、UIを追加しない。

| Recovery | Canonical source | Cache / materialized state | Consumers |
|---|---|---|---|
| Bolt DAG | `unit-of-work-dependency.md` | `runtime-graph.json.bolt_dag` | per-unit loop、coverage guard、swarm selection |
| Gate revision | chronologyを証明できるaudit shards | Revision Count、gate/revision audit rows | approve transaction |

## Bolt DAG recovery

### Resolution algorithm

1. runtime graphの`bolt_dag.batches`を型検査する。非空・well-formedならcache candidateとする。
2. unit dependency成果物の有無を確認する。成果物がなければ、genuine zero-unit scopeとして既存single-iteration degradeを返す。
3. 成果物があれば、runtime compilerと同じpure `parseBoltDag`で正本batchを計算する。read failure、fenced units block欠落、不正edge、unknown/self/cycleは`malformed`として理由を保持する。
4. cache欠落・空・malformed、またはcanonical batchesとcache batchesが一致しなければ、canonical batchesを`healed: true`として返す。一致時は`healed: false`。
5. read-sideはruntime graphを書き換えない。healed時は一度のstderr diagnosticを出し、次のruntime compile transitionへpersistent cache修復を委ねる。

canonical comparisonはbatch順と各batch内のcanonical sortを比較する。cacheにUnit欠落・余剰・順序違反がある場合もstaleとし、正本へ置換する。artifactが存在するのにparse不能ならUnitなしへ降格せず、consumerへloud errorを返す。

### Consumer flow

- per-unit Functional Design/NFR/Code Generationは回復済みbatchをflattenしたtopological Unit順で未coverage Unitを選ぶ。
- gate reportは同じUnit集合で全Unit成果物coverageを判定し、cache欠落を「完了」と誤認しない。
- autonomous swarmは同じbatch集合からcurrent runの未converged Unitだけを選ぶ。
- consumerは`orderedUnits`等の第二fallbackを持たず、単一resolution resultをswitchする。

`none`だけがsingle-iterationへdegradeし、`malformed`はerror directive、`ok`は回復済み/既存batchを使う。この3状態によりzero-unitとbroken-unit-listを混同しない。

## Gate revision recovery

### Evidence normalization

全audit shardを読み、各blockへsource shard identity、`Timestamp`、shard-local buffer positionを対応付ける。異なるshardに同じ`Timestamp`が1件でも現れた場合はshard間chronologyを証明できないため、filenameやshard indexをtie-breakに使わずevidence set全体をambiguousとしてfail-closedにする。cross-shard timestamp collisionがなければ`Timestamp`昇順、同一shard・同一Timestampはbuffer position昇順で次の6 eventをinterleaveする。これによりshard filenameやfilesystem列挙順に依存せず、受理した入力だけにtotal orderを与える。

- `STAGE_AWAITING_APPROVAL`
- `STAGE_STARTED`
- `GATE_REJECTED`
- `HUMAN_TURN`
- `ARTIFACT_CREATED`
- `ARTIFACT_UPDATED`

artifact eventはstage definitionのdeclared `produces`に一致するpath suffixだけを対象とし、standard layoutとper-unit `construction/<unit>/<stage>/` layoutの両方を扱う。memory、questions、phase-check、他stage/Unit artifactはrevision証拠にしない。

### Predicate

`recoverGateRevision`は次を全て満たすときだけ`recovered`を返す。

1. 対象stageの最後のorganic `STAGE_AWAITING_APPROVAL`をanchorにする。より新しい`STAGE_STARTED`がある、またはorganic gate-openがない場合は最後の`STAGE_STARTED`をfallback anchorにする。`Recovered: true`のgate-openはanchorにしない。
2. anchor後に対象stageの`GATE_REJECTED`がない。
3. anchor後に`HUMAN_TURN`があり、最初のhuman turnをrevision window pivotにする。
4. pivot後にdeclared produces artifactのcreate/updateがある。
5. stage-start fallback時は、pivot前にもdeclared produces writeがある。これにより成果物前のcoachingをrevisionと誤認しない。

reviewerがgate応答前にprimary artifactへ追記する`## Review`はpivot前なので除外される。codekb stageは異なるpath ownershipを持つため本backstop対象外とし、別機構を捏造しない。ledgerが空、anchor/human/artifact証拠が不足する場合はfalseを返し、証明できないrevisionを追加しない。

### Approve transaction

approveは既存audit lock内でstateとstage contractを読み、artifact/human-presence guard通過後、通常approval emit前にpredicateを評価する。

1. off-switch有効またはautonomous Constructionならbackstopをskipする。
2. predicate falseなら既存approvalをbyte互換で続行する。
3. predicate trueならRevision Countを1増やす最終state bufferと、`GATE_REJECTED`、`STAGE_REVISING`、`STAGE_AWAITING_APPROVAL`、通常`GATE_APPROVED`、`STAGE_COMPLETED`の5 blockをmemory上で全て生成する。recovered 3 blockには`Recovered: true`を付ける。
4. 5 blockの必須field、順序、transaction identityをappend前に全数検証する。1 blockでも生成・検証できなければdiskへ何も書かない。
5. 既存audit lock内で、検証済み5 blockを単一のatomic audit commitとして適用する。既存1行emitの5回呼出や、partial writeを許し得る単純なappend 1回では代替しない。
6. audit commit成功後、最終`[x]` stateだけを一度writeする。中間`[R]` / `[?]`はdiskへ書かない。

batch生成・検証・commit失敗時はaudit/stateの両方を呼出前bytesに保つ。batch成功後にstate writeだけが失敗した場合は、次回approveがtransaction identityと完全な5 blockを検出し、auditを重複追記せず同じ最終stateを一度writeして収束する。不完全batchを成功扱いせず、既存1行rejectの有無だけにidempotencyを依存させない。

## Failure and verification flow

- DAG: cache hit、missing/empty/malformed/mismatch cache、no artifact、unreadable/malformed/cyclic source、全consumer同一Unit集合を対照testにする。
- Revision: bug flow、clean approve、reviewer append、recorded reject、non-produces write、autonomous、off-switch、no anchor、stage-start fallback、mid-stage coaching、multi-shard timestamp orderに加え、cross-shard同一Timestampをfilename順の両方向でfail-closedにする対照testを置く。
- recovery successだけでなく、5 blockの各生成・検証境界、atomic commit失敗、batch成功後state write失敗をfailure injectionし、呼出前audit/state bytes、再実行時の重複0、最終収束、stderr diagnostic回数を検査する。
- downstream U03/U10/U12へ、回復済みUnit集合とRecovered audit provenanceを独立検証可能なcontractとして渡す。

## Review

- **Reviewer**: amadeus-architecture-reviewer-agent
- **Date**: 2026-07-20T11:50:03Z
- **Iteration**: 1
- **Verdict**: NEEDS REVISION
- **Findings**:
  - approve recoveryのatomicityが既決contractを満たしていない。`functional-design-questions.md` 19行目は回復不能・拒否時に部分state/auditを書かないと固定しているが、本書71–74行目はRecovered 3行を順次emitし、途中失敗時に不変とするのはstateだけである。`business-rules.md` BR-U02-23もstate bytesしか保護せず、1行目または2行目のaudit append後に後続emitが失敗した場合、部分的なRecovered履歴が残り、次回predicate/idempotencyも誤作動し得る。Recovered 3行と通常approval rowsを既存lock内で単一のaudit transaction/bufferとして全数commitし、いずれかの生成・append失敗時はauditとstateの双方を呼出前bytesへ保つ契約にすること。少なくとも各emit境界のfailure-injectionでaudit/stateとも差分0を検証し、second runのno-opが部分履歴に依存しないことを固定すること。
- **GoA**: 2（上記1点の是正後はREADY）

## Review — Iteration 2

- **Reviewer**: amadeus-architecture-reviewer-agent
- **Date**: 2026-07-20T11:56:51Z
- **Iteration**: 2
- **Verdict**: READY
- **Findings**: 0。E-USSU02FD1 Aと必須留保が4成果物で一致し、初回findingは閉じた。5 blockの事前生成・全数検証、既存audit lock内の単一atomic commit、生成/検証/commit失敗時のaudit/state呼出前bytes維持、batch成功後state write失敗時のtransaction identityによるaudit重複0・state収束、各failure boundaryのinjection testが明示されている。DAG recoveryの正本/cache/degrade境界と3 consumer共有、gate evidence predicateにも新たなblockerはない。
- **GoA**: 1
