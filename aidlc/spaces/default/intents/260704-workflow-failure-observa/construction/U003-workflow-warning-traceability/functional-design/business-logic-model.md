# Business Logic Model: U003-workflow-warning-traceability

## 上流文脈

この business-logic-model は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U003 は `unit-of-work` の `U003-workflow-warning-traceability` に対応する。

`unit-of-work-story-map` では US005、US006、US007、US009 を主対象とする。

`requirements` では R005、R006、R007、R009、NFR004、NFR006 を扱う。

`components` では Shared Contracts、Error Audit、Subagent Status、Conductor Warning、Verification Traceability、Doctor Composition を使う。

`component-methods` では Conductor Warning Methods、Verification Traceability Methods、Doctor Composition Methods を使う。

`services` では Doctor Diagnostic Service と Verification Traceability Service を中心に使う。

## 処理モデル

U003 の処理は、workflow failure 候補を doctor warning として表面化し、Requirement evidence と PR readiness checklist へ接続する。

Conductor Warning は `aidlc-state.md`、audit、`runtime-graph.json`、stage artifacts を read-only で読む。

run-stage/report mismatch は、stage artifact が存在するが report transition がない場合に warning 候補にする。

in-flight stage abandonment は、Current Stage が in-progress で、pending question または approval gate の evidence がない場合に warning 候補にする。

runtime graph と audit の contradiction は、stage outcome、sensor result、memory entry の読み取りが矛盾する場合に warning 候補にする。

doctor は warning を表示するだけで、workflow state を変更しない。

Verification Traceability は R001-R009 を Issue、Unit、Bolt、test result、validator、parity、stdout JSON、OpenTelemetry no-op default の evidence item に対応付ける。

PR readiness checklist は Issue #431、#432、#433、#435、Intent、Requirement、検証結果、scope-out 境界、parity state を集約する。

## 処理順序

| Step | Input | Component | Output |
|---|---|---|---|
| 1 | `aidlc-state.md`、audit、artifacts | Conductor Warning | report mismatch finding |
| 2 | state、questions、gate events | Conductor Warning | abandonment finding |
| 3 | `runtime-graph.json`、audit、state | Conductor Warning | contradiction finding |
| 4 | findings | Doctor Composition | non-mutating warning output |
| 5 | R001-R009、U001 evidence、U002 evidence | Verification Traceability | Requirement evidence map |
| 6 | issues、verification、parity state | Verification Traceability | PR readiness checklist |

## 判断木

| Condition | Decision | Result |
|---|---|---|
| artifact exists and report missing | warning を出す | run-stage/report mismatch が見える |
| pending question がある | abandonment warning を抑制する | 正常な人間待ちを誤検出しない |
| gate が open である | abandonment warning を抑制する | 正常な approval 待ちを誤検出しない |
| audit と state が矛盾する | warning を出す | Maintainer が evidence を確認できる |
| parity failure がある | checklist に reason と resolution path を出す | Reviewer が判断できる |
| evidence が不足する | missing evidence warning にする | PR readiness を偽装しない |

## Data Transformation

state、audit、artifact path は `WorkflowEvidenceSnapshot` に変換する。

`WorkflowEvidenceSnapshot` は `WarningCandidate` に変換する。

`WarningCandidate` は `DiagnosticFinding` に変換される。

`DiagnosticFinding` は doctor standard output と verbose detail に分けて表示される。

U001 と U002 の evidence refs は `RequirementEvidenceItem` に変換する。

`RequirementEvidenceItem[]` は `RequirementEvidenceMap` に集約する。

`RequirementEvidenceMap`、Issue refs、parity state は `PrReadinessChecklist` に変換する。

## Integration Points

Conductor Warning は state、audit、実行時 graph、Intent artifacts を read-only に扱う。

Conductor Warning は Error Audit と Subagent Status を呼ばない。

Verification Traceability は Error Audit と Subagent Status の evidence を read-only に読む。

PR readiness checklist は CI を実行しない。

CI 結果は外部 evidence として取り込む。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

warning 検出と state mutation が分離されている。

Requirement evidence map と PR readiness checklist は U001、U002 の read-only evidence を前提にしており、逆依存を作っていない。
