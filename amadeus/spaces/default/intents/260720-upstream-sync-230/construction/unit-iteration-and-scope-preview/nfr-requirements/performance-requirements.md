# Performance Requirements — unit-iteration-and-scope-preview

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。invocation-local pure decisionであり、service latency/throughput SLOは追加しない。

## 有界決定要件

| ID | 要件 | 合格条件 |
|---|---|---|
| PERF-U05-01 | `nextConstructionStep`は既存Unit列を外側、compiled stage列を内側として、最初の未完了かつ実行可能な組で停止する。 | 独自sort、名前順tie-break、別stage list 0。 |
| PERF-U05-02 | iteration未指定時は既存stage-major resolverへ委譲する。 | directive、state、human/JSONのbaseline bytes差分0。 |
| PERF-U05-03 | `previewScopeCost`は一つの`CompiledGrid`のeffective in-scope集合からstage数とgate数を一度導出する。 | 4 consumerの再集計0、count差分0。 |
| PERF-U05-04 | 正準2 seamはstate、plan、graph、audit、workspaceへ書き込まない。 | pure fixtureでmutation 0。 |

新parallelism、cache、retry、scan time thresholdを追加しない。state更新とprojector I/Oは既存ownerへ残す。

## Verification gate

targeted iteration-order/default-byte/invalid-input/scope-count testsと、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施またはstaleな結果をgreenへ読み替えない。push前local lcov patch追加行未カバー0、spawn seam、既決waiver証拠条件を満たす。

## トレーサビリティ

PERF-U05-01〜04は`business-rules.md`のBR-U05-01〜15、`business-logic-model.md`の2 workflow、`requirements.md`のNFR-1〜8、`technology-stack.md`に対応する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-20T23:41:58Z
- **Iteration:** 1
- **Findings:** なし（Critical 0 / Major 0 / Minor 0）。
- **Confirmed — public seam / ownership:** `nextConstructionStep(state: WorkflowState, graph: StageGraph): ConstructionStep`と`previewScopeCost(scope: ScopeName, grid: CompiledGrid): ScopeSummary`の正準2 public seamだけを維持し、pure decisionと既存C2 state/graph/CLI/lock/audit境界へ閉じている。
- **Confirmed — iteration:** `unit-major`は明示state verbによるopt-inで、既存Unit列を外側、compiled stage列を内側に走査する。独自sort、名前順tie-break、別stage list、第二resolverはない。未指定時は既存stage-majorへ委譲し、directive/state/human/JSONのbaseline bytes差分0を要求する。
- **Confirmed — invalid input / mutation safety:** 不正iterationは既存validation/typed failureでstate、plan、graph、auditの最初のmutation前に拒否する。新しいinvalid分類、error/exit policy、failure、atomicity、mutation ownershipを追加していない。
- **Confirmed — scope preview:** stage数とgate数は同一`CompiledGrid`のeffective in-scope集合から一度だけ導出し、scope confirmation、intent birth、scope-change、validate-gridの4 consumerが共通`ScopeSummary`を投影する。human表示は同値で、JSONは既存field/value/順序を保つadditiveな`summary`だけである。
- **Confirmed — NFR / stack:** 未根拠なlatency/throughput/availability SLO、parallelism、cache、consumer別countを追加せず、Bun 1.3.13、TypeScript ESM、既存C2 stackと`bun:test`を再利用する。新dependency、service、database、network、UI、public APIはない。
- **Confirmed — verification / coverage:** targeted iteration-order、default-byte、invalid-input、scope-count、4 projector parity testsに加え、NFR-5のtypecheck/lint/dist/promote/full CIを同一最終SHAで全てexit 0とする。NFR-6のpush前local lcov patch追加行未カバー0、spawn seam、既決waiver証拠条件を維持する。
- **Sensors:** applicable sensors 11/11 PASS。linter / type-checkはMarkdown-onlyのため非該当。
- **Scope decision:** 候補なし（追加readなし）。
