# Performance Design: U003-workflow-warning-traceability

## 上流文脈

この performance-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、doctor warning、Requirement evidence map、PR readiness checklist の処理予算を定義している。

`security-requirements` は、read-only evidence、state 非変更、secret 非表示、scope-out 境界を定義している。

`scalability-requirements` は、snapshot 構築、固定 Requirement 集合、固定 Issue 集合での集約を定義している。

`reliability-requirements` は、false-positive guard、non-mutating doctor、missing evidence warning を定義している。

`tech-stack-decisions` は、warning evaluation、evidence snapshot、Requirement evidence map、PR readiness checklist を TypeScript の data structure として扱う判断を定義している。

`business-logic-model` は、WorkflowEvidenceSnapshot から WarningCandidate、DiagnosticFinding、RequirementEvidenceMap、PrReadinessChecklist へ変換する流れを定義している。

## Performance Architecture

| Area | Design | Target |
|---|---|---|
| report mismatch | state、audit、artifact path を 1 回 snapshot 化して評価する。 | PERF001 |
| abandonment | pending question と approval gate evidence を先に評価する。 | PERF002 |
| contradiction | `runtime-graph.json`、audit、state の outcome を比較する。 | PERF003 |
| Requirement evidence map | R001-R009 の固定集合を plain data structure に集約する。 | PERF004 |
| PR readiness checklist | Issue #431、#432、#433、#435 の固定集合を集約する。 | PERF005 |
| stdout JSON | doctor warning と traceability path は diagnostics を stdout に書かない。 | PERF006 |

## Processing Design

WorkflowEvidenceSnapshot は state、audit、実行時 graph、artifact path を read-only に集約する。

Warning evaluation は snapshot から pure helper で実行する。

Abandonment 判定は pending question と approval gate evidence を先に確認する。

Requirement evidence map は R001-R009 の行ごとに evidence item または missing evidence warning を持つ。

PR readiness checklist は required item と scope-out item を別 list にする。

## Budget Allocation

| Segment | Design budget |
|---|---:|
| state and audit snapshot read excluding file system latency | 100ms p95 |
| report mismatch rule evaluation | 100ms p95 |
| abandonment false-positive guard | 100ms p95 |
|実行時 graph contradiction comparison | 250ms p95 |
| Requirement evidence map composition | 50ms p95 |
| PR readiness checklist composition | 100ms p95 |

## Optimization Strategy

Audit scan を warning type ごとに重複させない。

Snapshot を先に構築し、各 rule は snapshot を読むだけにする。

PR readiness では無制限の audit scan を実行しない。

Collector、dashboard、cloud infrastructure、direct `skills/` edits は required item にしない。

## Verification Design

stage artifact と audit transition の差分 fixture で PERF001 を確認する。

pending question、approval gate、abandonment の fixture で PERF002 を確認する。

実行時 graph と audit の contradiction fixture で PERF003 を確認する。

Requirement evidence map fixture で PERF004 を確認する。

PR readiness checklist fixture で PERF005 を確認する。

JSON parse assertion で PERF006 を確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Performance design は diagnostic evidence の読み取りと固定集合の集約に限定されている。

外部 collector、dashboard、cloud export を性能設計に含めていない。
