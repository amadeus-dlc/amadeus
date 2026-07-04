# Component Methods

## 上流文脈

この component-methods は、`requirements`、`stories`、`team-practices` を入力として作成する。

`requirements` は、audit、doctor、OpenTelemetry core 計装、subagent status、conductor-independent warning、verification evidence、parity boundary、PR readiness traceability を定義している。

`stories` は、各 component が Maintainer、Agent、Reviewer のどの判断を支えるかを定義している。

`team-practices` は、stdout JSON 契約、deterministic test、TypeScript strict、parity lock、collector と dashboard の任意境界を定義している。

`architecture` と `component-inventory` は brownfield 時の任意入力であり、既存 method と衝突する場合はこの interface を adapter で吸収する。

## Method 設計方針

method は public interface の粒度だけを書く。

詳細な business rule は Functional Design で扱う。

戻り値は、throw だけに依存せず、diagnostic result を返せる形にする。

stdout JSON 契約を持つ command では、method が直接 stdout に診断文を書かない。

## Implementation Mapping

| Component | Method group | Logical service | Primary ADR |
|---|---|---|---|
| C001 Shared Contracts | Shared Contracts | S001 AI-DLC CLI Tooling Service | ADR-001 |
| C002 Error Audit | Error Audit Methods | S002 Evidence Recording Service | ADR-003 |
| C003 Hook Drop Doctor | Hook Drop Doctor Methods | S003 Doctor Diagnostic Service | ADR-003 |
| C004 Telemetry Core | Telemetry Core Methods | S004 Telemetry Core Service | ADR-002 |
| C005 Subagent Status | Subagent Status Methods | S002 Evidence Recording Service | ADR-003 |
| C006 Conductor Warning | Conductor Warning Methods | S003 Doctor Diagnostic Service | ADR-005 |
| C007 Verification Traceability | Verification Traceability Methods | S005 Verification Traceability Service | ADR-004 |
| C008 Doctor Composition | Doctor Composition Methods | S003 Doctor Diagnostic Service | ADR-005 |

この対応表により、各 method group の実装先 component と呼び出し元 logical service を一意にする。

## Shared Contracts

### 型

| Type | Purpose |
|---|---|
| `EvidenceRef` | audit、state、runtime graph、drops file、Intent artifact、PR checklist への参照を表す。 |
| `DiagnosticStatus` | `ok`、`warning`、`error`、`unknown` を表す。 |
| `DiagnosticFinding` | doctor に表示する finding を表す。 |
| `JsonStdoutContract` | stdout が JSON 専用か、人間向け出力を許すかを表す。 |
| `TelemetryScope` | command span と metric recording の lifecycle を表す。 |

## Error Audit Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `recordErrorDirective(input)` | command context、error directive、workflow record ref | `AuditWriteResult` | audit write failure を再帰させず、error result にする。 |
| `recordTopLevelCatch(input)` | command context、caught error、workflow record ref | `AuditWriteResult` | active workflow がない場合は no-op result にする。 |
| `buildErrorLoggedFields(input)` | tool name、command、error detail | `AuditFields` | required field 不足を validation error にする。 |

### 目的

`recordErrorDirective` は R001-AC1 を支える。

`recordTopLevelCatch` は R001-AC2 を支える。

`buildErrorLoggedFields` は R008 の taxonomy integrity を支える。

## Hook Drop Doctor Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `readHookDropFiles(input)` | health directory path | `HookDropFile[]` | missing directory は empty result にする。 |
| `summarizeHookDrops(input)` | parsed drop entries | `HookDropSummary[]` | malformed entry は warning finding にする。 |
| `buildHookDropFindings(input)` | summaries and parse warnings | `DiagnosticFinding[]` | doctor を crash させない。 |

### 目的

`readHookDropFiles` は `.aidlc-hooks-health/*.drops` を file-backed data surface として扱う。

`summarizeHookDrops` は standard output に必要な count と latest reason を返す。

`buildHookDropFindings` は malformed input を warning として表面化する。

## Telemetry Core Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `createTelemetryFacade(config)` | env、test exporter seam、clock | `TelemetryFacade` | exporter 未設定では no-op facade を返す。 |
| `startCommandSpan(input)` | command name、stage、intent ref | `TelemetryScope` | no-op mode では no-op scope を返す。 |
| `recordErrorSpan(input)` | scope、error detail、classification | `void` | telemetry failure は command stdout に出さない。 |
| `recordDoctorMetrics(input)` | warning count、hook drop count | `void` | metric failure は doctor warning を壊さない。 |

### 目的

`createTelemetryFacade` は no-op default と test exporter seam を支える。

`startCommandSpan` は command lifecycle の trace を支える。

`recordErrorSpan` は error directive と thrown error の可観測性を支える。

`recordDoctorMetrics` は doctor warning と hook drop metrics を支える。

## Subagent Status Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `classifySubagentStatus(input)` | hook payload | `SubagentOutcome` | trustworthy status がない場合は `unknown` を返す。 |
| `buildSubagentAuditFields(input)` | outcome、evidence ref | `AuditFields` | old row compatibility を保つ。 |
| `buildSubagentDoctorFinding(input)` | outcome | `DiagnosticFinding` | free text 推測を禁止する。 |

### 目的

`classifySubagentStatus` は success、failure、unknown を区別する。

`buildSubagentAuditFields` は `SUBAGENT_COMPLETED` の additive field を支える。

`buildSubagentDoctorFinding` は downstream analysis の誤分類を防ぐ。

## Conductor Warning Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `detectReportMismatch(input)` | state、audit、artifact refs | `DiagnosticFinding[]` | false positive は warning に留める。 |
| `detectAbandonedStage(input)` | state、questions、gate、artifact refs | `DiagnosticFinding[]` | pending question がある場合は warning を抑制する。 |
| `detectRuntimeGraphContradiction(input)` | runtime graph、audit、state | `DiagnosticFinding[]` | state を変更しない。 |

### 目的

これらの method は R005 の conductor-independent warning を支える。

doctor は warning を表示するだけで、workflow state を mutate しない。

## Verification Traceability Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `mapRequirementsToEvidence(input)` | R001-R009、test results、validator、parity | `RequirementEvidenceMap` | missing evidence は warning item にする。 |
| `buildPrReadinessChecklist(input)` | issues、requirements、verification、boundary | `PrReadinessChecklist` | unresolved parity を明示する。 |
| `recordParityDecision(input)` | locked-file diff、approval ref、resolution path | `ParityDecision` | approval ref がない場合は exception を作らない。 |

### 目的

`mapRequirementsToEvidence` は R007 を支える。

`buildPrReadinessChecklist` は R009 を支える。

`recordParityDecision` は R006 を支える。

## Doctor Composition Methods

| Method | Input | Output | Error handling |
|---|---|---|---|
| `composeDoctorSummary(input)` | diagnostic findings、telemetry status、links | `DoctorOutputModel` | section 欠落は validation warning にする。 |
| `renderStandardDoctorOutput(input)` | output model、terminal width | `string` | JSON stdout command では呼ばない。 |
| `renderVerboseDoctorOutput(input)` | output model、details | `string` | verbose only の情報を standard に混ぜない。 |

### 目的

`composeDoctorSummary` は section order を固定する。

`renderStandardDoctorOutput` は Maintainer が短時間で scan できる表示を返す。

`renderVerboseDoctorOutput` は詳細調査を補助する。

## Cross-Cutting Error Handling

method は、recoverable な問題を `DiagnosticFinding` として返す。

unrecoverable な起動失敗だけを throw 対象にする。

audit write failure と telemetry failure は、stdout JSON 契約を壊さない。

collector、dashboard、cloud infrastructure は method の入出力に含めない。

## Traceability

| Method group | Requirements | Stories |
|---|---|---|
| C002 Error Audit Methods | R001, R008 | US001 |
| C003 Hook Drop Doctor Methods | R002 | US002 |
| C004 Telemetry Core Methods | R003, NFR002, NFR003 | US003 |
| C005 Subagent Status Methods | R004, R008 | US004 |
| C006 Conductor Warning Methods | R005 | US005 |
| C007 Verification Traceability Methods | R006, R007, R009 | US006, US007, US009 |
| C008 Doctor Composition Methods | R002, R003, R005, R009 | US002, US003, US005, US009 |
