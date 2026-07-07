# Shared Infrastructure — U3 Target State And Manifest

> Stage: construction / infrastructure-design  
> Unit: U3 Target State And Manifest

## Shared Resource Decision

U3 introduces no shared runtime infrastructure. Shared surfaces are repository test/CI assets:

- manifest schema fixtures;
- target-state fixture builders;
- fake filesystem ports;
- md5/hash portability fixtures;
- coverage registry entries;
- `.amadeus-ci/setup/` reports.

## Ownership Boundaries

| Shared surface | Owner | U3 usage |
|---|---|---|
| fake filesystem ports | U6 | no-write and fault injection tests |
| coverage registry | U6/U7 | U3 state/manifest coverage floor |
| package gates | U7 | ensure TypeScript/Bun compatibility |
| release preflight | U8 | reuse U7 gates before publish |

## Access Boundaries

No shared mutable target state is used. Each test target is isolated. Runtime U3 invocation reads the user-specified target only and keeps invocation state local.

## Upstream Coverage

- `performance-design.md`: shared fixtures benchmark bounded target reads.
- `security-design.md`: fake ports prove no-write and content minimization.
- `scalability-design.md`: shared builders generate 2,000 entry/file cases.
- `reliability-design.md`: fixture matrix proves target state and unknown md5 outcomes.
- `logical-components.md`: component boundaries define shared test seams.
- `components.md`: Target Detector and Manifest Store are validated through shared surfaces.
- `services.md`: shared CI verifies Application Service receives U3 data without U3 writes.
- `business-logic-model.md`: detection/snapshot workflows define shared fixture dimensions.
