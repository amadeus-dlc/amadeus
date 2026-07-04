# Team Allocation

## 上流文脈

この team-allocation は、`requirements`、`stories`、`mockups`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices` を入力として作成する。

`requirements` は、R001-R009 と検証証拠の範囲を定義している。

`stories` は、Maintainer、Agent、Reviewer の利用文脈を定義している。

`mockups` は、doctor output、audit evidence、OpenTelemetry core、PR readiness checklist の確認面を定義している。

`components` は、Construction で触る component 境界を定義している。

`unit-of-work` は、U001、U002、U003 の責務と検証焦点を定義している。

`unit-of-work-dependency` は、B001、B002、B003 が従う Unit DAG を定義している。

`unit-of-work-story-map` は、US001-US009 の Unit 割当を定義している。

`team-practices` は、team-formation が SKIP の mvp scope で、gated かつ sequential な Construction を採用する前提を定義している。

## Allocation 方針

この Intent は mvp scope である。

`team-formation` は SKIP されている。

そのため、人間チームや外部 platform team を仮作成しない。

すべての Bolt は `aidlc-developer-agent` を primary implementation owner とする。

Construction stage ごとの lead agent、reviewer、validator、human approval gate は、AI-DLC の stage protocol に従う。

## Bolt Assignment

| Bolt | Unit | Primary owner | Supporting roles | Gate |
|---|---|---|---|---|
| B001-failure-evidence-foundation | U001-failure-evidence-foundation | aidlc-developer-agent | aidlc-architect-agent、aidlc-quality-agent | human gate required |
| B002-subagent-status-audit | U002-subagent-status-audit | aidlc-developer-agent | aidlc-architect-agent、aidlc-quality-agent | human gate required |
| B003-workflow-warning-traceability | U003-workflow-warning-traceability | aidlc-developer-agent | aidlc-architect-agent、aidlc-quality-agent | human gate required |

## Stage Responsibility Mapping

| Construction stage | Primary stage role | Allocation note |
|---|---|---|
| functional-design | aidlc-architect-agent with aidlc-developer-agent | Unit-specific functional details and interfaces are refined before implementation. |
| nfr-requirements | aidlc-architect-agent with aidlc-devsecops-agent、aidlc-compliance-agent、aidlc-quality-agent | stdout JSON、OpenTelemetry no-op default、audit integrity、determinism を確認する。 |
| nfr-design | aidlc-architect-agent with aidlc-aws-platform-agent | cloud infrastructure は対象外とし、local tooling の observability boundary を扱う。 |
| infrastructure-design | aidlc-aws-platform-agent with aidlc-devsecops-agent、aidlc-compliance-agent | new runtime infrastructure は対象外であることを確認する。 |
| code-generation | aidlc-developer-agent | `.agents/aidlc/tools` の TypeScript 実装と deterministic tests を扱う。 |
| build-and-test | aidlc-quality-agent with aidlc-devsecops-agent | target tests、typecheck、validator、stdout JSON、no-op telemetry を確認する。 |
| ci-pipeline | aidlc-pipeline-deploy-agent | PR 前後の CI と `npm run test:all` を確認する。 |

## Worktree and Branching

同一 worktree 内では Bolt を直列に実行する。

並行実行は、この Intent では使わない。

作業 branch は Git Branching Policy に従い、Issue または Intent を追跡できる名前にする。

Construction の PR 単位は Bolt ごとを既定とする。

PR 説明には、対象 Issue、対象 Intent、変更範囲、検証結果を含める。

merge 操作は人間が行う。

## Communication and Review

各 Bolt の完了時に、実装結果、検証結果、PR readiness evidence を Intent artifacts または PR 説明へ接続する。

CI failure がある場合は、review comment より先に CI failure を解消する。

review comment は、Issue と Intent の範囲に合うかを判断してから対応する。

目的と異なるが有効な指摘は、後続 Issue 候補として扱う。

## Coverage

| Owner | Covers | Notes |
|---|---|---|
| aidlc-developer-agent | B001、B002、B003 の implementation | team-formation が SKIP されたため、primary owner とする。 |
| aidlc-architect-agent | design validation and dependency conformance | Unit DAG と component boundary を確認する。 |
| aidlc-quality-agent | deterministic verification | target tests、validator、stdout JSON、OpenTelemetry no-op default を確認する。 |
| human gate | Bolt approval and merge decision | gate approval と merge は人間判断で扱う。 |

## Traceability

| Bolt | Requirements | Stories | Allocation evidence |
|---|---|---|---|
| B001-failure-evidence-foundation | R001、R002、R003、R007、R008、R009 | US001、US002、US003、US006、US007、US008、US009 | `unit-of-work`、`unit-of-work-story-map`、`team-practices` |
| B002-subagent-status-audit | R004、R007、R008、R009 | US004、US006、US007、US008、US009 | `unit-of-work`、`unit-of-work-dependency` |
| B003-workflow-warning-traceability | R005、R006、R007、R009 | US005、US006、US007、US009 | `unit-of-work-story-map`、`team-practices` |
