# Amadeus

Amadeus is a project for operating Amadeus DLC, a lifecycle contract for AI-assisted software development.
It provides agent skills, templates, validators, and documentation for moving work through Ideation, Inception, Construction, and supporting analysis, with semantics compatible with AI-DLC v2.

[English](README.md) | [日本語](README.ja.md)

## Highlights

- Run the whole lifecycle through the single public entrypoint skill `amadeus`, which handles Intake (continuation by default, human-approved Intent birth, scope estimation) and stage routing driven by `state.json`.
- Adapt ceremony to the work: each scope (`enterprise`, `feature`, `mvp`, `poc`, `bugfix`, `refactor`, `infra`, `security-patch`, `workshop`) executes only its own subset of the 22 stages.
- Use generated examples under [examples/](examples/) as snapshots of what the skills can produce.
- Keep lifecycle artifacts auditable with explicit stage states, approval evidence, phase gates, Bolt gates, and validation results.
- Validate Amadeus workspaces and Intent artifacts with the bundled `amadeus-validator`.

## Quickstart

### Requirements

- Node.js and npm.
- Bun.
- The dependencies declared in [package.json](package.json).

### Install

```sh
bun install
```

### Run

Run the full mock-based verification suite.

```sh
npm run test:all
```

## Usage

Amadeus is used through agent skills.
The skills are grouped by how they participate in Amadeus DLC.

### Lifecycle Entrypoint

`amadeus` is the single public entrypoint for the lifecycle.

It decides whether an input continues an existing Intent, merges into an existing Intent's scope backlog, or proposes the birth of a new Intent (which always requires human approval).
It then resolves the next stage from the Intent's `state.json` and delegates the actual work to the stage skills.

1. `amadeus-steering` (workspace foundation, run once per workspace)
2. `amadeus` (Intake and stage routing for every Intent)

### Auxiliary Entrypoints

Use auxiliary entrypoints when work needs additional analysis, domain clarification, or artifact validation.

- `amadeus-event-storming`
- `amadeus-grilling`
- `amadeus-domain-modeling`
- `amadeus-domain-grilling`
- `amadeus-validator`

### Internal Skills

Internal skills are invoked by `amadeus` through stage routing, or by other skills.
Use `amadeus` or the auxiliary entrypoints as the public entrypoints unless the task explicitly requires an internal skill.

| Family | Internal skills |
|---|---|
| Ideation stages (1.1–1.7) | `amadeus-ideation-intent-capture`, `amadeus-ideation-market-research`, `amadeus-ideation-feasibility`, `amadeus-ideation-scope-definition`, `amadeus-ideation-team-formation`, `amadeus-ideation-rough-mockups`, `amadeus-ideation-approval-handoff` |
| Inception stages (2.1–2.8) | `amadeus-inception-reverse-engineering`, `amadeus-inception-practices-discovery`, `amadeus-inception-requirements-analysis`, `amadeus-inception-user-stories`, `amadeus-inception-refined-mockups`, `amadeus-inception-application-design`, `amadeus-inception-units-generation`, `amadeus-inception-delivery-planning` |
| Construction stages (3.1–3.7) | `amadeus-construction-functional-design`, `amadeus-construction-nfr-requirements`, `amadeus-construction-nfr-design`, `amadeus-construction-infrastructure-design`, `amadeus-construction-code-generation`, `amadeus-construction-build-and-test`, `amadeus-construction-ci-pipeline` |
| Decision and learning support | `amadeus-decision-review`, `amadeus-history-review`, `amadeus-learning-review` |

When reviewing or changing an Amadeus skill, you must use `skill-forge` to check the skill boundary, trigger description, body instructions, eval coverage, and Codex metadata when present.
For skill change pull requests, this check and a record of its results in the pull request description are required conditions; the definitions live in the steering policies ([.amadeus/steering/policies.md](.amadeus/steering/policies.md)).
For Amadeus source changes, check both `skills/amadeus-*` and `.agents/skills/amadeus-*`; keep promoted artifacts aligned through the repository promotion flow.

The repository root keeps `.amadeus/` as the steering layer for Amadeus's own development.

### Typical Flow

| Step | Skill | Purpose |
|---|---|---|
| 1 | `amadeus-steering` | Create or inspect the shared workspace foundation. |
| 2 | `amadeus` | Run Intake for an input: continue or merge into an existing Intent, or propose a new Intent birth with an estimated scope for human approval. |
| 3 | `amadeus` | Route each following session to the next stage from `state.json`, delegating to the stage skills through Ideation, Inception, and Construction; Construction runs Bolt by Bolt with a mandatory human gate on the walking skeleton. |

Auxiliary entrypoints can be used alongside the flow when needed.
`amadeus-event-storming` maps Domain Events, Processes, Aggregate Candidates, Bounded Context Candidates, and Hotspots as supporting analysis.
`amadeus-domain-grilling` combines question-driven domain clarification with artifact updates.
`amadeus-validator` validates workspace and Intent artifact structure.

### Validation

Validate the bundled example snapshots.

```sh
npm run validate:all
```

Run the validator against a workspace.

```sh
npm run validate:workspace -- <workspace>
```

Run the validator against a specific Intent.

```sh
npm run validate:workspace -- <workspace> <intent-id>-<slug>
```

## Documentation

- Agent entrypoint: [AMADEUS.md](AMADEUS.md)
- Examples: [examples/](examples/)
- Lifecycle contract (3 phases, 22 stages, scopes, state schema):
  - [Overview](docs/amadeus/lifecycle/overview.md)
  - [Scopes](docs/amadeus/lifecycle/scopes.md)
  - [Ideation](docs/amadeus/lifecycle/ideation.md)
  - [Inception](docs/amadeus/lifecycle/inception.md)
  - [Construction](docs/amadeus/lifecycle/construction.md)
  - [State](docs/amadeus/lifecycle/state.md)
- Steering layer reference: [docs/amadeus/steering.md](docs/amadeus/steering.md)
- Architecture decisions: [docs/adr/](docs/adr/)
- AI-DLC reference material: [docs/ai-dlc/](docs/ai-dlc/)

## Boundaries

- `.amadeus/` is the artifact root in a target workspace.
  In this repository root, it is limited to the steering layer for Amadeus's own development.
- Intent directory names must match `.amadeus/intents.md` and `.amadeus/intents/<intent-id>-<slug>/`.
- New Intents are born only through the `amadeus` Intake with explicit human approval; work that belongs to an existing Intent's outcome goes to that Intent's scope backlog instead of becoming a new Intent.
- Domain findings are placed according to scope: Intent-specific notes go to `domain-notes.md`, adopted boundaries go to `.amadeus/domain-map.md`, adopted context dependencies go to `.amadeus/context-map.md`, Inception relationships go to `inception/traceability.md`, and detailed models and contracts go to Construction Functional Design.
- Unknown values are recorded as `未確認` instead of being left blank.
- External systems, Bounded Contexts, Intents, and dependencies are not invented from guesses.
- Spec, `.kiro/specs/**`, `openspec/**`, and Operation artifacts are not fixed as procedures until their corresponding skills are confirmed.

## Getting Help

- Issues: [github.com/amadeus-dlc/amadeus/issues](https://github.com/amadeus-dlc/amadeus/issues)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the licensing terms of contributions, the DCO sign-off, and the workflow.
Before making a large change, open an issue that describes the scope, affected skills, expected artifacts, and validation plan.

For local development, use:

```sh
npm run test:all
```

## License

This repository is dual-licensed under MIT OR Apache-2.0.
See [LICENSE-MIT](LICENSE-MIT) and [LICENSE-APACHE](LICENSE-APACHE).

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in this project by you, as defined in the Apache-2.0 license, shall be dual-licensed as above, without any additional terms or conditions.
