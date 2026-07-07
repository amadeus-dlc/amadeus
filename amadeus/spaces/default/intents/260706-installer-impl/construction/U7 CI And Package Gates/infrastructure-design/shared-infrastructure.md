# Shared Infrastructure — U7 CI And Package Gates

> Stage: construction / infrastructure-design  
> Unit: U7 CI And Package Gates

## Shared Resource Summary

U7 creates shared CI infrastructure, not production runtime infrastructure. Shared surfaces are stable GitHub Actions check names, gate registry entries, normalized findings schemas, `.amadeus-ci/setup/` artifacts, and U8 handoff reports.

## Shared Contracts

| Contract | Shared with | Ownership |
|---|---|---|
| installer-related path rules | GitHub Actions and local gate planner | U7 owns |
| GateName/checkName/command contract | maintainers, U7 tests, GitHub Actions | U7 owns |
| normalized dependency findings schema | scanner adapters and SecurityGate | U7 owns consuming schema |
| normalized secret findings schema | scanner adapters and SecurityGate | U7 owns consuming schema |
| vulnerability allowlist shape | maintainers and SecurityGate | U7 owns validation |
| `.amadeus-ci/setup/` artifacts | maintainers and U8 preflight | U7 owns report layout |
| root validation scope | code-generation/build-and-test/U7 CI | root scripts must include `packages/setup/**/*.ts` |

## Access Boundaries

U7 may read package metadata, test results, scanner findings, and PR changed files. It may write CI reports under `.amadeus-ci/setup/`. It must not write `dist/`, promote self-install surfaces, modify package contents, create tags, publish to npm, or create GitHub Releases.

## Shared State

Shared state is repository-local and CI-local only:

- gate registry definitions;
- vulnerability allowlist file;
- coverage registry and ratchet baseline;
- CI report artifacts;
- normalized findings files.

No npm token, release environment secret, package provenance credential, or user target state belongs to U7.

## Cross-Unit Dependencies

| Unit | Dependency on U7 |
|---|---|
| U8 Documentation And Operator Guidance | uses U7 gate names, failure modes, and U8 handoff report in release/operator docs |
| code-generation/build-and-test | must implement root scripts and gate commands so generated TS files are checked |
| manual release workflow | may reuse U7 gates as preflight but must add release-specific SBOM/provenance/publish validation |

## Upstream Coverage

- `performance-design.md`: shared CI artifacts and gate registry preserve budgeted execution.
- `security-design.md`: shared schemas and allowlist validation enforce supply-chain boundaries.
- `scalability-design.md`: gate registry and artifact layout support future gate growth.
- `reliability-design.md`: stable check names, status values, and report artifacts define shared state.
- `logical-components.md`: GateRegistry, SecurityGate, CoverageGate, DriftGuard, and GateReporter define shared infrastructure.
- `components.md`: Package Check is shared with CI while release execution remains separate.
- `services.md`: GitHub Actions PR Gates and npm Registry Publication stay separated.
- `business-logic-model.md`: Concrete Gate Execution Contract and CI Handoff To U8 define cross-unit dependencies.
