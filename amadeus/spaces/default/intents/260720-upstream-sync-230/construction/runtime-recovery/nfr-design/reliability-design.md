# Reliability Design — runtime-recovery

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。availability SLO、RTO、RPOを新設せず、recovery correctness、atomicity、idempotent convergenceを設計する。

## DAG recovery matrix

| Scenario | Required behavior |
|---|---|
| cache valid/equal + source valid | ok、healed=false |
| cache missing/empty/malformed/different + source valid | canonical batchesでok、healed=true、write 0 |
| dependency artifact absent | none、既存single-iteration degrade |
| source unreadable/malformed/unknown/self/cyclic | malformed loud error、Unit 0へ降格しない |

同一snapshotは同じcanonical batchesとdiagnosticを返す。per-unit loop、coverage guard、swarmのUnit集合差分を0にする。

## Revision transaction matrix

| Failure boundary | Required behavior |
|---|---|
| evidence不足/recorded reject/autonomous/off | backfill false、既存approval bytes互換 |
| block生成/検証失敗 | audit/state双方を呼出前bytesへ保持 |
| atomic commit失敗 | audit/state双方を呼出前bytesへ保持 |
| commit成功後state write失敗 | 完全batchを再利用しaudit追加0で最終stateへ収束 |
| successful recovery | Revision Count +1、Recovered 3 + normal 2、最終state 1 write |

中間`[R]`/`[?]` stateはdiskへ書かない。不完全batchや単一reject行をidempotency証拠にせず、既決transaction identityと完全5-block batchだけを再利用する。

## Observability・verification

healed diagnosticとRecovered provenanceを既存stderr/auditへ記録する。new event、retention、metrics、trace、alert、retry、別recovery journalを追加しない。multi-shard、reviewer append除外、mid-stage coaching、non-produces、autonomous/off、各failure injectionをfixture化する。

## トレーサビリティ

本設計は`reliability-requirements.md`のREL-U02-01〜08、`security-requirements.md`のintegrity/atomicity、`performance-requirements.md`のsingle commit、`scalability-requirements.md`のdeterministic ordering、`tech-stack-decisions.md`のtransaction/test、`business-logic-model.md`のFailure and verification flowへ対応する。
