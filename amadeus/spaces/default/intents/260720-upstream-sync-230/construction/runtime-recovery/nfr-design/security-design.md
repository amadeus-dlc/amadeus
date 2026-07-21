# Security Design — runtime-recovery

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。dependency artifact、runtime cache、audit shards、stateをuntrusted persisted inputとして検証する。

## Trust boundaries

| Boundary | Accepted input | Control | Rejected behavior |
|---|---|---|---|
| dependency artifact→resolver | existing readable canonical artifact | parse/edge/cycle validation | broken sourceのzero-unit降格 |
| runtime cache→consumers | well-formed cache equal to canonical batches | source優先comparison | cache-only fallback、consumer別Unit集合 |
| audit shards→revision predicate | related 6 events + declared-produces paths | Timestamp+buffer position normalization | filename順、memory/questions/他Unit証拠 |
| human evidence→backfill | organic anchor + pivot + produces write + reject absence | closed predicate、autonomous/off skip | human不在backfill、recovered anchor再利用 |
| approve batch→disk | fully generated/validated 5 blocks | existing lock内single atomic commit | partial append、中間state write |

## Integrity・scope controls

artifact absentだけをgenuine zero-unitとして`none`にする。artifactが存在する場合のread/parse/edge/cycle failureは`malformed`としてloudに返し、Unit 0やsingle iterationへ降格しない。read-side healはdiagnosticだけでpersistent writeを行わない。

revision evidenceは対象stageとdeclared producesへ閉じる。recorded reject、証拠不足、autonomous Construction、off-switchではbackfill falseとし、既存approval bytes互換を維持する。codekb特殊layoutや新consumerへscopeを広げない。

## Atomicity・idempotency controls

5 block全数をcommit前に検証し、failure時はaudit/state双方を不変にする。atomic audit commit後のstate failureだけを完全batch検出で回復し、不完全batchを成功扱いしない。既決transaction identityを再利用し、新event type、別transaction log、permission、retentionを追加しない。

## Supply-chain boundary

authored sourceを正本としてgeneratorで6 harnessへ投影し、distを手編集しない。credential、network、database、service、UI、runtime dependencyを追加しない。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U02-01〜05、`performance-requirements.md`の有界parse/commit、`scalability-requirements.md`の同一Unit集合、`reliability-requirements.md`のfailure containment、`tech-stack-decisions.md`の既存atomicity、`business-logic-model.md`のEvidence/Approve transactionへ対応する。
