# Business Rules — U6 Installer Test Harness

> Stage: functional-design / Unit: `U6 Installer Test Harness`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Test Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U6-001 | Tests run with Bun and TypeScript under the repository test runner. | `team-practices.md` Testing Posture |
| BR-U6-002 | Tests must not require live GitHub network for deterministic coverage. | `external-dependency-map.md` |
| BR-U6-003 | Tests must not mutate real user projects. | `requirements.md` NFR-002 |
| BR-U6-004 | Every no-write guarantee has a negative test. | `requirements.md` FR-011 |
| BR-U6-005 | Every changed/unknown shared-file overwrite path has a backup-before-copy test. | `requirements.md` FR-009/FR-010 |
| BR-U6-006 | Manifest-first upgrade and `kiro`/`kiro-ide` ambiguity are required test cases. | project memory application-design:c6 |
| BR-U6-007 | Reporter output is snapshot-tested from `FileOperationPlan` / `SetupResult`. | `mockups.md`, U5 |
| BR-U6-008 | Coverage registry/ratchet is the quality floor, not line coverage percentage. | `team-practices.md`, project memory practices-discovery:c3 |

## Required Test Matrix

| Area | Required Cases |
|---|---|
| U1 package shell | help, `init` rejection, duplicate harness, unsupported harness |
| U2 source | SemVer ordering, duplicate tag, prerelease default exclusion, retry failure |
| U3 target | manifest-installed, manual-or-unknown, partial, none, unsupported, ambiguous |
| U4 planning | conflict no-write, force backup, upgrade version branches |
| U5 apply/UX | confirmation decline, backup/copy failure, manifest failure, verification failure |
| CI handoff | command exits and coverage registry output suitable for U7 |

## Testable Invariants

- No test passes without asserting behavior.
- Temp directories are isolated per test.
- Fake ports expose deterministic failure controls.
- Snapshot output does not depend on absolute host paths except explicitly normalized examples.

