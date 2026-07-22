# Reliability Requirements — runtime-recovery

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、recovery correctness、atomicity、idempotent convergenceを信頼性境界とする。

## DAG recovery

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U02-01 | cache valid/equal | ok、healed=false。 |
| REL-U02-02 | cache missing/empty/malformed/different + source valid | canonical batchesでok、healed=true、read-side mutation 0。 |
| REL-U02-03 | source absent | none、既存single-iteration degrade。 |
| REL-U02-04 | source unreadable/malformed/cyclic | malformed loud error、Unit 0へ降格しない。 |

同一inputの再評価は同じcanonical batchesを返し、healed diagnosticは原因、batch数、runtime compile修復導線を示す。

## Revision transaction

| ID | Failure boundary | Required behavior |
|---|---|---|
| REL-U02-05 | 5 block生成/検証/commit失敗 | audit/state双方を呼出前bytesへ保つ。 |
| REL-U02-06 | atomic audit commit成功後のstate write失敗 | 次回完全batchを再利用し、audit追加0で最終stateへ収束。 |
| REL-U02-07 | recorded reject/evidence不足 | backfill false、既存approval bytes互換。 |
| REL-U02-08 | successful recovery | Revision Countを1増やし、Recovered 3 + normal 2を順序固定で記録し、最終[x]だけwrite。 |

## Observability・verification

healed stderrとRecovered provenanceを既存面へ記録し、新event、retention、metrics/trace backendを追加しない。multi-shard chronology、reviewer append除外、mid-stage coaching、non-produces、autonomous/off-switch、各failure injectionをfixture化する。

targeted testsと`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。Issue #1313未解消時はfull-CI-required gateで停止する。push前local lcovでpatch追加行未カバー0を実測し、spawn blind spotは実測後のin-process seam、waiverは既決証拠条件を満たす残余行だけとする。

## トレーサビリティ

REL-U02-01〜08は`business-rules.md`のBR-U02-01〜24、`business-logic-model.md`のFailure and verification flow、`requirements.md`のNFR-1〜6、`technology-stack.md`のaudit/test境界に対応する。
