# Shared Infrastructure — U1 Setup Package Shell

> Stage: construction / infrastructure-design  
> Unit: U1 Setup Package Shell

## Shared Resource Decision

U1 does not introduce shared runtime infrastructure. No shared database、cache、queue、network、load balancer、or service discovery is required.

The shared surfaces are repository-level validation assets used by multiple installer units:

- GitHub Actions Bun setup;
- installer-related path classification;
- package metadata and dry-run reports;
- U6 smoke/fixture command surface;
- U7/U8 `.amadeus-ci/setup/` artifacts.

## Ownership Boundaries

| Shared surface | Owner | U1 usage |
|---|---|---|
| Bun CI setup | U7/U8 | run entrypoint/parser/package checks |
| package metadata report | U7 | validate U1 package boundary |
| package dry-run report | U7/U8 | validate U1 publish contents |
| smoke command surface | U6/U7 | exercise help/parser/runtime behavior |
| release workflow | U8 | publish package after validation |

## Access Boundaries

U1 does not need access to release credentials, scanner credentials, or GitHub tokens. Shared CI artifacts are read/write only within CI jobs and are not runtime state for users.

## Upstream Coverage

- `performance-design.md`: shared CI assets keep startup timing and smoke checks bounded.
- `security-design.md`: shared package dry-run and metadata gates enforce package contents controls.
- `scalability-design.md`: shared gate surfaces manage command/harness/package growth.
- `reliability-design.md`: shared smoke and unit tests prove classified exits and no-write behavior.
- `logical-components.md`: package checker and shell components are the shared validation targets.
- `components.md`: Package Check and Release Workflow Contract define shared validation surfaces.
- `services.md`: GitHub Actions PR Gates and manual release workflow are shared external services.
- `business-logic-model.md`: U1 workflows define which shared surfaces are exercised.
