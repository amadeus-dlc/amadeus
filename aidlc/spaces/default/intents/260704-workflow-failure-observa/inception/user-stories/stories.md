# User Stories

## Upstream Context

この user stories は、`requirements.md`、`team-practices.md`、`personas.md`、`user-stories-questions.md` を入力にして作成する。

`requirements.md` は、R001-R009 と NFR001-NFR006 を定義している。

`team-practices.md` は、最初の Bolt を #431 engine error audit、#432 hook drop doctor、OpenTelemetry no-op default 計装の縦断 slice にする方針を定義している。

`business-overview` と `component-inventory` は brownfield 時の optional context であり、この stories では既存の product context と implementation surface を補助的に確認する文脈として扱う。

回答では、observable failure signal と user journey を主軸にし、Requirement と Issue へ対応付ける方針が選ばれた。

## Story Map Summary

| Story | Persona | Journey | Priority | Bolt | Requirement | Issue or source |
|---|---|---|---|---|---|---|
| US001 | Maintainer, Agent | Record failure | Must Have | B001 | R001, R008 | #431 |
| US002 | Maintainer, Agent | Diagnose hook drop | Must Have | B001 | R002 | #432 |
| US003 | Maintainer, Agent | Observe core telemetry | Must Have | B001 | R003 | User correction |
| US004 | Agent, Reviewer | Classify subagent outcome | Must Have | B002 | R004, R008 | #433 |
| US005 | Maintainer, Agent | Detect conductor-independent failure | Must Have | B003 | R005 | #435 |
| US006 | Maintainer, Reviewer | Preserve parity boundary | Must Have | B001-B003 | R006 | #431, #432, #433, #435 |
| US007 | Maintainer, Reviewer | Verify implementation evidence | Must Have | B001-B003 | R007 | #431, #432, #433, #435 |
| US008 | Reviewer, Maintainer | Preserve audit taxonomy | Must Have | B001-B002 | R008 | #431, #433 |
| US009 | Reviewer, Maintainer | Prepare PR traceability | Must Have | B001-B003 | R009 | #431, #432, #433, #435 |

## Must Have Stories

### US001. Engine error audit visibility

Priority: Must Have.

Primary persona: Maintainer.

Supporting persona: Agent.

Story: As a Maintainer, I want engine error directives and `aidlc-orchestrate.ts` top-level catches to be recorded in audit, so that workflow failures can be diagnosed without relying on conversation history.

Requirement trace: R001-error-audit, R008-audit-taxonomy-integrity.

Issue trace: #431.

Bolt candidate: B001.

Acceptance criteria:

1. Given an active workflow exists, when `aidlc-orchestrate.ts next` emits an error directive, then the active audit contains an `ERROR_LOGGED` row with tool, command context, and human-readable detail.
2. Given an active workflow exists, when `aidlc-orchestrate.ts` exits through top-level catch, then the active audit contains an `ERROR_LOGGED` row unless no workflow record can be resolved.
3. Given a caller expects JSON on stdout, when the error audit path runs, then stdout remains valid for the directive or report contract.
4. Given audit emission fails, when the CLI exits, then it does not recurse and still returns the existing user-visible error envelope.

Verification evidence:

- deterministic test for error directive audit emission.
- deterministic test for top-level catch audit emission.
- stdout JSON parse test.
- `npm run typecheck`.

INVEST notes:

This story is independent enough to implement as the first error audit slice.

It is valuable because it gives Maintainer a durable failure record.

It is testable through audit fixtures and stdout parsing.

### US002. Hook drop visibility in doctor

Priority: Must Have.

Primary persona: Maintainer.

Supporting persona: Agent.

Story: As a Maintainer, I want `doctor` to surface `.aidlc-hooks-health/*.drops`, so that hook failures are visible during workflow diagnosis.

Requirement trace: R002-hook-drop-doctor.

Issue trace: #432.

Bolt candidate: B001.

Acceptance criteria:

1. Given `.aidlc-hooks-health/*.drops` contains entries, when `doctor` runs, then standard output shows hook name, drop count, latest timestamp, and latest reason.
2. Given no `.drops` files exist, when `doctor` runs, then it reports no hook drop warning for this check.
3. Given a malformed or unreadable `.drops` file exists, when `doctor` runs, then it emits a warning and continues remaining checks.
4. Given verbose output is requested, when drop history exists, then full entries are available without cluttering standard output.

Verification evidence:

- fixture for `.aidlc-hooks-health/*.drops`.
- doctor output assertion.
- malformed input no-crash assertion.

INVEST notes:

This story is independently useful because doctor can surface hook health before other warning classes exist.

It is negotiable around verbose formatting but not around concise standard output.

It is testable with local fixtures only.

### US003. OpenTelemetry core instrumentation with no-op default

Priority: Must Have.

Primary persona: Agent.

Supporting persona: Maintainer.

Story: As an Agent, I want `.agents/aidlc/tools` TypeScript CLI commands to have OpenTelemetry core 計装 with no-op default behavior, so that spans and metrics can be analyzed without requiring collector or dashboard setup.

Requirement trace: R003-otel-core, NFR001-json-contract, NFR002-no-op-default, NFR003-determinism.

Issue trace: user correction.

Bolt candidate: B001.

Acceptance criteria:

1. Given no exporter environment variable is configured, when an AI-DLC CLI command runs, then no network export is attempted.
2. Given instrumentation is enabled with a test exporter, when a command starts and exits, then a command span is observable.
3. Given an error directive or thrown error occurs, when instrumentation is enabled, then an error span records the failure without changing stdout JSON.
4. Given `next` and `report` run in sequence, when instrumentation is enabled, then span attributes allow directive and report correlation.
5. Given `doctor` reads warnings, when metrics are collected through a test meter, then warning count and hook drop count are observable.

Verification evidence:

- in-memory or test exporter assertions.
- no-op default no-send test.
- stdout JSON parse test.
- typecheck.

INVEST notes:

This story is a vertical slice because it covers command lifecycle, error path, doctor metric, and no-op export boundary together.

It is valuable because OpenTelemetry core 計装 is now part of the product core, while collector and dashboard remain optional.

It is testable without external services.

### US004. Subagent outcome classification

Priority: Must Have.

Primary persona: Agent.

Supporting persona: Reviewer.

Story: As an Agent, I want `SUBAGENT_COMPLETED` to distinguish success, failure, and unknown outcomes, so that downstream analysis does not infer status from unreliable text.

Requirement trace: R004-subagent-status, R008-audit-taxonomy-integrity.

Issue trace: #433.

Bolt candidate: B002.

Acceptance criteria:

1. Given hook input contains trustworthy success status, when `SUBAGENT_COMPLETED` is emitted, then the audit row includes success status.
2. Given hook input contains trustworthy failure status, when `SUBAGENT_COMPLETED` is emitted, then the audit row includes failure status.
3. Given hook input lacks trustworthy status, when `SUBAGENT_COMPLETED` is emitted, then the audit row records `UNKNOWN` or an equivalent documented outcome.
4. Given downstream analysis groups subagent outcomes, when it reads audit rows, then success, failure, and unknown are distinguishable.

Verification evidence:

- hook fixture for success.
- hook fixture for failure.
- hook fixture for missing status.
- audit taxonomy compatibility check.

INVEST notes:

This story is independent from B001 because it relies on hook input classification rather than engine error audit.

It is valuable because it prevents misleading failure analysis.

It is testable through deterministic hook fixtures.

### US005. Conductor-independent doctor warning

Priority: Must Have.

Primary persona: Maintainer.

Supporting persona: Agent.

Story: As a Maintainer, I want `doctor` to warn about failure candidates that do not depend on conductor self-reporting, so that abandoned or contradictory workflow states become visible.

Requirement trace: R005-conductor-independent-warning, NFR006-operational-clarity.

Issue trace: #435.

Bolt candidate: B003.

Acceptance criteria:

1. Given a stage has produced artifacts but no matching report transition exists, when `doctor` runs, then it warns about run-stage and report mismatch.
2. Given a stage appears in-flight without a pending question or approval gate, when `doctor` runs, then it warns about possible abandonment.
3. Given runtime graph memory or audit references contradict recorded state, when `doctor` runs, then it warns without mutating state.
4. Given a warning is detected, when `doctor` exits, then the warning is visible but does not mark the workflow failed by itself.

Verification evidence:

- deterministic state and audit fixtures.
- doctor warning assertion.
- non-mutating doctor assertion.

INVEST notes:

This story is independent because the warning can be added as a doctor check with fixtures.

It is valuable because it catches failures even when the conductor did not report them.

It is testable without external systems.

### US006. Parity boundary and exception evidence

Priority: Must Have.

Primary persona: Maintainer.

Supporting persona: Reviewer.

Story: As a Maintainer, I want parity lock decisions to be visible before merge, so that locked engine file changes are either avoided, upstreamed, or explicitly approved.

Requirement trace: R006-parity-boundary.

Issue trace: #431, #432, #433, #435.

Bolt candidate: B001-B003.

Acceptance criteria:

1. Given a Requirement can be satisfied outside parity lock, when design or implementation is produced, then adapter or wrapper path is selected first.
2. Given a locked file must change, when PR readiness is assessed, then the rationale names upstream contribution or human-approved exception.
3. Given no explicit human approval exists, when implementation proceeds, then `engineFileExceptions` is not modified.
4. Given parity fails, when verification is summarized, then the failure reason and intended resolution path are traceable.

Verification evidence:

- parity result.
- Intent decision note or PR description.
- diff check showing no unauthorized `engineFileExceptions` edit.

INVEST notes:

This story cuts across Bolts because parity may be encountered in any implementation slice.

It is valuable because it prevents hidden framework drift.

It is testable through parity output and diff inspection.

### US007. Requirement-level verification evidence

Priority: Must Have.

Primary persona: Maintainer.

Supporting persona: Reviewer.

Story: As a Maintainer, I want every core Requirement to have deterministic verification evidence, so that PR readiness can be assessed without manual reconstruction.

Requirement trace: R007-verification-evidence.

Issue trace: #431, #432, #433, #435.

Bolt candidate: B001-B003.

Acceptance criteria:

1. Given implementation is ready for PR, when verification is summarized, then every Requirement R001-R006 has at least one deterministic evidence item.
2. Given stdout JSON contract is part of a CLI path, when tests run, then JSON parse assertions cover success and error paths where JSON is expected.
3. Given OpenTelemetry is unconfigured, when tests run, then no-send behavior is asserted.
4. Given Intent artifacts were updated, when validator runs, then the validator result for `260704-workflow-failure-observa` is recorded.
5. Given repo-level verification is expected, when PR readiness is summarized, then `npm run test:all`, typecheck, validator, parity, stdout JSON, and no-op telemetry status are listed.

Verification evidence:

- target test output.
- `npm run typecheck`.
- Amadeus validator result.
- `npm run test:all` result.
- parity result.

INVEST notes:

This story is valuable because it turns scattered verification into a Maintainer-ready evidence set.

It is small enough when implemented as a traceability artifact and checklist update.

It is testable through artifact inspection and command output.

### US008. Audit taxonomy compatibility

Priority: Must Have.

Primary persona: Reviewer.

Supporting persona: Agent.

Story: As a Reviewer, I want audit event names and new fields to remain taxonomy-compatible, so that existing audit rows and downstream readers stay valid.

Requirement trace: R008-audit-taxonomy-integrity.

Issue trace: #431, #433.

Bolt candidate: B001-B002.

Acceptance criteria:

1. Given `ERROR_LOGGED` is used, when audit taxonomy is inspected, then required fields and emitter path match implementation.
2. Given `SUBAGENT_COMPLETED` gains status, when old audit rows are read, then missing status remains valid.
3. Given a new field is added, when documentation is updated, then the field is described without deleting or renaming the event.
4. Given an audit reader processes old and new rows, when compatibility is checked, then both forms are accepted.

Verification evidence:

- audit taxonomy diff review.
- deterministic audit fixture for old and new rows.
- typecheck.

INVEST notes:

This story is independent because it can be validated through taxonomy fixtures.

It is valuable because observability improvements must not break existing audit consumers.

It is testable through compatibility checks.

### US009. PR readiness traceability

Priority: Must Have.

Primary persona: Reviewer.

Supporting persona: Maintainer.

Story: As a Reviewer, I want PR description or Intent artifacts to link Issues, Requirements, verification results, and out-of-scope boundaries, so that review can focus on the actual change.

Requirement trace: R009-pr-readiness-trace.

Issue trace: #431, #432, #433, #435.

Bolt candidate: B001-B003.

Acceptance criteria:

1. Given a PR is prepared, when Reviewer reads the PR description, then each target Issue maps to at least one Requirement.
2. Given verification has run, when Reviewer reads the PR description or Intent artifact, then test results and unresolved parity state are visible.
3. Given scope is constrained, when Reviewer checks out-of-scope items, then collector, dashboard, cloud infrastructure, and `skills/` direct edits are explicitly excluded.
4. Given CI failure and review comments both exist, when PR monitoring starts, then CI failure is handled before review comments.

Verification evidence:

- PR description checklist.
- Intent traceability section.
- validator pass for artifact structure.
- PR monitoring note if applicable.

INVEST notes:

This story is valuable because it compresses review context into a traceable path.

It is independent enough to implement as a PR readiness artifact and checklist.

It is testable through artifact and PR description inspection.

## Won't Have Stories

| ID | Story | Reason |
|---|---|---|
| WH001 | As a Maintainer, I want an OpenTelemetry collector deployment. | Collector deployment is optional and outside core 計装 scope. |
| WH002 | As a Maintainer, I want an observability dashboard. | Dashboard creation is optional and outside this Intent. |
| WH003 | As an Agent, I want cloud infrastructure for telemetry export. | Cloud infrastructure is outside this Intent. |
| WH004 | As an Agent, I want telemetry to export over the network by default. | Always-on export violates no-op default. |
| WH005 | As an Agent, I want to edit `skills/` directly. | `skills/` is a distribution boundary for this Intent. |
| WH006 | As an Agent, I want to update `.coderabbit.yml` or `.coderabbit.yaml` to bypass review feedback. | Those files require explicit human permission and are out of scope. |

## Dependency and Priority Notes

B001 should include US001, US002, and US003 as the first delivery slice.

B001 proves durable failure audit, doctor visibility, and no-op telemetry instrumentation together.

B002 should include US004 and the audit taxonomy parts of US008.

B003 should include US005 and the remaining conductor-independent doctor warning behavior.

US006, US007, and US009 cut across all Bolts and should be updated as evidence accumulates.

All Must Have stories are in MVP scope because each maps to a core Requirement.

Won't Have stories prevent collector、dashboard、cloud infrastructure、always-on export、`skills/` direct edits、unauthorized `.coderabbit.yml` changes from drifting into implementation.

## Traceability Matrix

| Requirement | Covered by stories | Verification focus |
|---|---|---|
| R001-error-audit | US001 | `ERROR_LOGGED` audit fixtures and stdout JSON parse |
| R002-hook-drop-doctor | US002 | `.drops` fixture and doctor output assertion |
| R003-otel-core | US003 | no-op default no-send and in-memory exporter test |
| R004-subagent-status | US004 | hook status fixture matrix |
| R005-conductor-independent-warning | US005 | state and audit contradiction fixtures |
| R006-parity-boundary | US006 | parity result and exception rationale |
| R007-verification-evidence | US007 | test result, typecheck, validator, parity, stdout JSON, telemetry no-send |
| R008-audit-taxonomy-integrity | US001, US004, US008 | taxonomy compatibility and old/new audit row fixtures |
| R009-pr-readiness-trace | US009 | PR checklist and Intent traceability |

## INVEST Review

Every Must Have story has a defined persona and value statement.

Every Must Have story has acceptance criteria that can be converted into deterministic tests or artifact checks.

Story dependencies are explicit through Bolt candidate and traceability tables.

The stories avoid implementation-file granularity and remain connected to user-visible diagnosis, verification, and review outcomes.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-04T14:00:14+09:00
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Required action |
|---|---|---|---|---|
| 1 | None | `inception/user-stories/` | stage definition が要求する `user-stories-assessment.md`、`personas.md`、`stories.md` は揃っている。 | None |
| 2 | None | `user-stories-questions.md`, `personas.md`, `stories.md` | 回答 E の方針は、Maintainer primary、Agent と Reviewer supporting、observable failure signal と user journey 主軸、MoSCoW、検証証拠、Won't Have 境界に反映されている。 | None |
| 3 | None | `stories.md` | Must Have stories は Requirement、Issue または source、Bolt candidate、verification evidence に接続され、Traceability Matrix でも Requirement 単位の検証焦点を確認できる。 | None |
| 4 | None | `stories.md` | Acceptance criteria は Given/When/Then と検証証拠に分かれ、QA と実装者が deterministic test、fixture、validator、parity、artifact check へ変換できる。 | None |
| 5 | None | `stories.md` | Won't Have entries は collector、dashboard、cloud infrastructure、always-on export、`skills/` direct edits、unauthorized `.coderabbit.yml` changes を明示し、scope creep を防げる境界になっている。 | None |

### Summary

User Stories stage の成果物は、Maintainer の PR readiness 判断を primary outcome としながら、Agent の実行時証拠生成と Reviewer の追跡性確認を supporting outcome として扱えている。

各 Must Have story は上流 Requirement と Issue または user correction に接続され、B001-B003 の Bolt candidate と検証証拠も示されている。

Acceptance criteria は下流の QA と実装者が検証へ落とせる粒度であり、out-of-scope 境界も実装範囲の膨張を抑えるだけの具体性がある。

User Stories stage は次工程へ進める状態である。
