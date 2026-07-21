# Reliability Requirements — stage-contract

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、schema determinism、compatibility、approval correctnessを信頼性境界とする。

## Correctness invariants

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U01-01 | 追加field absent | propertyを生成せず既存bytes不変。 |
| REL-U01-02 | block/inline when | 同じtyped object、追加trim/sort/dedupeなし。 |
| REL-U01-03 | filter後required 0 | 当該Unitでvacuously covered。 |
| REL-U01-04 | stage元required 0 | 実行証拠なしとしてvacuous扱いしない。 |
| REL-U01-05 | runtime graph欠落/malformed/kindなし | full matrixへ保守的under-prune。 |
| REL-U01-06 | applicable requiredあり | 全適用file実在までuncovered。 |

## Failure・observability

invalid inputは全mutation前に拒否し、field/Unit/実値/許容値を既存errorへ示す。new audit event、retention、metrics backendを追加しない。optional artifactはdirective候補に含めてもcoverage requirementにしない。

## Verification gate

schema/round-trip/golden/pruning/approval testsと全repository gateを同一最終SHAで通す。`bash tests/run-tests.sh --ci`未実施・stale結果をgreenへ読み替えず、Issue #1313未解消ならfull-CI-required gateで停止する。local lcov patch未カバー0、spawn seam、既決waiver条件を満たす。

## トレーサビリティ

REL-U01-01〜06は`business-rules.md`のBR-U01-04〜15、`business-logic-model.md`のCoverage/Verification、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
