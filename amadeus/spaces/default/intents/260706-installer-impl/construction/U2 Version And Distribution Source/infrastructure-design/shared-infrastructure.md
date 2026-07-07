# Shared Infrastructure — U2 Version And Distribution Source

> Stage: construction / infrastructure-design  
> Unit: U2 Version And Distribution Source

## Shared Resource Decision

U2 introduces no shared runtime infrastructure. Shared surfaces are test and CI utilities used across installer units:

- fake tag/archive ports;
- temp directory fixture helpers;
- archive fixture corpus;
- metadata fixture corpus;
- `.amadeus-ci/setup/` report artifacts;
- dependency/security gate evidence.

## Ownership Boundaries

| Shared surface | Owner | U2 usage |
|---|---|---|
| fake external ports | U6 | deterministic source-load tests |
| CI gate command surface | U7 | blocking PR validation |
| release preflight | U8 | publish-source validation |
| temp fixture helpers | U6 | archive/extraction/metadata integration tests |
| package dependency policy | U7 | SemVer/archive/hash dependency review |

## Access Boundaries

U2 does not share mutable cache, temp roots, or credentials across invocations. Each install/upgrade source-load creates its own temp root. Shared test fixtures are repository source only.

## Upstream Coverage

- `performance-design.md`: shared fixtures support deterministic resolver/archive/metadata benchmarks.
- `security-design.md`: shared malicious archive fixtures and fake ports prove containment.
- `scalability-design.md`: shared builders generate large tag/file scenarios.
- `reliability-design.md`: shared no-target-write and cleanup fixtures prove classified outcomes.
- `logical-components.md`: ports/adapters/temp manager define shared test seams.
- `components.md`: GitHub Archive Adapter and Archive Extractor are validated through shared surfaces.
- `services.md`: GitHub Tag/Archive Source is represented by fake ports in shared CI.
- `business-logic-model.md`: U2 workflows define the shared fixture dimensions.
