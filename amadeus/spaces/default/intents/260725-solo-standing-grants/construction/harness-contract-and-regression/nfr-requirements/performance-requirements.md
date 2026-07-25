# Performance Requirements: harness-contract-and-regression

## Inputs and Scope

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`に基づく。対象はcanonical generation、cross-harness contract verification、test pipelineであり、個別harnessのUI latencyは含まない。

## Targets

| ID | Scenario | Target | Verification |
|---|---|---|---|
| U3-PERF-01 | distribution generation | canonical generator invocation 1、manual generated writes 0 | command/write spy |
| U3-PERF-02 | harness semantic verification | manifest harness数Hに対してfixture execution `= H`、欠落/重複0 | generated manifest count |
| U3-PERF-03 | targeted fallback flow | harnessごとにstage body/reviewer/sensor/learnings再実行0 | invocation golden |
| U3-PERF-04 | verification pipeline | generate後にfocused/type/full/driftを各1回以上、同一treeで実行 | command evidence + HEAD/worktree fingerprint |

## Resource Constraints

新しいpackage manager、container、remote build service、parallel test daemonを追加しない。既存Bun scriptsとgeneratorを使用し、同じsemantic fixtureをharnessごとにコピーせずtable-drivenに実行する。

## Traceability and Ownership

| Target | Upstream | Harness rules | Blocking suite |
|---|---|---|---|
| U3-PERF-01–02 | FR-24–25, NFR-08 | HR-01–04b, HR-19 | generator/drift suite |
| U3-PERF-03 | FR-16, FR-23 | HR-02, HR-17, HR-21 | cross-harness fallback suite |
| U3-PERF-04 | NFR-05, NFR-07–08 | HR-18–22 | final verification evidence |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:14:34Z
- **Iteration:** 1
- **Scope decision:** none

manifest駆動投影と回帰・収束は良好だが、target UUID identity、host session identity、reservation state machineが未確定。

### Findings

- BLOCKER: opaque UUIDv7の既存identity model、発行・registry・status・衝突/再利用契約を定義すること。
- BLOCKER: 6 harnessごとのauthoritative session payload field、欠落時fail-closed、normalization、restart stabilityを定義すること。
- BLOCKER: hook authenticityの既存trust boundary、reservation API protection、direct invocation脅威境界、entrypoint fixtureを明文化すること。
- MAJOR: armed/minted/consumedのowner/fields/transitions/replay/crash/stale cleanupを状態遷移表にすること。
- MAJOR: owner HUMAN_TURN exactly 1、reservation consume exactly 1、replay/別session/別target delta 0を単一blocking E2Eにすること。
- CONFIRMED: manifest、policy/team/human回帰、生成後同一tree収束、traceabilityは妥当。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:19:38Z
- **Iteration:** 2
- **Scope decision:** none

前回指摘はすべて解消された。既存intent UUID、harness別session capability、現行trusted-hook境界、reservation one-shot/recovery、全harness exactly-once E2Eが測定可能な契約になっている。Kiro IDE/OpenCodeの不足も推測で埋めず、feature acceptanceのblocking prerequisiteとして扱っている。

### Findings

- RESOLVED: existing intents.json UUIDv7 exact in-flight identity。
- RESOLVED: harness session capability matrixと欠落時fail-closed。
- RESOLVED: current trusted-hook boundaryを維持しpublic mint APIを追加しない。
- RESOLVED: reservation one-shot state machineとcrash/replay recovery。
- RESOLVED: single cross-harness exactly-once E2E。
- CONFIRMED: manifest、team/policy、verification convergenceとtraceability。
