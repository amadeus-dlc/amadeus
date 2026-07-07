# Reliability Design — U6 Installer Test Harness

> Stage: construction / nfr-design  
> Unit: U6 Installer Test Harness

## Reliability Objectives

U6はU1-U5 contractsをdeterministicかつactionableに証明する。`reliability-requirements.md` の通り、test harnessはreal installer regressionsでfailし、live services、host paths、wall clock、shared temp stateによるflakeを避ける。

## Determinism Controls

| Surface | Design |
|---|---|
| tags | stable/prerelease/malformed/duplicate/missing tag fixturesをgenerated listで作る。 |
| archive | success/transient-then-success/retry exhaustionをfake portで固定する。 |
| time | backup timestampsとsnapshot timestampsは `FakeClockPort` から供給する。 |
| filesystem | per-test temp targetを作り、paths with spacesを含むportable fixturesを持つ。 |
| prompt | accept/decline/not-allowedを `FakePromptPort` で固定する。 |
| snapshots | temp roots、separators、timestampsをnormalizeする。 |
| coverage | registry freshnessとratchetでmissing/stale mappingsをfailにする。 |

## Required Evidence Matrix

| Area | Evidence |
|---|---|
| U1 package shell | help、`init` rejection、duplicate harness、unsupported harness、Bun-required message |
| U2 source | SemVer ordering、duplicate tag、prerelease default exclusion、retry exhaustion、missing `dist/<harness>/` |
| U3 target | manifest-installed、manual-or-unknown、partial、none、unsupported、ambiguous、unknown md5 |
| U4 planning | conflict no-write、force backup、version branches、partial + force、source-copy `sourcePath` |
| U5 apply/UX | confirmation decline、backup/copy failure、manifest failure、verification failure、success report |
| CI handoff | command exits、coverage registry output、ratchet output suitable for U7 |

## Failure Diagnostics

Test helper failures include fixture name、scenario name、normalized target path。Fake port assertion failures include call history and arguments。Smoke command failures include command、cwd、exit code、stdout、stderr、normalized duration with secret scrub。Coverage failures name missing/stale FR/US/NFR mappings。

Temp cleanup failure is reported without hiding the original test failure. Snapshot mismatches show normalized diffs.

## Flake Prevention

- deterministic suites cannot call live GitHub, npm, or release credentials;
- wall-clock timestamps are replaced with injected clocks;
- absolute host paths are normalized;
- mutable temp targets are not shared between tests;
- fake retries are count-based, not sleep/timing-based;
- CI commands return stable non-zero exits for failures.

## Portability Reliability

Fixture builders use platform path APIs. Temp target tests include roots with spaces. Smoke command invocation avoids POSIX-only shell assumptions where practical. Snapshot serializers normalize separators while leaving explicit separator portability tests separate.

## Upstream Coverage

- `performance-requirements.md`: reliable suites stay within budget by avoiding live services and broad fixtures.
- `security-requirements.md`: no-write mutation tests、backup order tests、secret-safe diagnostics をreliability evidenceにした。
- `scalability-requirements.md`: deterministic builders and registry summary keep growth manageable.
- `reliability-requirements.md`: targets、failure handling、flake prevention、portability、diagnostics を直接設計した。
- `tech-stack-decisions.md`: Bun test runner、fake ports、temp dirs、snapshot normalizers、registry/ratchet に従う。
- `business-logic-model.md`: test layers、fixture workflow、coverage registry workflow、failure modes に沿う。
