---
name: installer-distribution
depth: Standard
keywords: []
---

# Scope: installer-distribution

Composed scope for adding an end-user installer to this brownfield framework
repo (npm-based distribution, e.g. `@amadeus-dlc/setup`, per the walking-
skeleton commitment already recorded in `team.md`). 25/32 stages EXECUTE.

Every stage runs except: `team-formation` (roles are already fixed by the
existing 11-agent roster; no team-composition decision is open), `rough-
mockups` and `refined-mockups` (an installer is a CLI/terminal experience,
not a visual UI surface — the interaction flow is captured in `user-stories`
and `functional-design` instead), and four operation-phase stages whose lead
agents and consumed artifacts target a running, deployed service that this
project does not have — `team.md` states the project "has no deployment
infrastructure; releases are managed via npm package distribution and
GitHub tag/PR history": `observability-setup` (no live service to
instrument), `incident-response` (no production service to page on-call
for), `performance-validation` (install-time performance is covered by the
`build-and-test` smoke checks, not a dedicated load-test phase), and
`feedback-optimization` (no telemetry pipeline to feed it, since
`observability-setup` is SKIP; premature for a first release).

`infrastructure-design`, `environment-provisioning`, `deployment-pipeline`,
and `deployment-execution` stay EXECUTE despite their AWS-platform-flavored
lead agent: `deployment-pipeline` and `deployment-execution` need the
artifacts the first two stages produce (`deployment-architecture`,
`cicd-pipeline`, `environment-inventory`) to design and execute the npm
publish pipeline — the "infrastructure" here is scoped down to the npm
registry, GitHub Actions runner, and publish secrets, not cloud IaC.
`market-research`, `feasibility`, `reverse-engineering`, `practices-
discovery`, `requirements-analysis`, and `user-stories` all stay EXECUTE:
the npm-distribution direction is already recorded in `team.md`, but the
concrete install UX, runtime/PATH constraints, and the version-resolution /
CLI-contract / force-semantics / install-manifest / upgrade-boundary
specifics that `project.md`'s corrections mandate are not yet pinned down.

Not inferable by keyword — reachable only via `--scope installer-distribution`
(keywords granted: none).
