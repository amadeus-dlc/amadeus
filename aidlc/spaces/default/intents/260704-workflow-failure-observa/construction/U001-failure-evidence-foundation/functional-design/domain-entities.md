# Domain Entities: U001-failure-evidence-foundation

## 上流文脈

この domain-entities は、`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services` を入力として作成する。

U001 の Domain Model は、error evidence、hook drop evidence、OpenTelemetry core 計装、doctor output を扱う。

`components` は Shared Contracts、Error Audit、Hook Drop Doctor、Telemetry Core、Doctor Composition を定義している。

`component-methods` は `EvidenceRef`、`DiagnosticFinding`、`JsonStdoutContract`、`TelemetryScope` を共有語彙として扱う。

`services` は file-backed evidence surface と in-process module を前提にする。

## Entity Catalog

| Entity | Kind | Responsibility |
|---|---|---|
| `CommandExecution` | Entity | command name、args、stage、Intent ref、stdout contract を束ねる。 |
| `ErrorEvidence` | Value Object | tool、command、error detail、classification を保持する。 |
| `AuditWriteResult` | Value Object | audit append の success、no-op、failed を返す。 |
| `HookDropEntry` | Value Object | `.drops` の timestamp と reason を表す。 |
| `HookDropSummary` | Value Object | hook name、drop count、latest timestamp、latest reason を表す。 |
| `DiagnosticFinding` | Value Object | doctor に表示する status、label、detail、fix を表す。 |
| `TelemetryFacade` | Service Entity | no-op default と test exporter seam の facade を表す。 |
| `TelemetryScope` | Value Object | command span lifecycle を表す。 |
| `DoctorOutputModel` | Entity | standard section と verbose detail を分離して保持する。 |
| `EvidenceRef` | Value Object | audit、drops file、Intent artifact、test result への参照を表す。 |

## Relationships

`CommandExecution` は 0 個以上の `ErrorEvidence` を生成する。

`ErrorEvidence` は `AuditWriteResult` を通じて audit に append される。

`HookDropEntry` は hook name ごとに `HookDropSummary` へ集約される。

`HookDropSummary` は `DiagnosticFinding` に変換される。

`DiagnosticFinding` は `DoctorOutputModel` の standard section または verbose detail に入る。

`TelemetryFacade` は `CommandExecution` から `TelemetryScope` を開始する。

`TelemetryScope` は `ErrorEvidence` と doctor metrics を記録できる。

`EvidenceRef` は U003 が read-only evidence として参照する。

## Lifecycle States

| Entity | States |
|---|---|
| `CommandExecution` | started、reported、errored、completed |
| `ErrorEvidence` | captured、audit-pending、audit-written、audit-skipped、audit-failed |
| `HookDropEntry` | raw、parsed、malformed |
| `HookDropSummary` | empty、summarized、warning |
| `TelemetryFacade` | no-op、test-exporter、configured-exporter |
| `TelemetryScope` | opened、recorded、closed |
| `DoctorOutputModel` | collected、composed、rendered |

## Aggregate Candidates

`FailureEvidenceAggregate` は `CommandExecution`、`ErrorEvidence`、`AuditWriteResult` をまとめる。

この Aggregate の不変条件は、stdout JSON contract を壊さず error evidence を append-only にすることである。

`DoctorEvidenceAggregate` は `HookDropEntry`、`HookDropSummary`、`DiagnosticFinding`、`DoctorOutputModel` をまとめる。

この Aggregate の不変条件は、malformed input でも doctor が non-crashing であることである。

`TelemetryInstrumentationAggregate` は `TelemetryFacade` と `TelemetryScope` をまとめる。

この Aggregate の不変条件は、明示設定なしに network export しないことである。

## Interaction Patterns

AI-DLC CLI Tooling Service は `CommandExecution` を作る。

Evidence Recording Service は `ErrorEvidence` と `AuditWriteResult` を扱う。

Doctor Diagnostic Service は `HookDropSummary` と `DiagnosticFinding` を扱う。

Telemetry Core Service は `TelemetryFacade` と `TelemetryScope` を扱う。

component 間は typed in-process call で連携し、shared mutable module state を使わない。

## Review

Verdict: READY

Reviewer: aidlc-architecture-reviewer-agent

Entity は `component-methods` の public interface と対応している。

Aggregate candidate は後続実装で module 境界へ落とせる粒度であり、過剰な deployable service を導入していない。
