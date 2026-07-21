# Reliability Requirements — unit-iteration-and-scope-preview

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO/RTO/RPOは追加せず、iteration correctness、mutation safety、count consistency、compatibilityを信頼性境界とする。

## Correctness scenarios

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U05-01 | iteration未指定 | 既存stage-majorのdirective/state/human/JSON bytesを不変にする。 |
| REL-U05-02 | valid `unit-major` | Unit外側・既存Unit順・compiled stage順で最初の実行可能stepを返す。 |
| REL-U05-03 | 不正iteration | state/plan/graph/auditの全mutation前に既存typed failureで拒否する。 |
| REL-U05-04 | 同一scope/gridを4 consumerでpreview | stage数・gate数が全consumerで一致する。 |
| REL-U05-05 | JSON preview | 既存field/value/順序を保ち、同値の`summary`だけをadditiveに出す。 |
| REL-U05-06 | human preview | JSONと同じ`ScopeSummary` valueを表示する。 |

## Determinism・observability

- 同一WorkflowState/StageGraphから同一ConstructionStep、同一ScopeName/CompiledGridから同一ScopeSummaryを得る。
- scope、stage eligibility、Unit kind、coverageは既存graph判定を再利用し、第二判定式を作らない。
- 既存audit/CLI出力で追跡し、新audit event、metrics backend、retentionを追加しない。
- invalid分類、count semantics、failure/atomicityの未決意味を推測で具体化しない。

## Verification gate

targeted default/unit-major/invalid/count/projector parity testsと全repository gateを同一最終SHAで通す。`bash tests/run-tests.sh --ci`未実施/stale結果をgreenへ読み替えず、local lcov patch追加行未カバー0と既決spawn/waiver条件を満たす。

## トレーサビリティ

REL-U05-01〜06は`business-rules.md`のBR-U05-01〜15、`business-logic-model.md`のVerification scenarios、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。
