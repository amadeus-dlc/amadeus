# Shared Infrastructure — U8 Manual Release And Docs

> Stage: construction / infrastructure-design  
> Unit: U8 Manual Release And Docs

## Shared Resource Summary

U8 creates shared release infrastructure: manual GitHub Actions workflow, protected publish environment contract, release reports under `.amadeus-ci/setup/`, SBOM/provenance artifacts, docs consistency checks, and npm publication evidence for `@amadeus-dlc/setup`.

## Shared Contracts

| Contract | Shared with | Ownership |
|---|---|---|
| `.github/workflows/release-setup.yml` | maintainers | U8 owns release orchestration |
| workflow inputs | GitHub Actions UI and release scripts | U8 owns validation |
| latest stable tag selection | ReleaseTagSelector, maintainer docs | U8 owns |
| U7 release preflight mode | U7 gates and release workflow | U8 owns release-mode invocation |
| protected publish environment | GitHub Actions environment | U8 owns contract; repository admins configure |
| publish identity validation | token/trusted publishing setup | U8 owns exactly-one validation |
| SBOM/provenance artifacts | maintainers and audit evidence | U8 owns generation requirement |
| docs consistency rules | README/package docs | U8 owns installer-first release docs checks |

## Access Boundaries

Only the publish job in the protected environment may access publish credentials or trusted-publishing identity. Dry-run jobs and validation jobs must not read or print publish secrets. U8 may publish only `@amadeus-dlc/setup` from `packages/setup`.

## Shared State

Release state is represented by GitHub Actions run artifacts and `.amadeus-ci/setup/` reports. npm registry state is read during validation and post-publish verification. The workflow does not create a release queue, daemon, database, or multi-registry state store.

## Cross-Unit Dependencies

| Unit | Dependency on U8 |
|---|---|
| U7 CI And Package Gates | supplies release preflight command contracts |
| U6 Installer Test Harness | supplies deterministic smoke/integration/coverage evidence reused by preflight |
| U5 Apply Verify And UX | docs must explain no-write, backup, manifest, and verification outcomes |
| code-generation/build-and-test | must implement release workflow/scripts/docs checks so TS and docs validation pass |

## Upstream Coverage

- `performance-design.md`: shared release artifacts and preflight reuse preserve release budgets.
- `security-design.md`: protected environment, identity validation, and secret-safe reporting define shared access.
- `scalability-design.md`: one package/tag workflow and bounded artifact strategy define shared release scale.
- `reliability-design.md`: release state machine and deterministic guards define shared state.
- `logical-components.md`: ReleaseWorkflow, validators, evidence, publish, post-publish, docs, and reporter define shared infrastructure.
- `components.md`: Release Workflow Contract and Documentation Update Owner remain shared surfaces.
- `services.md`: npm Registry Publication and GitHub Actions PR Gates are connected through release preflight.
- `business-logic-model.md`: Release Workflow, Publish Guard, and Documentation Workflow define cross-unit dependencies.
