# Risk and Sequencing Rationale

## 上流文脈

この risk-and-sequencing-rationale は、`requirements`、`stories`、`mockups`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices` を入力として作成する。

`requirements` は、R001-R009 と NFR001-NFR006 を定義している。

`stories` は、B001、B002、B003 の候補と verification evidence を定義している。

`mockups` は、doctor output と PR readiness checklist が利用者に見える形を定義している。

`components` は、OpenTelemetry core、Error Audit、Hook Drop Doctor、Subagent Status、Conductor Warning、Verification Traceability の component 境界を定義している。

`unit-of-work` は、U001、U002、U003 の complexity と deployment model を定義している。

`unit-of-work-dependency` は、U001、U002、U003 の DAG を定義している。

`unit-of-work-story-map` は、story と Unit の対応を定義している。

`team-practices` は、B001 を walking skeleton とし、同一 worktree 内では Bolt を直列実行する方針を定義している。

## Sequencing Heuristic

この plan は、walking-skeleton-first と risk-first の hybrid を採用する。

B001 は、失敗記録、doctor visibility、OpenTelemetry no-op default を同じ縦断 slice で確認する。

B002 は、B001 の Shared Contracts と Error Audit evidence path を使い、subagent outcome classification を追加する。

B003 は、B001 と B002 の evidence を read-only で参照し、conductor warning と PR readiness traceability を追加する。

この順序は、`unit-of-work-dependency` の DAG に従う。

## Lightweight WSJF-style Score

WSJF-style score は説明用に使う。

順序の最終判断は、`team-practices` の walking skeleton 方針と `unit-of-work-dependency` の DAG を優先する。

Score は `(Value + Time Criticality + Risk Reduction) / Job Size` として扱う。

| Bolt | Value | Time Criticality | Risk Reduction | Job Size | Score | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| B001-failure-evidence-foundation | 5 | 5 | 5 | 4 | 3.75 | 最初に失敗証拠の縦断 slice を証明する価値が高い。 |
| B002-subagent-status-audit | 4 | 3 | 3 | 3 | 3.33 | B001 後に audit compatibility を広げる。 |
| B003-workflow-warning-traceability | 4 | 4 | 4 | 4 | 3.00 | B001 と B002 の evidence を集約し、PR readiness に接続する。 |

## Risk Register

| Risk | Applies to | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| stdout JSON contract が telemetry または diagnostics で壊れる。 | B001 | Medium | High | stdout JSON parse test を B001 の Definition of Done に入れる。 |
| audit emission failure が recursive error を起こす。 | B001 | Medium | High | audit write failure fixture と non-recursive error handling を検証する。 |
| hook drop parsing が malformed input で doctor を crash させる。 | B001 | Medium | Medium | malformed `.drops` fixture を用意し、warning continuation を検証する。 |
| OpenTelemetry が no-op default で network export しないことを証明できない。 | B001 | Medium | High | no-op default no-send test と test exporter seam を先に作る。 |
| subagent outcome を free text から誤推測する。 | B002 | Medium | Medium | trustworthy status field がない場合は unknown とする fixture を用意する。 |
| Verification Traceability が evidence source と循環依存する。 | B003 | Low | High | U003 は Error Audit と Subagent Status を read-only evidence として読む。 |
| PR readiness evidence が Issue、Requirement、verification を横断できない。 | B003 | Medium | Medium | PR readiness checklist と Requirement evidence map を B003 の Definition of Done に含める。 |

## Dependency Validation

`unit-of-work-dependency` の DAG は次を定義している。

```text
B001-failure-evidence-foundation
  -> B002-subagent-status-audit
  -> B003-workflow-warning-traceability
```

B001 は direct dependency を持たない。

B002 は U001 に依存するため、B001 の後に置く。

B003 は U001 と U002 に依存するため、B001 と B002 の後に置く。

この sequence は DAG から逸脱しない。

## Deviation Assessment

この plan は、topological order から逸脱しない。

この plan は、risk-first の理由を持つが、DAG を破らない。

この plan は、walking skeleton を B001 に置くが、team-practices と一致する。

この plan は、critical path を経済判断として扱わず、依存 chain の説明に留める。

## Rationale by Bolt

### B001-failure-evidence-foundation

B001 は、最初に失敗証拠の縦断 slice を証明する。

この Bolt は、#431、#432、OpenTelemetry core correction を同時に扱う。

この Bolt は、後続 Bolt が参照する Shared Contracts、Error Audit evidence、doctor output、OpenTelemetry facade を作る。

### B002-subagent-status-audit

B002 は、B001 の audit foundation を使って subagent outcome を分類する。

この Bolt は、#433 と audit taxonomy compatibility を扱う。

この Bolt は、B003 が read-only evidence として参照できる outcome evidence を作る。

### B003-workflow-warning-traceability

B003 は、B001 と B002 の evidence を集約し、workflow warning と PR readiness traceability を作る。

この Bolt は、#435 と R006、R007、R009 を扱う。

この Bolt は、Maintainer と Reviewer が Issue、Requirement、verification、parity boundary を辿れる状態を作る。

## Traceability

| Bolt | Heuristic | Requirements | Stories | Risk focus |
|---|---|---|---|---|
| B001-failure-evidence-foundation | walking-skeleton-first、risk-first | R001、R002、R003、R007、R008、R009 | US001、US002、US003、US006、US007、US008、US009 | stdout JSON、audit recursion、hook parsing、OpenTelemetry no-op |
| B002-subagent-status-audit | risk-first within DAG | R004、R007、R008、R009 | US004、US006、US007、US008、US009 | status misclassification、old/new audit row compatibility |
| B003-workflow-warning-traceability | value and readiness after evidence exists | R005、R006、R007、R009 | US005、US006、US007、US009 | non-mutating warning、PR evidence completeness、parity trace |
