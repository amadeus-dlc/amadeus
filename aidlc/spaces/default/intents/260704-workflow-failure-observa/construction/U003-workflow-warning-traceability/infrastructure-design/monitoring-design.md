# Monitoring Design: U003-workflow-warning-traceability

## 上流文脈

この monitoring-design は、`performance-design`、`security-design`、`scalability-design`、`reliability-design`、`logical-components`、`components`、`services`、`business-logic-model` を入力として作成する。

`performance-design` は、report mismatch、abandonment、contradiction、Requirement evidence map、PR readiness checklist の観測点を定義している。

`security-design` は、read-only evidence、scope-out item、secret 非表示、state 非変更を定義している。

`scalability-design` は、fixed Requirement rows と fixed Issue rows による集約を定義している。

`reliability-design` は、warning fixture、false-positive guard、non-mutating assertion、stdout JSON parse を定義している。

`logical-components` は、Conductor Warning Evaluator、False-Positive Guard、Doctor Warning Renderer、Requirement Evidence Mapper、PR Readiness Checklist Builder を定義している。

`components` は、Conductor Warning と Verification Traceability を read-only consumer として定義している。

`services` は、Doctor Diagnostic Service と Verification Traceability Service の outputs を定義している。

`business-logic-model` は、WarningCandidate、DiagnosticFinding、RequirementEvidenceMap、PrReadinessChecklist への変換を定義している。

## Metrics and KPIs

U003 の metrics は、workflow warning と PR readiness の証拠不足を見えるようにする。

| Metric | 目的 | Source | Required behavior |
|---|---|---|---|
| report mismatch warning count | artifact exists and report missing を検出する。 | Conductor Warning Evaluator | warning と evidence ref を返す。 |
| abandonment warning count | in-flight stage abandonment を検出する。 | False-Positive Guard | pending question と approval gate は除外する。 |
| contradiction warning count | state、audit、実行時 graph の矛盾を検出する。 | Conductor Warning Evaluator | state mutation をしない。 |
| missing evidence count | Requirement evidence の不足を見える化する。 | Requirement Evidence Mapper | pass ではなく warning にする。 |
| PR readiness incomplete count | PR 前の未完了項目を集約する。 | PR Readiness Checklist Builder | scope-out と required を分ける。 |

KPI は、warning fixture、false-positive guard、non-mutating assertion、Requirement evidence map、PR readiness checklist の deterministic fixture が 100% 通ることである。

## Log Strategy

U003 は新しい log aggregation service を追加しない。

Warning は doctor standard output と verbose detail に分けて表示する。

Requirement evidence map と PR readiness checklist は Intent artifact または PR description の証拠として扱う。

JSON stdout command は warning diagnostic text を stdout に出さない。

## Tracing Configuration

U003 は独自の tracing infrastructure を作らない。

Command lifecycle の tracing は U001 の Telemetry Core facade を使う。

Warning count や missing evidence count を telemetry metric にする場合も、low-cardinality の warning type に限定する。

Exporter 未設定時は no-op default を維持する。

## Alert and Dashboard Design

U003 は外部 alert service と dashboard hosting を必須にしない。

Alert 相当の表面化は、doctor warning、CI failure、PR readiness checklist で扱う。

Dashboard 相当の一覧は、Requirement evidence map と PR checklist で扱う。

Collector と dashboard は scope-out item として扱い、core 計装の required item にしない。

## Incident Response

U003 の調査入口は、doctor output、audit shard、`aidlc-state.md`、`runtime-graph.json`、stage artifact、verification result である。

Malformed audit row は warning detail にし、doctor を crash させない。

Missing `runtime-graph.json` は graph missing warning にし、audit と state の check を継続する。

Parity failure は reason と resolution path を checklist に残す。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

U003 の monitoring design は、warning と traceability の未完了を人間が確認できる形で出す。

State mutation や外部 dashboard を必須にしないため、diagnostic path の独立性が保たれている。
