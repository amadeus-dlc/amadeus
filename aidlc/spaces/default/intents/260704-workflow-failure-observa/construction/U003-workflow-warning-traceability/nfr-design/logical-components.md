# Logical Components: U003-workflow-warning-traceability

## 上流文脈

この logical-components は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、snapshot、warning evaluation、Requirement evidence map、PR readiness checklist の予算を定義している。

`security-requirements` は、read-only evidence、scope-out item、state 非変更を定義している。

`scalability-requirements` は、U001 と U002 evidence の read-only 参照と fixed set aggregation を定義している。

`reliability-requirements` は、warning fixture、false-positive guard、non-mutating assertion を定義している。

`tech-stack-decisions` は、TypeScript、pure helper、read-only snapshot、Markdown-friendly checklist を採用する判断を定義している。

`business-logic-model` は、Conductor Warning、Verification Traceability、Doctor Composition の処理順序を定義している。

## Component Inventory

| Component | Responsibility | Failure domain |
|---|---|---|
| Workflow Evidence Snapshot | state、audit、実行時 graph、artifact path を read-only に集約する。 | evidence read |
| Conductor Warning Evaluator | report mismatch、abandonment、contradiction を warning にする。 | warning evaluation |
| False-Positive Guard | pending question と approval gate を abandonment から除外する。 | guard logic |
| Requirement Evidence Mapper | R001-R009 を evidence item または missing evidence warning にする。 | traceability mapping |
| PR Readiness Checklist Builder | Issue、Requirement、verification、parity、scope-out を checklist にする。 | readiness aggregation |
| Doctor Warning Renderer | DiagnosticFinding を standard output と verbose detail に分ける。 | human-readable rendering |

## Component Boundaries

Workflow Evidence Snapshot は state、audit、`runtime-graph.json` を書き換えない。

Conductor Warning Evaluator は state transition を実行しない。

False-Positive Guard は pending question と approval gate を先に評価する。

Requirement Evidence Mapper は missing evidence を pass にしない。

PR Readiness Checklist Builder は CI を実行しない。

Doctor Warning Renderer は JSON stdout command では呼ばない。

## Interaction Model

Doctor Diagnostic Service は Workflow Evidence Snapshot を作る。

Conductor Warning Evaluator は snapshot から WarningCandidate を作る。

False-Positive Guard は abandonment candidate を抑制するか warning にするかを決める。

Doctor Warning Renderer は DiagnosticFinding を標準表示と verbose detail に分ける。

Verification Traceability Service は U001 と U002 の evidence refs を read-only に読む。

PR Readiness Checklist Builder は evidence map、Issue refs、parity state、scope-out item を checklist にする。

## Blast Radius

| Failure | Containment |
|---|---|
| malformed audit row | warning detail に限定する。 |
| missing stage artifact | missing evidence warning にする。 |
| missing `runtime-graph.json` | graph missing warning にし、audit と state の check は継続する。 |
| parity failure | reason と resolution path を checklist に残す。 |
| false-positive risk | pending question と approval gate evidence で抑制する。 |

## Infrastructure Bridge

Infrastructure Design へ渡す component は、cloud resource ではなく CLI 内 logical component である。

新しい AWS service、database、message broker、container orchestration は必要ない。

OpenTelemetry collector、dashboard、cloud telemetry export infrastructure は U003 の外に置く。

`skills/` direct edits と unauthorized `.coderabbit.yml` changes は scope-out として記録する。

## Verification Mapping

| Component | Verification |
|---|---|
| Workflow Evidence Snapshot | before and after state snapshot assertion |
| Conductor Warning Evaluator | mismatch、abandonment、contradiction fixture |
| False-Positive Guard | pending question and approval gate fixture |
| Requirement Evidence Mapper | R001-R009 evidence map fixture |
| PR Readiness Checklist Builder | Issue #431、#432、#433、#435 checklist fixture |
| Doctor Warning Renderer | standard output snapshot and JSON parse assertion |

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Logical components は warning detection、false-positive guard、traceability aggregation を分けている。

state mutation を行わず、missing evidence を pass にしない設計になっている。
