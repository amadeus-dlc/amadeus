# Reliability Requirements — swarm-and-next-stage

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、selection correctness、projector consistency、compatibilityを信頼性境界とする。

## Correctness scenarios

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U03-01 | 先頭batch全converged | 次の未完了batchを選択。 |
| REL-U03-02 | 先頭batchに未完了あり | 先頭batchの未完了unitだけ選択。 |
| REL-U03-03 | check成功後merge failure | 非convergedとして先頭batchへ残留。 |
| REL-U03-04 | current直後がSKIP | その後の最初のin-scope stageを返す。 |
| REL-U03-05 | 最終in-scope stage | `null`を返し、SKIP/placeholder slugを返さない。 |
| REL-U03-06 | FR-0 EQUIVALENT | production observable bytes/result差分0。 |

## Determinism・observability

- 同一BoltDag/currentRunから同一BatchSelection、同一CompiledGrid/currentから同一StageSlug|nullを得る。
- gate next_stageと次engine directiveを一致させる。
- targeted verdict evidenceは残すが、新audit event、retention、metrics/tracing backendを追加しない。
- no-selection/malformed-gridの未決意味を推測で具体化しない。

## Verification gate

targeted current-run/merge/SKIP/terminal/EQUIVALENT testsと全repository gateを同一最終SHAで通す。`bash tests/run-tests.sh --ci`未実施/stale結果をgreenへ読み替えず、local lcov patch未カバー0と既決spawn/waiver条件を満たす。

## トレーサビリティ

REL-U03-01〜06は`business-rules.md`のBR-U03-01〜16、`business-logic-model.md`のVerification scenarios、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
