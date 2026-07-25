# Performance Requirements — mirror-state-provenance

> 上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Latency and I/O Budgets

| ID | Load | Target | Verification |
|---|---|---|---|
| PERF-SP-01 | 2 MiB state document、1,000 receipts、1,000 warnings | parse p95 ≤ 50 ms | in-process Bun benchmark |
| PERF-SP-02 | 同fixtureのstate-changing transition | lock取得時間を除くread→parse→reduce→temp write→flush→rename p95 ≤ 100 ms | temporary filesystem benchmark |
| PERF-SP-03 | idempotent同値再入 | temp write 0、flush 0、rename 0、revision増加0 | filesystem port call count |
| PERF-SP-04 | CAS conflict／invalid input | temp file作成0、remote call 0 | failure fixture |
| PERF-SP-05 | marker render／parse | 10,000 operationsのp95 ≤ 1 ms／operation | in-process benchmark |
| PERF-SP-06 | audit append＋outbox clearを含むend-to-end transition | p95 ≤ 150 ms、同call rename最大2回 | temporary filesystem＋audit fixture |

## Benchmark Protocol

GitHub Actions `ubuntu-24.04`、`X64`、同一runner image version、repository pin済みBun、local temporary filesystemでwarm-up 100回後に1,000回測定する。独立3 jobの各p95をnearest-rankで算出し、その中央値をthresholdと比較する。3値の最大／最小比が2.0を超える、runner imageが不一致、欠損／非数値の場合はpassへ丸めずinconclusive failureとする。fixtureは2 MiBにpaddingした非Mirror section、1,000 receipts、1,000 warnings、100 challengesを含む。

## Resource Constraints

- 1 business transitionにつきstate document readはlock内exactly 1回、business commit renameは1回、audit成功後のoutbox clearを含む同call renameは最大2回。既存outbox drain callは新transitionを続行せずrename最大1回。
- Mirror block外をparse／serializeせずsubstringとして保持する。
- State Store内部でCAS retry loop、background cleanup、pollingを行わない。
- marker codecは1 payloadだけをencode／decodeし、Issue本文全体の意味解析を行わない。

## Acceptance

1. PERF-SP-01〜06を固定fixtureで満たす。
2. no-op／conflict／invalidでwrite系callが0件になる。
3. benchmark目的でproductionへcacheやtest modeを追加しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T07:03:31Z
- **Iteration:** 1
- **Scope decision:** none

性能・安全性・容量・信頼性・技術選定は概ね定量化されているが、耐久性の保証、有限容量枯渇後の回復、state更新とauditの整合性に未閉包の契約がある。

### Findings

- Blocker — repair challengeは100件上限で、consumedを含めて保持し、自動削除もしない。一方、SP-R08は期限切れ・消費済みchallengeに対して新challengeを発行することを要求する。100件到達後は新challengeを発行できず、repair機能が恒久停止する。
- Blocker — REL-SP-04はflush／rename失敗時の元file保持を、Recovery Objectivesは成功を返したatomic renameまでRPO 0を要求するが、設計はtemp fileのflushとrenameまでしか定義していない。rename後のdirectory fsyncがなければ電源断時のrename永続性を保証できず、追加時は失敗後に元file不変と両立しない。
- Major — state commitとARTIFACT_UPDATED audit記録の原子性・失敗順序が未定義。state rename成功後にaudit appendが失敗した場合、再入はunchangedとなり監査証跡を回復できない。
- Major — warning上限1,000件と履歴を自動削除しない組合せにより、新しいfailure evidenceを永続化できなくなる。
- Major — performance acceptanceを変動の大きいGitHub Actions ubuntu-latestの絶対時間だけで判定しており再現条件が不足する。
- Major — duplicate-key-aware tokenizerに最大nesting depth、最大string／field長、反復型parseなどの計算資源境界がない。

## Review Iteration 1 Remediation

- consumed／expiry後24時間経過challengeの監査付きpruneとactive 100件時のcapacity warningを定義した。
- file fsync→rename→directory fsyncをdurability sequenceとし、rename後fsync失敗を`durability-unknown`へ分離した。
- transaction ID／digest付きauditをstateより先にidempotent commitし、state失敗後の再入で収束する規則を追加した。
- warningを999通常slot＋1 capacity予約slotとし、同一warning coalesceとremote開始前capacity guardを追加した。
- benchmark runner class、3 job中央値、分散上限、inconclusive failureを固定した。
- tokenizerへdepth 16、string 256 KiB、key 128 bytes、aggregate 2 MiBの上限を追加した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-24T07:07:44Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1のbenchmark再現性、tokenizer境界、directory fsync、warning予約枠は解消済みだが、audit先行commitの回復契約とrepair challenge容量に未解決が残る。

### Findings

- Critical — audit先行commit後にstate failureすると、nextRevisionだけのtransaction IDが別transitionと衝突して全mutationを停止させる。state未更新のARTIFACT_UPDATEDも意味不正確である。
- Major — consumedとexpiry後24時間未満challengeも100件枠へ数えるため、短時間に100件消費するとactive 0件でも最大24時間新challengeを発行できない。
- Major — ARTIFACT_UPDATEDはstate rename／directory fsyncより前に永続化され、後続失敗時もupdate成功を表すためstate commit pointと一致しない。

## Review Iteration 2 Remediation

- audit-first方式を撤回し、business stateと完全な`ARTIFACT_UPDATED` outboxを同時commitするtransactional outboxへ変更した。
- directory fsync後だけauditへappendし、失敗時は`committed-audit-pending`として次operationより先にdrainする規則を追加した。
- transaction IDへevent key、operation ID、transition kind、revision、digestを含め、outbox未drain中の別transitionを禁止した。
- challenge mapをactive-onlyへ変更し、consumedはrepair commit時、expiredは次回発行前に即時removeしてproofをauditへ移すようにした。
