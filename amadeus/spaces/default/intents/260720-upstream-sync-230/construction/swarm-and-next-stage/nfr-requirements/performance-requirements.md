# Performance Requirements — swarm-and-next-stage

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。invocation-local pure decisionであり、service latency/throughput SLOは追加しない。

## 有界選択要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U03-01 | `selectNextSwarmBatch`は回復済みBoltDagを記録順に評価し、最初の未完了batchで停止する。 | 後続batch先取り0。 |
| PERF-U03-02 | 選択batchからcurrentRunで未完了のunitだけを返す。 | batch跨ぎdispatch 0。 |
| PERF-U03-03 | `resolveNextInScopeStage`はcurrent後方をcompiled orderで評価し、最初のin-scope stageを返す。 | 別sort/tie-break 0。 |
| PERF-U03-04 | 両seamはstate/audit/workspace I/Oを行わない。 | pure fixtureでmutation 0。 |

新parallelism、retry、cache、scan time thresholdを追加しない。worker dispatch/merge実行は既存ownerへ残す。

## Verification gate

targeted multi-batch/merge-failure/SKIP/terminal testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。push前local lcov patch未カバー0、spawn seam、既決waiver証拠条件を満たす。

## トレーサビリティ

PERF-U03-01〜04は`business-rules.md`のBR-U03-01〜16、`business-logic-model.md`の2 workflow、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- Reviewer identity: `amadeus-architecture-reviewer-agent`
- Reviewed at (UTC): `2026-07-20T23:38:09Z`
- Verdict: **READY**
- Scope decision: **候補なし**

### Findings

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| MAJOR | 0 |
| MINOR | 0 |

### Confirmed checks

- public seamは`selectNextSwarmBatch(graph: BoltDag, currentRun: RunEvidence): BatchSelection`と`resolveNextInScopeStage(current: StageSlug, grid: CompiledGrid): StageSlug | null`の正準2関数だけで、signature/API拡張はない。
- `selectNextSwarmBatch`はU02が回復した`BoltDag`を記録順に読み、`currentRun`のconverged evidenceだけを完了根拠にする。check成功後のmerge failureは非convergedとして先頭未完了batchへ残り、後続batchを先取りしない。
- 選択結果は最初の未完了batch内の未完了unitだけであり、batch内・batch間の独自tie-break、cross-batch dispatch、no-selection shapeの新規具体化はない。
- `resolveNextInScopeStage`は`CompiledGrid`のcurrent後方をcompiled orderで評価し、effective SKIPを除外して最初の実在in-scope stageだけを返す。終端は`null`であり、SKIP名・架空slug・placeholderを出力しない。
- gateの`next_stage` projectorとengine `next`は同じresolver結果を消費する。malformed grid/unknown stageの新failure policyは作らず、既存C1/C2 validation境界へ留保している。
- FR-0 characterizationでEQUIVALENTならproduction observable bytes/resultの差分を0にし、targeted regression evidenceだけを残す。U03はitems 3/10の証拠に限定され、全体ledger集約はU12だけが担う。
- NFR-5のtargeted testsと同一最終SHAのfull CI、NFR-6のpatch追加行未カバー0・spawn seam・既決waiver条件が明記され、未実施・stale結果をgreenへ読み替えない。
- 新no-selection、failure、ordering、malformed-grid、tie-break、terminal value、ownership、SLO、dependency、service、database、network、UI、audit eventの判断は混入していない。

### Sensor results

- Applicable sensor results: **11/11 PASS**。
- `required-sections`、`upstream-coverage`、`answer-evidence`: **PASS**。
- `linter`、`type-check`: Markdown成果物のため非該当。

### Summary

5成果物はE-OC1承認範囲を測定可能なNFRと対照fixtureへ機械導出しており、追加のarchitecture judgmentなしで実装できる。
