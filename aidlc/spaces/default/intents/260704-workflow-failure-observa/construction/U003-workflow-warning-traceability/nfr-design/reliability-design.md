# Reliability Design: U003-workflow-warning-traceability

## 上流文脈

この reliability-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、warning fixture、evidence map、PR readiness checklist の処理予算を定義している。

`security-requirements` は、doctor warning の non-mutating assertion と evidence ref を定義している。

`scalability-requirements` は、missing evidence warning と fixed set aggregation を定義している。

`reliability-requirements` は、REL001 から REL009 までの warning、false-positive guard、traceability coverage を定義している。

`tech-stack-decisions` は、pure helper、read-only snapshot、Markdown-friendly checklist を使う判断を定義している。

`business-logic-model` は、report mismatch、abandonment、contradiction、Requirement evidence map、PR readiness checklist の判断木を定義している。

## Reliability Architecture

| Failure mode | Design | Target |
|---|---|---|
| artifact exists and report missing | run-stage/report mismatch warning を返す。 | REL001 |
| in-flight stage abandonment | pending question と approval gate がない場合だけ warning を返す。 | REL002 |
| pending question | abandonment warning を抑制する。 | REL003 |
| open approval gate | abandonment warning を抑制する。 | REL004 |
| graph and audit contradiction | contradiction warning を返す。 | REL005 |
| doctor warning | state、audit、`runtime-graph.json` を変更しない。 | REL006 |
| Requirement evidence map | R001-R009 を coverage し、missing は warning にする。 | REL007 |
| PR readiness checklist | Issue、Intent、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default を含める。 | REL008 |
| stdout JSON | warning path で diagnostic text を stdout に出さない。 | REL009 |

## False-Positive Control

Abandonment rule は pending question evidence を先に確認する。

Abandonment rule は open approval gate evidence を先に確認する。

Warning は hard error ではなく actionable warning とする。

Doctor は state transition を実行しない。

## Recovery Design

Malformed audit row は warning detail にし、doctor を crash させない。

Missing stage artifact は missing evidence warning として扱う。

`runtime-graph.json` が存在しない場合は graph missing warning にし、audit と state の check は継続する。

Parity failure がある場合は failure reason と resolution path を checklist に残す。

## SLO Design

warning fixture pass rate は PR readiness までに 100% にする。

false-positive guard correctness は pending question と approval gate fixtures で 100% にする。

non-mutating doctor assertion は covered warning fixtures で 100% にする。

Requirement evidence coverage は R001-R009 rows で 100% にする。

stdout JSON parse success は covered command fixtures で 100% にする。

## Verification Design

mismatch fixture で REL001 を確認する。

abandonment fixture で REL002 を確認する。

pending question fixture で REL003 を確認する。

approval gate fixture で REL004 を確認する。

contradiction fixture で REL005 を確認する。

non-mutating assertion で REL006 を確認する。

evidence map fixture で REL007 を確認する。

checklist fixture で REL008 を確認する。

JSON parse fixture で REL009 を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Reliability design は warning 検出、false-positive guard、non-mutating assertion、traceability coverage を直接検証できる。

missing evidence を pass にしないため、PR readiness の偽装を避けられる。
