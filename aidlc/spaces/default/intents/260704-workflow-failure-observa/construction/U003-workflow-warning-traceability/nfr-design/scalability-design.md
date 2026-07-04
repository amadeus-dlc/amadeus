# Scalability Design: U003-workflow-warning-traceability

## 上流文脈

この scalability-design は、`performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model` を入力として作成する。

`performance-requirements` は、warning evaluation、Requirement evidence map、PR readiness checklist の処理予算を定義している。

`security-requirements` は、read-only evidence と scope-out item の境界を定義している。

`scalability-requirements` は、stage artifact 数、audit row 数、実行時 graph entry 数、verification evidence 数を成長対象として定義している。

`reliability-requirements` は、missing evidence warning と false-positive guard の target を定義している。

`tech-stack-decisions` は、warning evaluation と checklist を TypeScript の helper と data structure で扱う判断を定義している。

`business-logic-model` は、U001 と U002 の evidence refs を RequirementEvidenceItem に変換する流れを定義している。

## Growth Model

U003 の成長対象は stage artifact 数、audit row 数、実行時 graph entry 数、verification evidence 数である。

MVP では対象 Requirement は R001-R009 の固定集合である。

対象 Issue は #431、#432、#433、#435 の固定集合である。

PR readiness checklist は scope-out item を required item に昇格しない。

## Scaling Architecture

| Concern | Design | Trigger |
|---|---|---|
| warning evaluation | WorkflowEvidenceSnapshot を 1 回構築して rule evaluation へ渡す。 | SCALE001 |
| Requirement evidence map | R001-R009 の fixed rows に evidence item または missing evidence warning を入れる。 | SCALE002 |
| PR readiness checklist | Issue #431、#432、#433、#435 の fixed rows に verification state を入れる。 | SCALE003 |
| U001 and U002 evidence | read-only adapter で読むだけにする。 | SCALE004 |
| warning type 追加 | `DiagnosticFinding` の分類追加で吸収する。 | SCALE005 |

## Degradation Design

Audit scan が重複して遅くなる場合は、snapshot 構築を先に統合する。

False positive が増える場合は、pending question と approval gate evidence を先に評価する。

Evidence map が sparse になる場合は、missing evidence warning にする。

PR readiness が肥大化する場合は、required と scope-out を分け直す。

## AWS Platform Boundary

U003 は cloud workload ではない。

AWS infrastructure、database、message broker、dashboard hosting は設計しない。

Infrastructure Design へ渡す logical component は、Conductor Warning、Verification Traceability、Doctor Composition の CLI 内 component である。

## Verification Design

fixture benchmark で warning evaluation が stage 数と audit row 数に対して線形に完了することを確認する。

evidence map fixture で R001-R009 の fixed rows を確認する。

checklist fixture で Issue #431、#432、#433、#435 の fixed rows を確認する。

dependency review で U001 と U002 の evidence が read-only であることを確認する。

type and snapshot review で warning type 追加が doctor output format を壊さないことを確認する。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Scalability design は diagnostic evidence の読み取りと固定 Requirement 集合の集約に限定されている。

U003 は U001 と U002 を呼び出さず、read-only evidence だけを使う。
