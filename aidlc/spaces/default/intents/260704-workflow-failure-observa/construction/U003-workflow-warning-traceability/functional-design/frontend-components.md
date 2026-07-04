# Frontend Components: U003-workflow-warning-traceability

## 上流文脈

この frontend-components は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U003 は browser frontend を含まない。

ただし `requirements` と `components` は Maintainer、Agent、Reviewer が読む doctor warning、Requirement evidence map、PR readiness checklist を利用者向け表現として扱う。

そのため、この artifact は UI ではなく CLI output component と checklist component を定義する。

## Component Hierarchy

| Component | Parent | Purpose |
|---|---|---|
| `WorkflowWarningSection` | root | conductor-independent warning を表示する。 |
| `ReportMismatchWarning` | `WorkflowWarningSection` | run-stage/report mismatch を表示する。 |
| `AbandonedStageWarning` | `WorkflowWarningSection` | in-flight stage abandonment 候補を表示する。 |
| `RuntimeGraphContradictionWarning` | `WorkflowWarningSection` | 実行時 graph、audit、state の contradiction を表示する。 |
| `RequirementEvidenceTable` | root | R001-R009 と evidence item を表示する。 |
| `PrReadinessChecklistView` | root | Issue、Intent、Requirement、verification、parity、scope boundary を表示する。 |
| `ParityResolutionPanel` | `PrReadinessChecklistView` | parity state、reason、resolution path を表示する。 |

## Props and State

| Component | Inputs | State |
|---|---|---|
| `WorkflowWarningSection` | `WorkflowWarningFinding[]` | empty、warning-present |
| `ReportMismatchWarning` | artifact refs、audit refs | hidden、visible |
| `AbandonedStageWarning` | current stage、pending question refs、gate refs | hidden、visible、suppressed |
| `RuntimeGraphContradictionWarning` | graph outcome、audit outcome、state status | hidden、visible |
| `RequirementEvidenceTable` | `RequirementEvidenceMap` | partial、complete、missing-evidence |
| `PrReadinessChecklistView` | checklist items | draft、ready、blocked |
| `ParityResolutionPanel` | `ParityDecision` | not-needed、unresolved、resolved |

## Interaction Flow

Maintainer は doctor を実行する。

warning がある場合、`WorkflowWarningSection` で warning type、evidence refs、next action を確認する。

Agent は `RequirementEvidenceTable` で R001-R009 の evidence gap を確認する。

Reviewer は `PrReadinessChecklistView` で Issue #431、#432、#433、#435 と verification result の対応を確認する。

parity failure がある場合、Reviewer は `ParityResolutionPanel` で reason と resolution path を確認する。

scope-out item は required verification item と別に表示する。

## Validation Rules

warning 表示は state を変更しない。

pending question または approval gate がある stage は abandonment warning を抑制する。

Requirement evidence が missing の場合、ready と表示しない。

parity unresolved の場合、PR readiness は blocked または pending と表示する。

collector、dashboard、cloud infrastructure は required setup として表示しない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

browser frontend がない Unit であるため、CLI output component と checklist component として整理している。

warning、Requirement evidence、PR readiness の利用者向け表示は責務が分かれている。
