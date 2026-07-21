# Logical Components — eligibility-report

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。evaluation/report/wiringを所有し、raw evidence/matrix/costを生成・変更しない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `EvaluationInputVerifier` | 96/72 matrix/trace structural proof | U2/U3/U7 identities |
| `ReportPhaseSupervisor` | isolated workers、deadline、terminate/kill | process/clock ports |
| `EligibilityEvaluator` | hard eligibility reasons | verified matrix |
| `ParetoEvaluator` | 3-axis pure relation | eligible cost tuples |
| `AlloyAssessment` | miss/common blind spot table | verified defect cells |
| `TraceVerifier` | row/source/reversal bijection | content refs |
| `ReportRenderer` | canonical JSON/escaped Markdown | final decision model |
| `ReportRevisionClaimStore` | capacity/ACTIVE/RESUMED/CLOSED/ABORTED/RELEASED | filesystem/liveness |
| `TrustedReportPublisher` | privileged immutable publish | verified worker staging |
| `FinalCliRoot` | exactly-one handler injection | U1 typed dispatcher |

## Dependency direction

worker componentsはfinal store権限を持たず、publisherはevaluationを再実装しない。rootはhandler wiringだけを行う。U3/U4/U5/U7残存findingを保持しcompletionを先取りしない。

## Test seams

input/store/sandbox/clockをport化し、decision table、trace、escape、publish crash、wiring equalityを検証する。
