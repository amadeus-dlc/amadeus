# Unit of Work Story Map

## 上流文脈

この unit-of-work-story-map は、`components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`、`stories` を入力として作成する。

`components` は、各 Unit が所有する component 境界を定義している。

`component-methods` は、story が実装へ落ちる method group を定義している。

`services` は、story の実装対象が deployable service ではなく `.agents/aidlc/tools` 内の logical service boundary であることを定義している。

`component-dependency` は、Unit 間の依存方向と read-only evidence consumer の境界を定義している。

`decisions` は、OpenTelemetry core 計装を core scope とし、collector と dashboard を optional scope にする判断を定義している。

`requirements` は、R001-R009 と NFR001-NFR006 の受け入れ条件を定義している。

`stories` は、US001-US009、Won't Have、Issue trace、verification evidence を定義している。

## Story Assignment 方針

各 Must Have story は少なくとも 1 つの Unit に割り当てる。

横断 story は、各 Unit の検証証拠と parity 境界に反映しつつ、最終 aggregation を U003 に寄せる。

Unit を小さくしすぎないため、US006、US007、US009 は独立 Unit にしない。

Won't Have story は Unit に含めず、scope guard として各 Unit の制約に反映する。

## Story Map

| Story | Requirement | Primary Unit | Supporting Unit | Assignment reason |
|---|---|---|---|---|
| US001 Engine error audit visibility | R001、R008 | U001-failure-evidence-foundation | U003-workflow-warning-traceability | `ERROR_LOGGED` は U001 が記録し、U003 が PR readiness evidence として読む。 |
| US002 Hook drop visibility in doctor | R002 | U001-failure-evidence-foundation | U003-workflow-warning-traceability | hook drop parsing と doctor output は U001 が作り、U003 が warning/evidence として接続する。 |
| US003 OpenTelemetry core instrumentation with no-op default | R003、NFR001、NFR002、NFR003 | U001-failure-evidence-foundation | U003-workflow-warning-traceability | telemetry facade と no-op default は U001 が作り、U003 が verification evidence に含める。 |
| US004 Subagent outcome classification | R004、R008 | U002-subagent-status-audit | U003-workflow-warning-traceability | outcome 分類と audit field は U002 が作り、U003 が read-only evidence として読む。 |
| US005 Conductor-independent doctor warning | R005、NFR006 | U003-workflow-warning-traceability | U001-failure-evidence-foundation | warning check は U003 が所有し、doctor output model は U001 の基盤を使う。 |
| US006 Parity boundary and exception evidence | R006 | U003-workflow-warning-traceability | U001、U002 | parity boundary は全 Unit の制約であり、exception evidence の集約は U003 が所有する。 |
| US007 Requirement-level verification evidence | R007 | U003-workflow-warning-traceability | U001、U002 | 各 Unit が evidence を作り、U003 が Requirement evidence map へ集約する。 |
| US008 Audit taxonomy compatibility | R008 | U002-subagent-status-audit | U001-failure-evidence-foundation | Error Audit の taxonomy は U001、Subagent Status の additive compatibility は U002 が扱う。 |
| US009 PR readiness traceability | R009 | U003-workflow-warning-traceability | U001、U002 | PR checklist と Intent artifact aggregation は U003 が所有する。 |

## Unit 内 Story Notes

### U001-failure-evidence-foundation

U001 は US001、US002、US003 を主に実装する。

U001 は US006、US007、US008、US009 のための evidence source を作る。

U001 の story は、error audit、hook drop doctor、OpenTelemetry no-op default を同じ CLI/tooling surface で検証する。

U001 は collector、dashboard、cloud infrastructure を含めない。

### U002-subagent-status-audit

U002 は US004 と US008 の subagent outcome 側を主に実装する。

U002 は US006、US007、US009 のために、parity boundary、deterministic verification、audit compatibility evidence を残す。

U002 は trustworthy status field がない入力を free text から推測しない。

U002 の出力は U003 が read-only evidence として参照する。

### U003-workflow-warning-traceability

U003 は US005、US006、US007、US009 を主に実装する。

U003 は U001 と U002 が残す evidence を読み、Requirement evidence map と PR readiness checklist へ接続する。

U003 は doctor warning を non-mutating に保つ。

U003 は CI 実行、merge 判断、state mutation を所有しない。

## Coverage Verification

| Requirement | Covered stories | Assigned Unit |
|---|---|---|
| R001-error-audit | US001 | U001 |
| R002-hook-drop-doctor | US002 | U001 |
| R003-otel-core | US003 | U001 |
| R004-subagent-status | US004 | U002 |
| R005-conductor-independent-warning | US005 | U003 |
| R006-parity-boundary | US006 | U003 with U001/U002 evidence |
| R007-verification-evidence | US007 | U003 with U001/U002 evidence |
| R008-audit-taxonomy-integrity | US001、US004、US008 | U001、U002 |
| R009-pr-readiness-trace | US009 | U003 with U001/U002 evidence |

## Won't Have Coverage

| Won't Have | Unit handling |
|---|---|
| WH001 OpenTelemetry collector deployment | Out of scope for all Units |
| WH002 observability dashboard | Out of scope for all Units |
| WH003 cloud infrastructure for telemetry export | Out of scope for all Units |
| WH004 network export by default | U001 enforces no-op default |
| WH005 `skills/` direct edits | Out of scope for all Units |
| WH006 `.coderabbit.yml` or `.coderabbit.yaml` bypass changes | Out of scope for all Units |

## Traceability

| Unit | Stories | Requirements | Verification focus |
|---|---|---|---|
| U001-failure-evidence-foundation | US001、US002、US003、US006、US007、US008、US009 | R001、R002、R003、R007、R008、R009 | audit fixture、doctor fixture、stdout JSON parse、OpenTelemetry no-op no-send |
| U002-subagent-status-audit | US004、US006、US007、US008、US009 | R004、R007、R008、R009 | hook status fixture matrix、old/new audit row compatibility |
| U003-workflow-warning-traceability | US005、US006、US007、US009 | R005、R006、R007、R009 | doctor warning fixture、non-mutating assertion、PR readiness checklist |
