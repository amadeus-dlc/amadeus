# External Dependency Map — インストーラの実装

> Stage: delivery-planning / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `team-practices.md`

## Dependency Summary

Runtime implementation is designed to be mockable and not blocked by live external systems. Release and publication are intentionally gated by maintainer-owned GitHub Actions and npm credentials. This map keeps `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, and `team-practices.md` aligned with delivery constraints.

## Gated Items

| Dependency | Owner | Lead Time | Blocks | Mitigation / Workaround |
|---|---|---:|---|---|
| GitHub tag/archive availability for `amadeus-dlc/amadeus` | Maintainer / GitHub | low | B2 runtime completeness, B5 release validation | Use fake tag/archive adapter and local fixture archives in B1/B3; live fetch is integration coverage, not unit test dependency. |
| npm organization scope and publish token | Maintainer | medium | B5 production publish | Build workflow with dry-run and publish validation; keep actual token/environment as release gate. |
| GitHub Actions protected environment for npm publish | Maintainer | medium | B5 production publish | Define workflow contract and validation steps first; publish environment can be configured before first real release. |
| SBOM/provenance support in release workflow | Maintainer / GitHub Actions | low-medium | B5 release readiness | Add dry-run/provenance steps as blocking gates; document any tool-specific setup in release docs. |
| OSV/audit and secret scan tooling availability | Maintainer | low | B4 CI gates | Select concrete tooling in CI Pipeline / NFR stages; until then, keep gate requirement explicit and path-triggered. |
| Human approval for walking skeleton | Maintainer | immediate | B2 onward | B1 gate is mandatory by `team-practices.md` and team-formation Q3. |
| Human release button press | Maintainer | immediate | npm publication | `workflow_dispatch` is the intended production release trigger; no automatic main publish. |

## Non-Blocking Dependencies

- Live GitHub network is not required for pure domain tests; U2 exposes tag/archive ports for fakes.
- Real user projects are not required for safety tests; U6 uses temp target fixtures.
- npm production credentials are not required for package dry-run, docs, or release workflow structure.
- External cloud infrastructure is not required; `services.md` states there is no long-running backend service or AWS runtime infrastructure.

## Bolt Impact

| Bolt | External Dependency Exposure | Completion Rule |
|---|---|---|
| B1 Thin Installer Skeleton | none required | Completes with fake/local source distribution and temp target. |
| B2 Runtime Completeness | GitHub tag/archive integration optional for live smoke | Completes when live dependency is behind adapter and retry/error behavior is tested with fakes. |
| B3 Installer Test Harness | none required | Completes when fixtures cover runtime behavior without live network or real user projects. |
| B4 CI And Package Gates | tool availability for audit/OSV/secret scan | Completes when selected gates are blocking or explicitly represented as required CI work. |
| B5 Manual Release And Docs | npm token, protected environment, human workflow_dispatch | Completes when workflow and docs are ready; production publish waits for maintainer-controlled release gate. |

## Escalation Rules

- If B2 discovers live GitHub archive layout is incompatible with `dist/<harness>/`, stop and revise Application Design or Functional Design before continuing.
- If B4 cannot make a security or coverage gate blocking, record it as a release blocker rather than downgrading it to advisory.
- If B5 lacks npm credentials, do not switch to local manual publish as the primary path; keep GitHub Actions `workflow_dispatch` as the release surface and mark publication blocked.

