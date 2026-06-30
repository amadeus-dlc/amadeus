# Amadeus

Amadeus is a project for operating Amadeus DLC, a lifecycle contract for AI-assisted software development.
It provides agent skills, templates, examples, validators, and documentation for moving work through Ideation, Inception, Construction, and supporting analysis.

[English](README.md) | [日本語](README.ja.md)

## Highlights

- Run Amadeus DLC through focused agent skills such as `amadeus-steering`, `amadeus-ideation`, `amadeus-inception`, and `amadeus-construction`.
- Keep lifecycle artifacts auditable with explicit phase state, gates, traceability, decisions, and validation results.
- Use generated examples under [examples/](examples/) as snapshots of what the skills can produce.
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

Validate the bundled examples.

```sh
npm run validate:all
```

Run the full mock-based verification suite.

```sh
npm run test:all
```

## Usage

Amadeus is used through agent skills.
The currently supported public entrypoints are:

1. `amadeus-steering`
2. `amadeus-discovery`
3. `amadeus-event-storming`
4. `amadeus-ideation`
5. `amadeus-inception`
6. `amadeus-construction`
7. `amadeus-grilling`
8. `amadeus-domain-modeling`
9. `amadeus-domain-grilling`
10. `amadeus-validator`

The repository root does not keep a working `.amadeus/` state.
Repository examples are stored as phase-by-phase snapshots under [examples/](examples/).

### Typical Flow

| Step | Skill | Purpose |
|---|---|---|
| 1 | `amadeus-steering` | Create or inspect the shared workspace foundation. |
| 2 | `amadeus-discovery` | Clarify a large or ambiguous input topic before turning it into an Intent. |
| 3 | `amadeus-event-storming` | Map Domain Events, Processes, Aggregate Candidates, Bounded Context Candidates, and Hotspots as supporting analysis. |
| 4 | `amadeus-ideation` | Create an Intent Record and complete Ideation artifacts. |
| 5 | `amadeus-inception` | Define requirements, acceptance state, user stories, use cases, Units, Bolts, Unit Design Briefs, traceability, and decisions. |
| 6 | `amadeus-construction` | Turn Bolts into Tasks, implement them, verify them, record evidence, and update traceability. |
| 7 | `amadeus-grilling` | Resolve unclear design or planning points one question at a time. |
| 8 | `amadeus-domain-modeling` | Refine terminology, concepts, models, and contracts across phases. |
| 9 | `amadeus-domain-grilling` | Combine question-driven domain clarification with artifact updates. |
| 10 | `amadeus-validator` | Validate workspace and Intent artifact structure. |

### Validation

Validate only workspace-level example artifacts.

```sh
npm run validate
```

Validate Intent-level example artifacts.

```sh
npm run validate:intents
```

Validate everything covered by the example wrapper.

```sh
npm run validate:all
```

Run the validator directly against a workspace.

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

Run the validator directly against a specific Intent.

```sh
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace> <intent-id>-<slug>
```

## Documentation

- Agent entrypoint: [AMADEUS.md](AMADEUS.md)
- Examples: [examples/](examples/)
- Stage references:
  - [Steering](docs/amadeus/stages/steering.md)
  - [Discovery](docs/amadeus/stages/discovery.md)
  - [Ideation](docs/amadeus/stages/ideation.md)
  - [Inception](docs/amadeus/stages/inception.md)
  - [Construction](docs/amadeus/stages/construction.md)
  - [Operation](docs/amadeus/stages/operation.md)
- Architecture decisions: [docs/adr/](docs/adr/)
- AI-DLC reference material: [docs/ai-dlc/](docs/ai-dlc/)

## Boundaries

- `.amadeus/` is the artifact root in a target workspace, not in this repository root.
- Intent directory names must match `.amadeus/intents.md` and `.amadeus/intents/<intent-id>-<slug>/`.
- Domain findings are placed according to scope: Intent-specific notes go to `domain-notes.md`, shared models go to `.amadeus/domain/**`, Inception relationships go to `inception/traceability.md`, and implementation design details go to Construction Functional Design.
- Unknown values are recorded as `未確認` instead of being left blank.
- External systems, Bounded Contexts, Intents, and dependencies are not invented from guesses.
- Spec, `.kiro/specs/**`, `openspec/**`, and Operation artifacts are not fixed as procedures until their corresponding skills are confirmed.

## Getting Help

- Issues: [github.com/j5ik2o/amadeus/issues](https://github.com/j5ik2o/amadeus/issues)

## Contributing

This repository does not currently include a `CONTRIBUTING.md`.
Before making a large change, open an issue that describes the scope, affected skills, expected artifacts, and validation plan.

For local development, use:

```sh
npm run test:all
```

## License

No license file is currently included in this repository.
