# Frontend Components: U002-subagent-status-audit

## 上流文脈

この frontend-components は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U002 は browser frontend を含まない。

ただし `requirements` と `components` は Maintainer、Agent、Reviewer が読む doctor output と downstream analysis 表示を利用者向け表現として扱う。

そのため、この artifact は UI ではなく CLI output component と audit summary component を定義する。

## Component Hierarchy

| Component | Parent | Purpose |
|---|---|---|
| `SubagentStatusSummary` | root | success、failure、unknown の件数と latest evidence を表示する。 |
| `SubagentUnknownFinding` | `SubagentStatusSummary` | trustworthy status がないため unknown になった evidence gap を表示する。 |
| `SubagentFailureFinding` | `SubagentStatusSummary` | failure outcome を表示する。 |
| `SubagentAuditCompatibilityNote` | root | old row と new row の compatibility を表示する。 |
| `SubagentVerboseEvidence` | root | agent id、agent type、source field、audit ref を verbose に表示する。 |

## Props and State

| Component | Inputs | State |
|---|---|---|
| `SubagentStatusSummary` | normalized outcomes | empty、mixed、failure-present、unknown-present |
| `SubagentUnknownFinding` | unknown outcomes | hidden、visible |
| `SubagentFailureFinding` | failure outcomes | hidden、visible |
| `SubagentAuditCompatibilityNote` | old row count、new row count | compatible、mixed、missing-reader |
| `SubagentVerboseEvidence` | `OutcomeEvidenceRef[]` | hidden、expanded |

## Interaction Flow

Maintainer は doctor または downstream analysis を見る。

success、failure、unknown は同じ表示に混ぜず、状態別に読む。

unknown は failure と同義ではなく、source が区別不能であることを示す。

Reviewer は old row と new row の両方が読めることを compatibility note で確認する。

詳細確認では verbose evidence から audit row と hook source を辿る。

## Validation Rules

unknown を failure として表示しない。

message text からの推測結果を表示しない。

old row に outcome field がないことを error として扱わない。

standard output は concise にし、agent message excerpt は必要最小限にする。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

browser frontend がない Unit であるため、CLI output component として整理している。

unknown の意味が failure と混同されないように表示状態を分けている。
