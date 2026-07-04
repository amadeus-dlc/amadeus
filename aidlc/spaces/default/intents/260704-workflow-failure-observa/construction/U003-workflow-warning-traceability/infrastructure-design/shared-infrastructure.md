# Shared Infrastructure: U003-workflow-warning-traceability

## 上流文脈

この shared-infrastructure は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、warning evaluation と traceability aggregation の shared data structure を定義している。

`security-design` は、read-only evidence、scope-out item、state 非変更を shared boundary として定義している。

`scalability-design` は、U001 と U002 evidence を read-only adapter で読む関係を定義している。

`reliability-design` は、false-positive guard、missing evidence warning、non-mutating doctor を定義している。

`logical-components` は、Workflow Evidence Snapshot、Conductor Warning Evaluator、False-Positive Guard、Requirement Evidence Mapper、PR Readiness Checklist Builder、Doctor Warning Renderer を定義している。

`components` は、Error Audit、Subagent Status、Conductor Warning、Verification Traceability、Doctor Composition の依存方向を定義している。

`services` は、Evidence Recording Service、Doctor Diagnostic Service、Verification Traceability Service の shared surface を定義している。

`business-logic-model` は、U001 と U002 の evidence refs を U003 が read-only に読む前提を定義している。

## Shared Surface

U003 は U001 と U002 が作る evidence surface を read-only に共有する。

U003 が追加する shared surface は、warning model、Requirement evidence map、PR readiness checklist である。

| Shared surface | U003 role | Other Unit relationship |
|---|---|---|
| WorkflowEvidenceSnapshot | state、audit、実行時 graph、artifact path を読む。 | U001 と U002 の evidence を read-only に含める。 |
| DiagnosticFinding | warning を doctor output に渡す。 | U001 の Doctor Composition と同じ表示境界を使う。 |
| RequirementEvidenceMap | R001-R009 と evidence item を対応付ける。 | U001 と U002 の evidence ref を読む。 |
| PrReadinessChecklist | Issue、Requirement、verification、parity、scope-out を集約する。 | PR 説明と reviewer 判断の入力になる。 |
| Scope-out item list | collector、dashboard、direct `skills/` edits を required から分ける。 | U001 と U002 の範囲外判断を維持する。 |

## Ownership Boundaries

U001 は Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition の基盤を所有する。

U002 は Subagent Status の outcome evidence と reader normalization を所有する。

U003 は Conductor Warning、Verification Traceability、PR readiness checklist を所有する。

U003 は U001 と U002 の component を呼び出さず、audit row と artifact path を read-only に読む。

U003 は CI を実行しない。

## Access and Mutation Rules

`aidlc-state.md` は read-only に扱う。

Audit shard は read-only に扱い、U003 では append しない。

`runtime-graph.json` は read-only に扱う。

Stage artifacts は path と existence を evidence として扱う。

Missing evidence は warning にし、pass にしない。

## Cost and Sustainability

新しい cloud resource を作らないため、追加の AWS cost は発生しない。

CI cost は warning fixture、evidence map fixture、checklist fixture、validator の実行時間に限定される。

Collector、dashboard、always-on export を required item にしないため、常時稼働 resource を増やさない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

U003 の shared infrastructure は、U001 と U002 の evidence を read-only に集約する形で閉じている。

Warning と PR readiness は state mutation から分離されている。
