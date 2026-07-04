# Domain Entities: U003-workflow-warning-traceability

## 上流文脈

この domain-entities は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U003 の Domain Model は、workflow warning、Requirement evidence、PR readiness traceability を扱う。

`components` は Conductor Warning、Verification Traceability、Doctor Composition を定義している。

`component-methods` は `detectReportMismatch`、`detectAbandonedStage`、`detectRuntimeGraphContradiction`、`mapRequirementsToEvidence`、`buildPrReadinessChecklist`、`recordParityDecision` を定義している。

`services` は Doctor Diagnostic Service と Verification Traceability Service を U003 の主要境界としている。

## Entity Catalog

| Entity | Kind | Responsibility |
|---|---|---|
| `WorkflowEvidenceSnapshot` | Entity | state、audit、実行時 graph、artifact refs を同時点の読み取り結果として持つ。 |
| `StageTransitionEvidence` | Value Object | stage started、awaiting approval、completed、revising の audit evidence を表す。 |
| `WarningCandidate` | Entity | mismatch、abandonment、contradiction の warning 候補を表す。 |
| `WorkflowWarningFinding` | Value Object | doctor に表示する warning label、evidence refs、next action を表す。 |
| `RequirementEvidenceItem` | Value Object | Requirement ID、Issue、Unit、Bolt、test result、validator、parity、stdout JSON、OpenTelemetry evidence を表す。 |
| `RequirementEvidenceMap` | Entity | R001-R009 と evidence item の対応を保持する。 |
| `ParityDecision` | Entity | locked file diff、adapter/wrapper 検討、resolution path、approval ref を保持する。 |
| `PrReadinessChecklist` | Entity | PR 説明または Intent artifact に載せる readiness items を保持する。 |
| `ScopeBoundaryItem` | Value Object | collector、dashboard、cloud infrastructure、direct `skills/` edits などの対象外項目を表す。 |

## Relationships

`WorkflowEvidenceSnapshot` は 0 個以上の `WarningCandidate` を生成する。

`WarningCandidate` は `WorkflowWarningFinding` に変換される。

`RequirementEvidenceItem` は `RequirementEvidenceMap` に集約される。

`ParityDecision` は `RequirementEvidenceMap` と `PrReadinessChecklist` に参照される。

`ScopeBoundaryItem` は `PrReadinessChecklist` に含まれるが、required verification item にはならない。

U001 と U002 の evidence refs は `RequirementEvidenceItem` の source になる。

## Lifecycle States

| Entity | States |
|---|---|
| `WorkflowEvidenceSnapshot` | captured、stale、invalid |
| `WarningCandidate` | detected、suppressed、reported |
| `WorkflowWarningFinding` | informational、warning、resolved-by-human |
| `RequirementEvidenceItem` | present、missing、failed、not-applicable |
| `RequirementEvidenceMap` | partial、complete、blocked-by-missing-evidence |
| `ParityDecision` | not-needed、adapter-path、upstream-path、human-approved-exception、unresolved |
| `PrReadinessChecklist` | draft、ready、blocked |

## Aggregate Candidates

`WorkflowWarningAggregate` は `WorkflowEvidenceSnapshot`、`WarningCandidate`、`WorkflowWarningFinding` をまとめる。

この Aggregate の不変条件は、診断が state を変更しないことである。

`RequirementTraceAggregate` は `RequirementEvidenceItem` と `RequirementEvidenceMap` をまとめる。

この Aggregate の不変条件は、missing evidence を pass として扱わないことである。

`PrReadinessAggregate` は `PrReadinessChecklist`、`ParityDecision`、`ScopeBoundaryItem` をまとめる。

この Aggregate の不変条件は、scope-out item と required verification item を混同しないことである。

## Interaction Patterns

Doctor Diagnostic Service は `WorkflowEvidenceSnapshot` を read-only に作る。

Conductor Warning component は `WarningCandidate` を作る。

Doctor Composition は `WorkflowWarningFinding` を標準表示に載せる。

Verification Traceability Service は `RequirementEvidenceMap` と `PrReadinessChecklist` を作る。

PR 作成時は `PrReadinessChecklist` を PR 説明へ転記できる。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Entity は warning 診断、Requirement trace、PR readiness を分けている。

state mutation が必要な Entity はなく、doctor の read-only 境界を維持している。
