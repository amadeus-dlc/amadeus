# Requirements

## Intent Analysis

この Requirements Analysis は、`intent-statement`、`scope-document`、`team-practices` を上流成果物として読む。

この Intent の目的は、Amadeus DLC の workflow 失敗が会話ログだけに残る状態をなくし、audit、doctor、OpenTelemetry core 計装、deterministic verification から追跡できるようにすることである。

対象は Issue #431、#432、#433、#435 と OpenTelemetry core 計装である。

`intent-statement` は、error directive、未捕捉例外、hook drop、subagent 完了イベント、conductor 自己申告に依存しない失敗補足を 1 つの失敗可観測性改善として扱う。

`scope-document` は、OpenTelemetry collector、dashboard、常時ネットワーク送信を除外し、`.agents/aidlc/tools` の TypeScript CLI に no-op default の core 計装を入れる判断を確定している。

`team-practices` は、最初の Bolt を #431 engine error audit、#432 hook drop doctor、OpenTelemetry no-op default 計装の縦断 slice にする方針を確定している。

今回の Requirement は、信号単位を主軸にし、Issue と Bolt 候補を紐づける。

## Completeness Analysis

| Dimension | Coverage | Result |
|---|---|---|
| Functional requirements | audit、doctor、subagent status、warning、telemetry、verification を Requirement 化した。 | Covered |
| Non-functional requirements | stdout JSON 非干渉、no-op default 非送信、deterministic test、TypeScript strict、parity を Requirement 化した。 | Covered |
| User scenarios | Maintainer、Agent、Reviewer が失敗根拠を追跡する scenario を Requirement に反映した。 | Covered |
| Business context | AI-DLC が重く、失敗の証拠欠落が原因分析と PR 監視を高コストにする課題を反映した。 | Covered |
| Technical context | `.agents/aidlc/tools`、audit taxonomy、`.aidlc-hooks-health/*.drops`、runtime graph、parity lock を制約として反映した。 | Covered |
| Quality attributes | testability、maintainability、audit integrity、observability、determinism を明示した。 | Covered |

回答はすべて推奨選択肢 `E` であり、回答間の矛盾はない。

OpenTelemetry core 計装は core scope であり、collector と dashboard は optional scope である。

この境界は `scope-document` と `team-practices` に一致する。

## Requirement Matrix

| ID | Requirement | Type | Priority | Source | Issue | Bolt candidate |
|---|---|---|---|---|---|---|
| R001-error-audit | engine error directive と `aidlc-orchestrate.ts` top-level catch を `ERROR_LOGGED` として追跡する。 | Functional | Must | `intent-statement`, `scope-document` | #431 | B001 |
| R002-hook-drop-doctor | `.aidlc-hooks-health/*.drops` を `doctor` が読み、hook drop を運用者に表面化する。 | Functional | Must | `intent-statement`, `scope-document`, `team-practices` | #432 | B001 |
| R003-otel-core | `.agents/aidlc/tools` の command、error、directive/report、doctor metrics を OpenTelemetry core 計装の境界にする。 | Functional | Must | `scope-document`, `team-practices` | User correction | B001 |
| R004-subagent-status | `SUBAGENT_COMPLETED` で成功失敗を区別し、区別不能な場合は推測せず `UNKNOWN` または判断記録を残す。 | Functional | Must | `intent-statement`, `scope-document` | #433 | B002 |
| R005-conductor-independent-warning | conductor 自己申告に依存しない失敗候補を `doctor` warning として表面化する。 | Functional | Must | `intent-statement`, `scope-document` | #435 | B003 |
| R006-parity-boundary | parity lock 対象は adapter または wrapper を先に検討し、不可避な変更は upstream contribution または人間承認付き例外として記録する。 | Constraint | Must | `intent-statement`, `scope-document`, `team-practices` | #431, #432, #433, #435 | B001-B003 |
| R007-verification-evidence | deterministic test、Intent validator、`npm run test:all`、parity、stdout JSON 非干渉、OpenTelemetry no-op default 非送信を検証証拠にする。 | Verification | Must | `scope-document`, `team-practices` | #431, #432, #433, #435 | B001-B003 |
| R008-audit-taxonomy-integrity | 既存 audit event を削除または改名せず、必要な追加は taxonomy と emitter の対応を保つ。 | Constraint | Must | `scope-document`, `team-practices` | #431, #433 | B001-B002 |
| R009-pr-readiness-trace | PR 説明または Intent artifacts から Issue、Requirement、検証結果、例外理由を追跡できるようにする。 | Process | Must | `team-practices` | #431, #432, #433, #435 | B001-B003 |

## Functional Requirements

### R001-error-audit

System shall record engine error directive and `aidlc-orchestrate.ts` top-level catch as `ERROR_LOGGED`.

The `ERROR_LOGGED` audit row shall include at least tool name, command context, and human-readable error detail.

The implementation shall preserve the existing stdout JSON directive/report contract.

If an error directive is emitted, the workflow audit shall contain enough information to connect the user-visible error with the failing command path.

If `aidlc-orchestrate.ts` throws before normal directive emission, the workflow audit shall contain `ERROR_LOGGED` unless no active workflow record exists.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R001-AC1 | Given an active workflow exists, when `aidlc-orchestrate.ts next` emits an error directive for a deterministic failure, then the active audit contains an `ERROR_LOGGED` row. |
| R001-AC2 | Given an active workflow exists, when `aidlc-orchestrate.ts` exits through top-level catch, then the active audit contains an `ERROR_LOGGED` row. |
| R001-AC3 | Given a caller expects JSON on stdout, when an error is logged, then stdout remains valid for the directive/report contract and diagnostic text does not pollute stdout. |
| R001-AC4 | Given audit emission itself fails, when the CLI exits with an error, then the user still receives the existing JSON error envelope and the process does not recurse. |

Verification evidence:

- deterministic test for error directive audit emission.
- deterministic test for top-level catch audit emission.
- stdout JSON parse test.
- `npm run typecheck`.

### R002-hook-drop-doctor

System shall surface hook drop counters from `.aidlc-hooks-health/*.drops` in `doctor`.

The standard doctor output shall show hook name, drop count, latest timestamp, and latest reason.

Verbose output may show full drop history, but standard output shall stay concise.

Malformed or unreadable drop files shall become a doctor warning and shall not crash doctor.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R002-AC1 | Given `.aidlc-hooks-health/aidlc-example.drops` contains multiple lines, when `doctor` runs, then it shows hook name, count, latest timestamp, and latest reason. |
| R002-AC2 | Given no `.drops` files exist, when `doctor` runs, then it reports no hook drop warning for this check. |
| R002-AC3 | Given a malformed `.drops` file exists, when `doctor` runs, then it reports a warning and continues remaining checks. |
| R002-AC4 | Given verbose output is requested, when drop history exists, then full entries are available without cluttering standard output. |

Verification evidence:

- deterministic fixture for `.aidlc-hooks-health/*.drops`.
- doctor output assertion.
- no-crash assertion for malformed input.

### R003-otel-core

System shall provide OpenTelemetry core 計装 for `.agents/aidlc/tools` TypeScript CLI.

Core 計装 shall include command span, error span, directive/report span, and doctor metrics.

The default behavior shall be no-op.

No exporter shall send telemetry unless the user explicitly configures exporter environment variables.

OpenTelemetry 計装 shall not write diagnostic text to stdout paths that are part of JSON directive/report contracts.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R003-AC1 | Given no OpenTelemetry exporter environment variable is configured, when an AI-DLC CLI command runs, then no network export is attempted. |
| R003-AC2 | Given a command starts and exits, when instrumentation is enabled, then a command span can be observed through a test exporter or in-memory exporter. |
| R003-AC3 | Given an error directive or thrown error occurs, when instrumentation is enabled, then an error span records the failure without changing stdout JSON. |
| R003-AC4 | Given `next` and `report` are run, when instrumentation is enabled, then directive/report span attributes allow the pair to be correlated. |
| R003-AC5 | Given `doctor` reads hook drops and warnings, when metrics are collected through a test meter, then hook drop count and warning count are observable. |

Verification evidence:

- in-memory or test exporter assertions.
- no-op default no-send test.
- stdout JSON parse test.
- typecheck.

### R004-subagent-status

System shall distinguish subagent success and failure in `SUBAGENT_COMPLETED` when a trustworthy status is available.

If hook input does not provide a trustworthy status, system shall not infer status from free text.

The fallback shall record `UNKNOWN` or a documented decision that the source event is indistinguishable.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R004-AC1 | Given hook input contains a trustworthy success status, when `SUBAGENT_COMPLETED` is emitted, then the audit row includes success status. |
| R004-AC2 | Given hook input contains a trustworthy failure status, when `SUBAGENT_COMPLETED` is emitted, then the audit row includes failure status. |
| R004-AC3 | Given hook input contains no trustworthy status, when `SUBAGENT_COMPLETED` is emitted, then the audit row does not infer from message text and records `UNKNOWN` or an equivalent documented outcome. |
| R004-AC4 | Given downstream analysis reads audit, when it groups subagent outcomes, then success, failure, and unknown are distinguishable. |

Verification evidence:

- hook input fixture for success.
- hook input fixture for failure.
- hook input fixture for missing status.
- audit taxonomy compatibility check.

### R005-conductor-independent-warning

System shall surface failure candidates that do not depend on conductor self-reporting.

The MVP shall cover run-stage and report mismatch, in-flight stage abandonment, and runtime graph versus audit contradiction.

The result shall be a `doctor` warning, not a blocking workflow error.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R005-AC1 | Given a stage has produced artifacts but no matching report transition exists, when `doctor` runs, then it warns about run-stage/report mismatch. |
| R005-AC2 | Given a stage is in-flight beyond the detectable boundary with no pending question or gate, when `doctor` runs, then it warns about possible abandonment. |
| R005-AC3 | Given runtime graph memory or audit references contradict recorded stage state, when `doctor` runs, then it warns without changing state. |
| R005-AC4 | Given a warning is detected, when `doctor` exits, then the warning is visible but does not mark the workflow failed by itself. |

Verification evidence:

- deterministic state/audit fixtures.
- doctor warning assertion.
- non-mutating doctor assertion.

### R006-parity-boundary

System shall respect parity lock boundaries before changing engine files.

The implementation shall first evaluate whether adapter or wrapper code can satisfy the Requirement without changing locked files.

If a locked file change is unavoidable, the Intent artifact or PR description shall record whether the path is upstream contribution or human-approved exception.

`engineFileExceptions` shall not be changed without explicit human approval.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R006-AC1 | Given a Requirement can be satisfied outside parity lock, when design is produced, then the selected path uses adapter or wrapper. |
| R006-AC2 | Given a locked file must change, when PR readiness is assessed, then the rationale names upstream contribution or human-approved exception. |
| R006-AC3 | Given no explicit human approval exists, when implementing this Intent, then `engineFileExceptions` is not modified. |
| R006-AC4 | Given parity fails, when verification is summarized, then the failure reason and intended resolution path are traceable. |

Verification evidence:

- parity result.
- Intent decision note or PR description.
- diff check showing no unauthorized `engineFileExceptions` edit.

### R007-verification-evidence

System shall provide deterministic verification for every Requirement in this stage.

Verification shall include targeted tests, `npm run typecheck`, Intent validator, `npm run test:all`, parity result, stdout JSON non-interference, and OpenTelemetry no-op default no-send.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R007-AC1 | Given implementation is ready for PR, when verification is summarized, then every Requirement R001-R006 has at least one deterministic evidence item. |
| R007-AC2 | Given stdout JSON contract is part of a CLI path, when tests run, then JSON parse assertions cover telemetry and error paths. |
| R007-AC3 | Given OpenTelemetry is unconfigured, when tests run, then no-send behavior is asserted. |
| R007-AC4 | Given Intent artifacts were updated, when validator runs against this Intent, then the validator result is recorded. |

Verification evidence:

- target test output.
- `npm run typecheck`.
- Amadeus validator result for `260704-workflow-failure-observa`.
- `npm run test:all` result.
- parity result.

### R008-audit-taxonomy-integrity

System shall preserve audit taxonomy integrity while adding failure observability.

Existing audit event names shall not be deleted or renamed.

New fields shall be additive unless a separate approved compatibility decision exists.

Emitter documentation shall match the implementation path.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R008-AC1 | Given `ERROR_LOGGED` is used, when audit taxonomy is inspected, then required fields and emitter path match implementation. |
| R008-AC2 | Given `SUBAGENT_COMPLETED` gains status, when existing audit readers read old rows, then missing status remains valid. |
| R008-AC3 | Given a new field is added, when documentation is updated, then the field is described without renaming the event. |

Verification evidence:

- audit taxonomy diff review.
- deterministic audit fixture for old and new rows.
- typecheck.

### R009-pr-readiness-trace

System shall make PR readiness traceable from Issue and Intent artifacts.

The PR description or Intent artifact shall link Issue #431, #432, #433, #435, Requirement IDs, verification results, and any parity exception rationale.

Acceptance criteria:

| AC | Scenario |
|---|---|
| R009-AC1 | Given PR is prepared, when reviewer reads the PR description, then each target Issue maps to at least one Requirement. |
| R009-AC2 | Given verification has run, when reviewer reads the PR description or Intent artifact, then test results and unresolved parity state are visible. |
| R009-AC3 | Given scope is constrained, when reviewer checks out-of-scope items, then collector, dashboard, cloud infrastructure, and `skills/` direct edits are excluded. |

Verification evidence:

- PR description checklist.
- Intent traceability section.
- validator pass for artifact structure.

## Non-Functional Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| NFR001-json-contract | CLI stdout JSON contract shall remain parseable for directive/report commands. | Tests parse stdout as JSON on success and error paths where stdout is expected to contain JSON. |
| NFR002-no-op-default | OpenTelemetry shall be no-op by default. | Tests verify no exporter is active and no network send is attempted without explicit configuration. |
| NFR003-determinism | Verification shall be deterministic and not require a live collector or dashboard. | Tests use local fixtures, in-memory exporter, or test exporter only. |
| NFR004-type-safety | TypeScript changes shall pass strict typecheck. | `npm run typecheck` passes. |
| NFR005-audit-integrity | Audit additions shall be append-only and taxonomy-compatible. | Existing event names remain valid and old audit rows remain readable. |
| NFR006-operational-clarity | `doctor` warnings shall be concise by default and actionable enough for Maintainer or Agent. | Standard output includes label and latest reason; details are available through verbose path if implemented. |

## Constraints

`skills/` is a distribution boundary and shall not be edited directly for this Intent.

`.coderabbit.yml` and `.coderabbit.yaml` shall not be changed without explicit human permission.

OpenTelemetry collector, dashboard, cloud infrastructure, and always-on network export are out of scope.

Existing audit event names shall not be deleted or renamed.

Changes to parity lock targets shall follow adapter or wrapper first, upstream contribution second, and human-approved exception only when unavoidable.

`engineFileExceptions` shall not be changed without explicit human approval.

stdout JSON paths shall not receive telemetry diagnostics, debug logs, or human-readable noise.

## Assumptions

The active Intent record is `260704-workflow-failure-observa`.

The implementation target is the Amadeus repository under the current target workspace.

The relevant CLI implementation surface is `.agents/aidlc/tools`.

The active scope is `mvp`, depth is `Comprehensive`, and test strategy is `Comprehensive`.

OpenTelemetry core 計装 can be tested locally without collector or dashboard.

If subagent hook input lacks a trustworthy status field, `UNKNOWN` is more correct than inference from text.

## Out of Scope

OpenTelemetry collector deployment is out of scope.

OpenTelemetry dashboard creation is out of scope.

Cloud infrastructure for observability is out of scope.

Always-on network telemetry export is out of scope.

Direct edits under `skills/` are out of scope.

Unauthorized `.coderabbit.yml` or `.coderabbit.yaml` changes are out of scope.

Audit event deletion or rename is out of scope.

## Traceability

| Requirement | Issue or source | Scope item | Verification |
|---|---|---|---|
| R001-error-audit | #431 | SCOPE-001 | deterministic error audit test, stdout JSON parse test |
| R002-hook-drop-doctor | #432 | SCOPE-002 | doctor hook drop fixture |
| R003-otel-core | User correction | SCOPE-005 | no-op default test, in-memory telemetry test |
| R004-subagent-status | #433 | SCOPE-003 | hook fixture matrix |
| R005-conductor-independent-warning | #435 | SCOPE-004 | doctor warning fixture |
| R006-parity-boundary | Scope constraint | SCOPE-006 | parity result and exception rationale |
| R007-verification-evidence | Scope evidence | SCOPE-006 | validator, `npm run test:all`, parity |
| R008-audit-taxonomy-integrity | Audit constraint | SCOPE-001, SCOPE-003 | taxonomy compatibility check |
| R009-pr-readiness-trace | `team-practices` | SCOPE-006 | PR description or Intent artifact checklist |

## Open Questions

未解決の Requirements-level question はない。

Subagent hook input に信頼できる status が存在するかは、Functional Design または Code Generation で実装対象コードを確認して判断する。

その確認結果は R004 の `UNKNOWN` fallback によって Requirement をブロックしない。

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-04T13:31:22+09:00
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | None | None | None | None |

### Summary

Requirements は、上流成果物、Q&A の回答、Issue、Scope item、検証証拠へ追跡できる形で整理されている。
各 Requirement と NFR は受け入れ条件または測定可能な検証方法を持ち、User Stories、Units、Tests は推測なしに次工程へ進められる。
