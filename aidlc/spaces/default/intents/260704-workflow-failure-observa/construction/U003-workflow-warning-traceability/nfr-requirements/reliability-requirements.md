# Reliability Requirements: U003-workflow-warning-traceability

## 上流文脈

この reliability-requirements は、`business-logic-model`、`business-rules`、`requirements` を入力として作成する。

`business-logic-model` は、report mismatch、abandonment、runtime graph contradiction、Requirement evidence map、PR readiness checklist の判断木を定義している。

`business-rules` は、doctor warning の非破壊性、actionable warning、pending question と approval gate の抑制、missing evidence warning を不変条件としている。

`requirements` は、R005、R006、R007、R009、NFR001、NFR003、NFR005、NFR006 を定義している。

`technology-stack` は optional input であり、この Intent では個別成果物として存在しないため、既存の TypeScript と Bun の CLI 前提を上流技術制約として扱う。

## Reliability Targets

| ID | Target | Verification |
|---|---|---|
| REL001 | artifact exists and report missing fixture は run-stage/report mismatch warning を出す。 | mismatch fixture |
| REL002 | in-flight stage abandonment fixture は warning を出す。 | abandonment fixture |
| REL003 | pending question がある stage は abandonment warning を出さない。 | pending question fixture |
| REL004 | open approval gate がある stage は abandonment warning を出さない。 | approval gate fixture |
| REL005 | runtime graph と audit の contradiction fixture は warning を出す。 | contradiction fixture |
| REL006 | doctor warning は workflow state、audit、`runtime-graph.json` を変更しない。 | non-mutating assertion |
| REL007 | Requirement evidence map は R001-R009 を coverage する。 | evidence map fixture |
| REL008 | PR readiness checklist は Issue、Intent、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default を含める。 | checklist fixture |
| REL009 | stdout JSON parse test は warning path で成功する。 | JSON parse fixture |

## SLI and SLO

| SLI | SLO | Measurement window |
|---|---|---|
| warning fixture pass rate | 100% before PR readiness | PR preparation |
| false-positive guard correctness | 100% for pending question and approval gate fixtures | PR preparation |
| non-mutating doctor assertion | 100% for covered warning fixtures | PR preparation |
| Requirement evidence coverage | 100% for R001-R009 rows, including missing evidence warnings | PR preparation |
| stdout JSON parse success | 100% for covered command fixtures | PR preparation |

U003 は外部 service ではないため、availability percentage は定義しない。

代わりに、diagnostic correctness、false-positive control、state non-mutation、traceability coverage を reliability target とする。

## Recovery Requirements

malformed audit row は warning detail にし、doctor を crash させない。

missing stage artifact は missing evidence warning として扱う。

runtime graph が存在しない場合は graph missing warning にし、audit と state の check は継続する。

parity failure がある場合は failure reason と resolution path を checklist に残す。

## Fault Isolation

Doctor warning failure は Error Audit の `ERROR_LOGGED` path を壊さない。

Requirement evidence map の missing evidence は PR readiness を pass にしない。

U003 は U001 と U002 の artifact を read-only に扱い、U001 と U002 の成果物を更新しない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Reliability target は warning 検出、false-positive guard、non-mutating assertion、traceability coverage を直接検証できる。

missing evidence を pass にしないため、PR readiness の偽装を避けられる。
