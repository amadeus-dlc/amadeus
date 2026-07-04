# Bolt Plan

## 上流文脈

この bolt-plan は、`requirements`、`stories`、`mockups`、`components`、`unit-of-work`、`unit-of-work-dependency`、`unit-of-work-story-map`、`team-practices` を入力として作成する。

`requirements` は、R001-R009 と NFR001-NFR006 を定義している。

`stories` は、US001-US009 と Issue #431、#432、#433、#435、OpenTelemetry core 計装の対応を定義している。

`mockups` は、`doctor` standard output、audit evidence、OpenTelemetry core、PR readiness checklist の期待表示を定義している。

`components` は、Error Audit、Hook Drop Doctor、Telemetry Core、Subagent Status、Conductor Warning、Verification Traceability、Doctor Composition、Shared Contracts を定義している。

`unit-of-work` は、U001、U002、U003 の 3 Unit と検証焦点を定義している。

`unit-of-work-dependency` は、U002 が U001 に依存し、U003 が U001 と U002 に依存する DAG を定義している。

`unit-of-work-story-map` は、US001-US009 を U001、U002、U003 へ割り当てている。

`team-practices` は、最初の Bolt を #431、#432、OpenTelemetry no-op default 計装の縦断 slice にし、同一 worktree 内では Bolt を直列実行し、Construction Autonomy Mode を gated として扱う方針を定義している。

## Bolt 方針

Bolt は、Construction stages 3.1 から 3.7 を 1 回通す実行単位である。

この plan は、1 Unit per Bolt として 3 Bolts を定義する。

この plan は、walking-skeleton-first と risk-first の hybrid を採用する。

この plan は、同一 worktree 内で Bolt を直列に実行する。

各 Bolt は gated とし、検証証拠と PR readiness evidence を残してから次 Bolt へ進む。

collector、dashboard、cloud export、cloud infrastructure、direct `skills/` edits、unauthorized `.coderabbit.yml` changes は Bolt に含めない。

## Bolt Sequence

| Bolt | Unit | Walking skeleton | Primary outcome | Gate |
|---|---|---:|---|---|
| B001-failure-evidence-foundation | U001-failure-evidence-foundation | yes | `ERROR_LOGGED`、hook drop doctor、OpenTelemetry no-op default を同じ縦断 slice で証明する。 | required |
| B002-subagent-status-audit | U002-subagent-status-audit | no | `SUBAGENT_COMPLETED` の success、failure、unknown 分類と audit compatibility を証明する。 | required |
| B003-workflow-warning-traceability | U003-workflow-warning-traceability | no | conductor-independent warning と PR readiness traceability を証明する。 | required |

## B001-failure-evidence-foundation

### Included Unit

B001 は `U001-failure-evidence-foundation` を含む。

### Walking Skeleton

B001 は walking skeleton である。

B001 は、command execution、audit evidence、doctor output、OpenTelemetry core 計装、test exporter seam、stdout JSON preservation を貫通して確認する。

### Definition of Done

- `ERROR_LOGGED` の deterministic test が、error directive と top-level catch の両方を確認している。
- stdout JSON contract の parse test が、error audit と telemetry path で壊れていないことを確認している。
- `.aidlc-hooks-health/*.drops` の fixture が、standard doctor output と malformed input warning を確認している。
- OpenTelemetry no-op default no-send test が、exporter 未設定で network export を試みないことを確認している。
- test exporter または in-memory exporter の test が、command span、error span、doctor metrics を確認している。
- `npm run typecheck` 相当の型安全性が後続検証で確認できる状態になっている。

### Confidence Hypothesis

B001 を shipping すると、AI-DLC workflow failure の最小証拠が、会話ログに依存せず audit、doctor、OpenTelemetry core から辿れることを証明できる。

### Expected Demo

- `aidlc-orchestrate.ts next` の error directive を fixture で発生させ、audit に `ERROR_LOGGED` が残ることを示す。
- `.aidlc-hooks-health/*.drops` を fixture で用意し、doctor standard output に hook name、count、latest reason が出ることを示す。
- OpenTelemetry exporter 未設定で、no-op default が network export をしないことを示す。

### Evidence

| Evidence | Requirement | Story |
|---|---|---|
| `ERROR_LOGGED` audit fixture | R001、R008 | US001、US008 |
| hook drop doctor fixture | R002 | US002 |
| OpenTelemetry no-op default test | R003、NFR002、NFR003 | US003 |
| stdout JSON parse test | NFR001、R007 | US001、US003、US007 |

## B002-subagent-status-audit

### Included Unit

B002 は `U002-subagent-status-audit` を含む。

### Walking Skeleton

B002 は walking skeleton ではない。

B002 は B001 の Shared Contracts と Error Audit evidence path を前提にする。

### Definition of Done

- hook input fixture が success、failure、missing status を含む。
- trustworthy status field がある場合は success と failure が audit に残る。
- trustworthy status field がない場合は free text から推測せず、unknown として扱う。
- old audit row と new audit row の両方を reader が扱える。
- `SUBAGENT_COMPLETED` の追加 field は additive であり、既存 event 名を削除または改名しない。

### Confidence Hypothesis

B002 を shipping すると、subagent outcome を downstream analysis が誤分類せず、success、failure、unknown の違いを audit から判断できることを証明できる。

### Expected Demo

- success hook payload、failure hook payload、status unavailable payload を使い、audit row の outcome が区別されることを示す。
- old row に status がない場合も reader が壊れないことを示す。

### Evidence

| Evidence | Requirement | Story |
|---|---|---|
| success hook fixture | R004 | US004 |
| failure hook fixture | R004 | US004 |
| missing status fixture | R004 | US004 |
| old/new audit row compatibility | R008、NFR005 | US008 |

## B003-workflow-warning-traceability

### Included Unit

B003 は `U003-workflow-warning-traceability` を含む。

### Walking Skeleton

B003 は walking skeleton ではない。

B003 は B001 と B002 の evidence を read-only で参照する。

### Definition of Done

- run-stage/report mismatch、in-flight stage abandonment、runtime graph/audit contradiction の fixtures が doctor warning を確認している。
- doctor warning は workflow state を mutate しない。
- Requirement evidence map が R001-R009 と検証証拠を対応付ける。
- PR readiness checklist が Issue、Intent、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default を含む。
- parity failure がある場合、failure reason と resolution path を trace に含める。
- collector、dashboard、cloud infrastructure、direct `skills/` edits、unauthorized `.coderabbit.yml` changes が out of scope として見える。

### Confidence Hypothesis

B003 を shipping すると、workflow failure の候補と PR readiness の証拠が、Maintainer と Reviewer に説明できる形で Intent artifacts から辿れることを証明できる。

### Expected Demo

- state/audit contradiction fixture から doctor warning が出ることを示す。
- doctor warning が state を変更しないことを示す。
- PR readiness checklist が Issue #431、#432、#433、#435 と R001-R009 を参照することを示す。

### Evidence

| Evidence | Requirement | Story |
|---|---|---|
| doctor warning fixture | R005、NFR006 | US005 |
| non-mutating doctor assertion | R005 | US005 |
| Requirement evidence map | R007 | US007 |
| PR readiness checklist | R009 | US009 |
| parity result and exception rationale | R006 | US006 |

## Construction Gate Policy

Construction Autonomy Mode は `gated` として扱う。

各 Bolt の完了後に gate を提示する。

walking skeleton である B001 は必ず人間承認を受ける。

同一 worktree 内では B001、B002、B003 を直列実行する。

CI failure がある場合は、review comment より先に CI failure を解消する。

## Traceability

| Bolt | Unit | Requirements | Stories | Issues or source |
|---|---|---|---|---|
| B001-failure-evidence-foundation | U001 | R001、R002、R003、R007、R008、R009、NFR001、NFR002、NFR003、NFR004、NFR005、NFR006 | US001、US002、US003、US006、US007、US008、US009 | #431、#432、OpenTelemetry core correction |
| B002-subagent-status-audit | U002 | R004、R007、R008、R009、NFR004、NFR005 | US004、US006、US007、US008、US009 | #433 |
| B003-workflow-warning-traceability | U003 | R005、R006、R007、R009、NFR004、NFR006 | US005、US006、US007、US009 | #435、#431、#432、#433 |
