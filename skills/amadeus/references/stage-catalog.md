# Stage Catalog

Stage-to-runner mapping for the engine-driven lifecycle.
The engine (`.agents/aidlc/tools/aidlc-orchestrate.ts`) owns stage resolution; the authoritative stage definitions live in `.agents/aidlc/aidlc-common/stages/<phase>/<slug>.md` (frontmatter: execution, condition, scopes, produces, consumes, sensors).
This table only maps each stage to its optional single-stage runner skill (`/aidlc --stage <slug> --single` packaging).

| Stage | Phase | Slug | Runner skill |
|---|---|---|---|
| 0.1-0.3 | initialization | workspace-scaffold / workspace-detection / state-init | `amadeus-init` (whole Initialization phase in one step) |
| 1.1 | ideation | intent-capture | `amadeus-intent-capture` |
| 1.2 | ideation | market-research | `amadeus-market-research` |
| 1.3 | ideation | feasibility | `amadeus-feasibility` |
| 1.4 | ideation | scope-definition | `amadeus-scope-definition` |
| 1.5 | ideation | team-formation | `amadeus-team-formation` |
| 1.6 | ideation | rough-mockups | `amadeus-rough-mockups` |
| 1.7 | ideation | approval-handoff | `amadeus-approval-handoff` |
| 2.1 | inception | reverse-engineering | `amadeus-reverse-engineering` |
| 2.2 | inception | practices-discovery | `amadeus-practices-discovery` |
| 2.3 | inception | requirements-analysis | `amadeus-requirements-analysis` |
| 2.4 | inception | user-stories | `amadeus-user-stories` |
| 2.5 | inception | refined-mockups | `amadeus-refined-mockups` |
| 2.6 | inception | application-design | `amadeus-application-design` |
| 2.7 | inception | units-generation | `amadeus-units-generation` |
| 2.8 | inception | delivery-planning | `amadeus-delivery-planning` |
| 3.1 | construction | functional-design | `amadeus-functional-design` |
| 3.2 | construction | nfr-requirements | `amadeus-nfr-requirements` |
| 3.3 | construction | nfr-design | `amadeus-nfr-design` |
| 3.4 | construction | infrastructure-design | `amadeus-infrastructure-design` |
| 3.5 | construction | code-generation | `amadeus-code-generation` |
| 3.6 | construction | build-and-test | `amadeus-build-and-test` |
| 3.7 | construction | ci-pipeline | `amadeus-ci-pipeline` |
| 4.1 | operation | deployment-pipeline | `amadeus-deployment-pipeline` |
| 4.2 | operation | environment-provisioning | `amadeus-environment-provisioning` |
| 4.3 | operation | deployment-execution | `amadeus-deployment-execution` |
| 4.4 | operation | observability-setup | `amadeus-observability-setup` |
| 4.5 | operation | incident-response | `amadeus-incident-response` |
| 4.6 | operation | performance-validation | `amadeus-performance-validation` |
| 4.7 | operation | feedback-optimization | `amadeus-feedback-optimization` |

Scope-to-stage mapping and execution conditions are engine-owned: see `.agents/aidlc/scopes/` (one file per scope) and each stage definition's frontmatter.
Scope entry skills (`amadeus-bugfix`, `amadeus-feature`, `amadeus-mvp`, `amadeus-security-patch`) and utility skills (`amadeus-replay`, `amadeus-session-cost`, `amadeus-outcomes-pack`) are listed by `bun .agents/aidlc/tools/aidlc-utility.ts help`.
