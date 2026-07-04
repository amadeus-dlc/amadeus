# Services

## 上流文脈

この services design は、`requirements`、`stories`、`team-practices` を入力として作成する。

`requirements` は、`.agents/aidlc/tools` の TypeScript CLI を対象にした failure observability を定義している。

`stories` は、Maintainer、Agent、Reviewer が audit、doctor、OpenTelemetry core、Intent artifact、PR evidence を辿る journey を定義している。

`team-practices` は、collector、dashboard、cloud infrastructure、外部送信を core 計装の必須 gate に含めない方針を定義している。

`architecture` と `component-inventory` は brownfield 時の任意入力であり、既存 service が確認できる場合はこの logical service 境界へ対応付ける。

## Service 方針

この Intent では、新しい runtime service を追加しない。

ここでいう service は、deployable service ではなく、`.agents/aidlc/tools` 内で呼び出される logical service boundary である。

component は同期的な in-process call で連携する。

network call、message broker、gRPC、cloud runtime は使わない。

## Logical Service 一覧

| ID | Logical service | Responsibility | Runtime form |
|---|---|---|---|
| S001 | AI-DLC CLI Tooling Service | `next`、`report`、`doctor` などの command 実行入口を束ねる。 | Bun/TypeScript CLI |
| S002 | Evidence Recording Service | error audit、subagent status、parity decision を audit と artifact に記録する。 | in-process module |
| S003 | Doctor Diagnostic Service | hook drops、conductor warning、engine error、telemetry status を doctor output に変換する。 | in-process module |
| S004 | Telemetry Core Service | no-op default の OpenTelemetry facade と test exporter seam を提供する。 | in-process module |
| S005 | Verification Traceability Service | Requirement、Issue、verification、PR checklist を接続する。 | in-process module |

## Component and Method Mapping

| Logical service | Components used | Method groups | Primary ADR |
|---|---|---|---|
| S001 AI-DLC CLI Tooling Service | C001, C002, C004 | Shared Contracts, Error Audit Methods, Telemetry Core Methods | ADR-001, ADR-002 |
| S002 Evidence Recording Service | C001, C002, C005 | Shared Contracts, Error Audit Methods, Subagent Status Methods | ADR-003 |
| S003 Doctor Diagnostic Service | C001, C002, C003, C004, C005, C006, C008 | Hook Drop Doctor Methods, Conductor Warning Methods, Doctor Composition Methods, read adapters for Error Audit and Subagent Status, Telemetry Core Methods | ADR-003, ADR-005 |
| S004 Telemetry Core Service | C001, C004 | Shared Contracts, Telemetry Core Methods | ADR-002 |
| S005 Verification Traceability Service | C001, C002, C005, C007 | Verification Traceability Methods, read-only evidence access for Error Audit and Subagent Status | ADR-004 |

S005 は C002 と C005 の evidence を読むだけで、C002 または C005 から呼ばれない。

## Service 詳細

### S001 AI-DLC CLI Tooling Service

この service は、既存 CLI command の entrypoint を扱う。

対象 command は `aidlc-orchestrate.ts`、`aidlc-state.ts`、`aidlc-log.ts`、`aidlc-sensor.ts`、`doctor` 相当の utility entrypoint である。

この service は stdout JSON contract を持つ command と human-readable output を持つ command を分ける。

telemetry と audit は adapter を通して呼び出す。

### S002 Evidence Recording Service

この service は、`ERROR_LOGGED`、`SUBAGENT_COMPLETED` status、parity decision、verification evidence を記録する。

file-backed audit と Intent artifact を主要 data surface とする。

audit taxonomy への変更は additive にし、既存 event 名を削除または改名しない。

audit write failure は再帰させない。

### S003 Doctor Diagnostic Service

この service は、doctor の diagnostic model を構築する。

input は state、runtime graph、audit、`.aidlc-hooks-health/*.drops`、telemetry status である。

output は standard doctor output と verbose detail である。

doctor は state を変更しない。

### S004 Telemetry Core Service

この service は、OpenTelemetry core 計装の facade を提供する。

default は no-op である。

test exporter seam は deterministic test のために使う。

collector、dashboard、cloud export、always-on export はこの service の範囲外である。

### S005 Verification Traceability Service

この service は、R001-R009 と verification evidence の対応を整理する。

PR readiness checklist では、Issue、Intent、Requirement、test result、validator、parity、stdout JSON、OpenTelemetry no-op default を扱う。

この service は CI を実行しない。

CI 結果と reviewer comment が同時にある場合は、team-practices に従い CI failure を先に扱う。

## Communication Contracts

| From | To | Pattern | Contract |
|---|---|---|---|
| AI-DLC CLI Tooling Service | Evidence Recording Service | in-process call | typed command context と evidence ref |
| AI-DLC CLI Tooling Service | Telemetry Core Service | in-process call | command lifecycle context |
| Doctor Diagnostic Service | Evidence Recording Service | in-process read | audit and state refs |
| Doctor Diagnostic Service | Telemetry Core Service | in-process call | warning count and hook drop metrics |
| Verification Traceability Service | Evidence Recording Service | in-process read | audit rows and artifact refs |

## Lifecycle

CLI command の lifecycle は、command start、component call、evidence recording、telemetry recording、output rendering、exit の順である。

stdout JSON command は、output rendering で JSON 以外を stdout に出さない。

doctor command は、human-readable standard output を返してよい。

Telemetry Core Service は command lifecycle に追従し、default no-op のときは network export をしない。

## Scaling Characteristics

この設計は local CLI execution を対象にする。

horizontal scaling は設計対象ではない。

performance target は、doctor が local file reads と deterministic checks を短時間で終えることである。

large audit file や large drops file に対する最適化は、verbose detail と summary 集計の分離で扱う。

## AWS と Infrastructure

AWS runtime infrastructure はこの Intent の範囲外である。

collector deployment は設計しない。

dashboard hosting は設計しない。

cloud telemetry export infrastructure は設計しない。

production AWS topology は設計しない。

AWS Well-Architected の観点では、今回は cloud workload ではなく local tooling の operational excellence と observability boundary を設計対象にする。

## Traceability

| Logical service | Requirements | Stories | Notes |
|---|---|---|---|
| S001 | R001, R003, R007 | US001, US003, US007 | stdout JSON contract と command lifecycle |
| S002 | R001, R004, R006, R008 | US001, US004, US006, US008 | audit と evidence 記録 |
| S003 | R002, R005, NFR006 | US002, US005 | doctor warning と hook drop 表示 |
| S004 | R003, NFR002, NFR003 | US003 | no-op default と test exporter seam |
| S005 | R006, R007, R009 | US006, US007, US009 | PR readiness と verification traceability |
