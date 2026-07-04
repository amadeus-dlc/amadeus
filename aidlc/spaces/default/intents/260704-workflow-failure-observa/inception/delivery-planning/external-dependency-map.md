# External Dependency Map

## 上流文脈

この external-dependency-map は、`requirements`、`stories`、`mockups`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices` を入力として作成する。

`requirements` は、collector、dashboard、cloud infrastructure、always-on network export、direct `skills/` edits、unauthorized `.coderabbit.yml` changes を out of scope としている。

`stories` は、Won't Have stories と PR readiness traceability を定義している。

`mockups` は、PR readiness checklist と not-designed flows を定義している。

`components` は、OpenTelemetry collector、dashboard、cloud export を component にしない方針を定義している。

`unit-of-work` は、すべての Unit を `.agents/aidlc/tools` 内の embedded CLI/tooling module として扱っている。

`unit-of-work-dependency` は、Unit 間の依存を local in-process と file-backed evidence に閉じている。

`unit-of-work-story-map` は、Won't Have stories を全 Unit の scope guard として扱っている。

`team-practices` は、PR、CI、人間承認 gate、validator、parity、stdout JSON、OpenTelemetry no-op default を検証と運用の境界としている。

## Dependency Summary

実装は AI-contained とする。

新しい外部 API は必須依存にしない。

OpenTelemetry collector と dashboard は必須依存にしない。

cloud infrastructure approval は必須 gate にしない。

外部依存として扱うものは、GitHub Issue、Pull Request、CI、人間承認 gate だけである。

## External Dependencies

| Dependency | Type | Owner | Blocks | Lead time | Mitigation |
|---|---|---|---|---|---|
| GitHub Issue #431 | planning trace | Maintainer | B001 scope trace | existing | PR description と Intent artifacts に link する。 |
| GitHub Issue #432 | planning trace | Maintainer | B001 scope trace | existing | PR description と Intent artifacts に link する。 |
| GitHub Issue #433 | planning trace | Maintainer | B002 scope trace | existing | PR description と Intent artifacts に link する。 |
| GitHub Issue #435 | planning trace | Maintainer | B003 scope trace | existing | PR description と Intent artifacts に link する。 |
| Pull Request review | delivery gate | Maintainer、Reviewer | each Bolt PR | depends on review | CI failure を先に解消し、review comment は scope に照らして対応する。 |
| GitHub Actions CI | verification gate | repository CI | each Bolt PR | on PR | `npm run test:all` failure を先に解消する。 |
| Human approval gate | lifecycle gate | Maintainer | each Bolt and stage approval | interactive | gate で approve または request changes を明示する。 |

## Non-dependencies

| Item | Status | Reason |
|---|---|---|
| OpenTelemetry collector | non-dependency | collector は optional scope であり、core 計装の必須 gate に含めない。 |
| Observability dashboard | non-dependency | dashboard は optional scope であり、この Intent の Construction を block しない。 |
| Cloud telemetry export | non-dependency | no-op default と local deterministic test を優先する。 |
| AWS runtime infrastructure | non-dependency | `.agents/aidlc/tools` の local CLI/tooling が対象であり、新しい runtime service を追加しない。 |
| External API | non-dependency | Requirement と Unit は local files、audit、doctor、OpenTelemetry test seam で検証できる。 |
| direct `skills/` edits | forbidden dependency | `skills/` は配布物境界であり、この Intent では直接編集しない。 |
| `.coderabbit.yml` or `.coderabbit.yaml` changes | forbidden dependency | 明示的な人間許可なしに変更しない。 |

## Dependency by Bolt

| Bolt | External dependency | Blocking status | Notes |
|---|---|---|---|
| B001-failure-evidence-foundation | GitHub Issue #431、#432、CI、human gate | issue trace ready, CI/gate pending | collector と dashboard は block しない。 |
| B002-subagent-status-audit | GitHub Issue #433、CI、human gate | issue trace ready, CI/gate pending | external API は不要である。 |
| B003-workflow-warning-traceability | GitHub Issue #435、#431、#432、#433、CI、human gate | issue trace ready, CI/gate pending | PR readiness checklist で external dependency status をまとめる。 |

## Approval and Lead Time Handling

各 Bolt は human gate を持つ。

PR review は各 Bolt の merge 前に扱う。

CI failure がある場合は、review comment より先に解消する。

外部依存が新しく見つかった場合は、現在の Bolt の scope に必要かを判断し、目的と異なるが有効な作業は後続 Issue 候補として扱う。

## Traceability

| Dependency | Requirements | Stories | Evidence location |
|---|---|---|---|
| GitHub Issue and PR trace | R009 | US009 | PR description、Intent artifacts |
| CI and test results | R007 | US007 | test result artifact、PR checks |
| parity result | R006 | US006 | PR description、Intent artifacts |
| human approval gate | R009 | US009 | Audit Trail、Aidlc State |
| optional collector/dashboard boundary | R003、R009 | US003、US009、WH001、WH002 | not-designed flows、PR checklist |
