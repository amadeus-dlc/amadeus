# Shared Infrastructure — U6 Installer Test Harness

> Stage: construction / infrastructure-design  
> Unit: U6 Installer Test Harness

## Shared Resource Summary

U6 creates no shared cloud infrastructure. Shared infrastructure is local test evidence and reusable helper contracts for U7 CI and U8 documentation.

## Shared Contracts

| Contract | Shared with | Ownership |
|---|---|---|
| fixture builders | U1-U5 tests | U6 owns test setup correctness |
| fake ports and call history | U4/U5 safety tests, U7 CI | U6 owns deterministic dependency behavior |
| temp target manager | integration/smoke tests | U6 owns isolation and cleanup diagnostics |
| snapshot normalizer | reporter snapshots and docs review | U6 owns normalization rules |
| coverage registry | U7 CI, maintainers | U6 owns FR/US/NFR mapping schema |
| registry freshness and ratchet outputs | U7 CI gates | U6 owns local check behavior |
| smoke command records | U7 CI and release dry-run | U6 owns normalized execution evidence |

## Access Boundaries

Runtime installer code may depend on production ports and domain modules, but it must not depend on U6 test helpers. Test helpers may import runtime modules under test. This one-way dependency keeps test infrastructure from shipping in the publishable installer package.

## Shared State

There is no persistent service state. Coverage registry and ratchet baseline are repository files. Temp targets are per-test disposable directories. Snapshot files are repository test artifacts. No target-user state, npm credential, GitHub credential, or live service token is shared.

## Cross-Unit Dependencies

| Unit | Dependency on U6 |
|---|---|
| U7 CI And Release Automation | calls U6 commands as blocking PR/release gates |
| U8 Documentation And Operator Guidance | uses reporter snapshots and smoke outputs as documentation evidence |
| code-generation/build-and-test | must generate TS files and tests that pass U6 command surfaces |

## Non-Shared Infrastructure

U6 does not share databases, caches, queues, cloud resources, service discovery, IAM roles, release environments, or runtime telemetry. Adding hosted test infrastructure is out of scope for the installer first release.

## Upstream Coverage

- `performance-design.md`: shared test contracts preserve suite budgets and command partitioning.
- `security-design.md`: fake/temp/secret-safe boundaries define shared access.
- `scalability-design.md`: registry and snapshot growth guardrails define shared artifact scale.
- `reliability-design.md`: deterministic builders and flake prevention define shared evidence quality.
- `logical-components.md`: all U6 components map to shared local infrastructure contracts.
- `components.md`: runtime setup components remain separate from test helper ownership.
- `services.md`: GitHub Actions and release dry-run consume shared test outputs.
- `business-logic-model.md`: integration boundaries and coverage registry workflow define cross-unit dependencies.
