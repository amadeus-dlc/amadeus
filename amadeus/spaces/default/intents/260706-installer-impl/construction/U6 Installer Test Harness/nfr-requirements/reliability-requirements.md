# Reliability Requirements — U6 Installer Test Harness

> Stage: construction / nfr-requirements  
> Unit: U6 Installer Test Harness  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U6 reliability means the test harness produces deterministic, actionable evidence for U1 through U5 contracts. A reliable test harness fails for real installer regressions, avoids flakes from live services or host paths, and hands stable blocking commands to U7 CI.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| fake tag source | stable, prerelease, malformed, duplicate, and missing tags are deterministic | unit fixture |
| fake archive source | success, transient-then-success, and retry exhaustion are deterministic | adapter fixture |
| temp target builder | clean, manifest-installed, manual-or-unknown, partial, none, unsupported, and ambiguous states are reproducible | integration fixture |
| no-write branch | exit non-zero or no-write result leaves target unchanged | negative mutation test |
| backup-before-copy | backup records and filesystem state prove ordering | integration fixture |
| manifest write failure | copy succeeds, manifest failure is classified, future state is inspectable | fault fixture |
| verification failure | failed check names and exit code are stable | fault fixture |
| coverage registry | Must requirements without tests fail freshness check | registry fixture |

## Failure Handling

- Test helper failures must include fixture name, scenario name, and normalized target path.
- Fake ports must expose call history for failed assertions.
- Temp directory cleanup failure must be reported without hiding the original test failure.
- Snapshot mismatches must show normalized diffs.
- Coverage registry failures must name the missing or stale requirement/story mapping.
- Smoke command failures must include command, exit code, stdout, and stderr with secrets scrubbed.

## Flake Prevention

The following invariants are mandatory:

- deterministic suites do not call live GitHub, npm, or release credentials.
- tests do not rely on wall-clock timestamps except through injectable clocks.
- tests do not depend on absolute host paths.
- tests do not share mutable temp targets.
- snapshots normalize temp roots and volatile values.
- fake ports make retries and failures explicit rather than timing-dependent.
- CI commands return stable non-zero exits for failures.

## Portability Reliability

U6 must satisfy `requirements.md` NFR-004 for macOS, Linux, and Windows-compatible shells where Bun is available.

| Surface | Requirement | Verification |
|---|---|---|
| path separators | fixture builders use platform path APIs | portability fixture |
| paths with spaces | temp target tests include spaces in root paths | integration fixture |
| executable smoke commands | command invocation avoids POSIX-only shell assumptions where practical | smoke fixture |
| snapshots | separators and temp roots normalized | snapshot fixture |
| backup names | portable backup names from U4/U5 cases are asserted | integration fixture |

## Observability And Diagnostics

- Coverage registry output must be readable by humans and parsable by U7 CI.
- Failed tests must identify the requirement/story mapping where available.
- Fake port diagnostics must include call sequence for ordering-sensitive failures.
- Smoke command diagnostics must preserve stdout/stderr separation.
- Test logs must show whether a failure came from unit, integration, smoke, snapshot, registry, or ratchet checks.

## Upstream Coverage

- `business-logic-model.md`: fixture workflow, coverage registry workflow, and failure modes define reliability expectations.
- `business-rules.md`: test matrix and invariants define required reliability evidence.
- `requirements.md`: FR-001 through FR-016 and NFR-001 through NFR-006 define the contracts U6 must prove.
- `technology-stack.md`: Bun-based CI and test commands define execution environment.

