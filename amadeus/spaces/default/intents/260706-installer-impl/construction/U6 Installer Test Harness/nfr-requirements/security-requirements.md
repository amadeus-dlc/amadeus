# Security Requirements — U6 Installer Test Harness

> Stage: construction / nfr-requirements  
> Unit: U6 Installer Test Harness  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U6 security covers test harness isolation, fake external dependencies, safe temp filesystem mutation, deterministic failure injection, secret-safe output, and coverage evidence for destructive-operation prevention. U6 does not publish packages, use npm credentials, or mutate real user projects.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| tests mutate a developer project | all mutation tests use isolated temp targets | temp root assertion |
| tests call live GitHub and leak tokens | source tests use fake tag/archive ports only | network port spy |
| snapshots leak absolute host paths | reporter snapshots normalize temp roots | snapshot normalizer test |
| secret values appear in output | test harness never dumps full environment | output scrub test |
| no-write guarantees are untested | every no-write branch has a negative mutation test | coverage registry mapping |
| backup-before-copy regresses | changed/unknown shared overwrite cases assert backup order | integration fixture |
| fake ports mask unsafe runtime behavior | fake ports must record call order and arguments | spy contract test |
| CI coverage mapping is forged by stale registry | freshness check validates mapped tests exist | registry check |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| fixture source files | synthetic distribution data | local temp or committed minimal fixtures only |
| temp target files | disposable test data | isolated per test and cleaned |
| fake GitHub responses | synthetic external metadata | no credentials or live API responses required |
| snapshots | test evidence | normalized paths and no file contents beyond tiny fixtures |
| coverage registry | quality gate metadata | committed and checked for freshness |
| process environment | sensitive runtime context | not printed wholesale |

## Controls

- All external dependency behavior is injected through fake ports.
- Tests fail if a live network port is used in deterministic suites.
- Test targets are created under controlled temp roots and never from the user's supplied project path.
- Temp target cleanup must be best effort and failures must be visible in test diagnostics.
- Coverage registry entries must point to executable tests.
- Snapshot normalizers replace temp root, OS-specific separators where appropriate, and volatile timestamps.
- Tests for `--force` must assert backup preservation rather than merely successful exit.

## Compliance Mapping

U6 does not process regulated personal data. Compliance relevance is evidence quality: tests prove `requirements.md` NFR-002 safety, NFR-003 traceability, and NFR-006 human-readable output without collecting user workspace data.

## Upstream Coverage

- `business-logic-model.md`: fake ports, temp target builders, source archive fixtures, and coverage registry define security boundaries.
- `business-rules.md`: no-live-network, no-real-project-mutation, no-write, backup, and snapshot rules define controls.
- `requirements.md`: FR-008, FR-009, FR-010, FR-011, FR-013, FR-014, FR-016, NFR-002, NFR-003, NFR-004, NFR-005, and NFR-006 define security-relevant acceptance.
- `technology-stack.md`: Bun/TypeScript test runner and CI baseline define verification mechanics.

