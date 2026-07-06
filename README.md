# Amadeus

Amadeus is a project for operating Amadeus DLC, a lifecycle contract for AI-assisted software development.
It provides agent skills, templates, validators, and documentation for moving work through Initialization, Ideation, Inception, Construction, and Operation, with semantics compatible with AI-DLC v2.

[English](README.md) | [日本語](README.ja.md)

## Highlights

- Run the whole lifecycle through the single public entrypoint skill `amadeus`, which handles Intake (continuation by default, human-approved Intent birth, scope estimation) and is engine-driven: the engine (`amadeus-orchestrate.ts`'s `next` / `report` forwarding loop) resolves the next stage and hands work to the stage skills, one step at a time.
- Adapt ceremony to the work: each scope (`enterprise`, `feature`, `mvp`, `poc`, `bugfix`, `refactor`, `infra`, `security-patch`, `workshop`, `pdm`) executes only its own subset of the 32 stages.
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

Run the full verification suite.

```sh
npm run test:all
```

## Install into a Workspace

Use this section to install the Amadeus engine into your own project workspace (distinct from the [Quickstart](#quickstart) above, which sets up this repository for development on Amadeus itself).

### Prerequisites

- [Bun](https://bun.sh).

### Install

Run from a clone of this repository, targeting the workspace you want to install into:

```sh
bun run scripts/amadeus-install.ts --target <workspace>
```

or, equivalently:

```sh
npm run amadeus:install -- --target <workspace>
```

### What gets installed

- The engine, `.agents/amadeus/` (7 directories: `agents`, `amadeus-common`, `hooks`, `knowledge`, `scopes`, `sensors`, `tools`).
- The `amadeus*` skills, under both `.claude/skills/` and `.agents/skills/`.
- `.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}`, relative symlinks into `.agents/amadeus/`.
- `AMADEUS.md` at the workspace root, transformed for end users (development-only sections removed).
- The Amadeus hooks wiring, merged into `.claude/settings.json` (existing keys such as `env`, `permissions`, and other tools' hooks are left untouched).

Codex users need no `.claude/` wiring: `.agents/` alone is a complete, standalone install.

### Post-install verification

```sh
bun <workspace>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <workspace>
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

### Updating

To update, re-run the same install command against the same workspace. It is idempotent: replaced content converges to the same result, and the hooks merge never creates duplicate entries.

The installer records what it installed in `<workspace>/.amadeus-install.json` (source commit, install time, and a sha256 hash per installed file). On an update it three-way compares each file — the recorded hash, the new distribution, and what is currently on disk:

- Unmodified files converge to the new distribution as before.
- A file you have modified is never silently overwritten: it is backed up to `<workspace>/.amadeus-install-backup/<install-time>/<same relative path>` first, then replaced, and every backup is listed in the run's output. Re-apply your changes from the backup if you still need them (the installer does not merge).
- A file recorded in the manifest but deleted on disk is restored (and counted in the output).
- On the first update over a pre-manifest install, any file that differs from the new distribution is conservatively treated as modified and backed up.

To see which version is installed:

```sh
bun run scripts/amadeus-install.ts --target <workspace> --version-info
```

It prints the installed source commit, install time, and tracked-file count, and exits non-zero when no manifest exists (so CI can branch with `--version-info || <install>`).

Known limitation: skills you add under your own `amadeus*`-prefixed directory names are treated as stale distribution skills and removed on update (their customized files are backed up first). Use a non-`amadeus` prefix for your own skills.

## Usage

Amadeus is used through agent skills.
The skills are grouped by how they participate in Amadeus DLC.

### Lifecycle Entrypoint

`amadeus` is the single public entrypoint for the lifecycle.

It decides whether an input continues an existing Intent, merges into an existing Intent's scope backlog, or proposes the birth of a new Intent (which always requires human approval).
It is engine-driven: the engine resolves the next stage and delegates the actual work to the stage skills, one step at a time, rather than the skill re-deriving stage order from prose.

### Auxiliary Entrypoints

Use auxiliary entrypoints when work needs additional analysis, domain clarification, or artifact validation.

- `amadeus-grilling`
- `amadeus-domain-modeling`
- `amadeus-validator`

### Internal Skills

Internal skills are invoked by `amadeus` through stage routing, or by other skills.
Use `amadeus` or the auxiliary entrypoints as the public entrypoints unless the task explicitly requires an internal skill.

| Family | Internal skills |
|---|---|
| Stage runners (one per lifecycle stage, `amadeus-<stage>`, 29 skills) | Single-stage packaging invoked by the engine or run standalone; see [core/skills/amadeus/references/stage-catalog.md](core/skills/amadeus/references/stage-catalog.md) for the full stage-to-skill mapping. |
| Scope and composer shortcuts | `amadeus-bugfix`, `amadeus-feature`, `amadeus-mvp`, `amadeus-security-patch`, `amadeus-init`, `amadeus-compose` |
| Read-only utilities | `amadeus-outcomes-pack`, `amadeus-replay`, `amadeus-session-cost` |

For Amadeus source changes, check both `core/skills/amadeus-*` and `.agents/skills/amadeus-*`; keep promoted artifacts aligned through the repository promotion flow.

The repository root keeps `amadeus/` as the workspace for Amadeus's own development.

### Typical Flow

| Step | Skill | Purpose |
|---|---|---|
| 1 | `amadeus` | Run Intake for an input: continue or merge into an existing Intent, or propose a new Intent birth with an estimated scope for human approval. |
| 2 | `amadeus` | Route each following session to the next stage, engine-driven, delegating to the stage skills through Ideation, Inception, and Construction; Construction runs Bolt by Bolt with a mandatory human gate on the walking skeleton. |

Auxiliary entrypoints can be used alongside the flow when needed.
`amadeus-grilling` asks one question at a time to clarify Intent, steering, domain, design boundaries, or execution policy.
`amadeus-domain-modeling` pins down terminology, ubiquitous language, and domain boundaries, recording confirmed decisions into the workspace's knowledge artifacts.
`amadeus-validator` validates workspace and Intent artifact structure.

### Validation

Run the validator against a workspace.

```sh
npm run validate:workspace -- <workspace>
```

Run the validator against a specific Intent.

```sh
npm run validate:workspace -- <workspace> <YYMMDD>-<label>
```

## Documentation

- Agent entrypoint: [AMADEUS.md](AMADEUS.md)
- User guide: [docs/guide/index.md](docs/guide/index.md)
- Skill language policy: [docs/amadeus/skill-language-policy.md](docs/amadeus/skill-language-policy.md)
- Language policy for `docs/amadeus/`: [docs/amadeus/language-policy.md](docs/amadeus/language-policy.md)
- Lifecycle contract (5 phases, 32 stages, scopes, state schema):
  - [Overview](docs/amadeus/lifecycle/overview.md)
  - [Scopes](docs/amadeus/lifecycle/scopes.md)
  - [Ideation](docs/amadeus/lifecycle/ideation.md)
  - [Inception](docs/amadeus/lifecycle/inception.md)
  - [Construction](docs/amadeus/lifecycle/construction.md)
  - [State](docs/amadeus/lifecycle/state.md)
- Space reference: [docs/amadeus/steering.md](docs/amadeus/steering.md)
- Extension guide: [docs/amadeus/extension-guide.md](docs/amadeus/extension-guide.md)
- Decision records: held by the Intent record's decision log, steering rationale tables, and `CONTEXT.md` (vocabulary) — not a repository-wide ADR series
- AI-DLC reference material: [docs/ai-dlc/](docs/ai-dlc/)

## Boundaries

- `amadeus/` is the workspace root in a target workspace; each Space (`amadeus/spaces/<space>/`, default `default`) holds `memory/`, `knowledge/`, `codekb/`, and `intents/`.
  In this repository root, it is limited to the workspace for Amadeus's own development.
- The canonical Intent ledger is `amadeus/spaces/<space>/intents/intents.json` (UUIDv7 per entry); Intent directory names follow `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`.
- New Intents are born only through the `amadeus` Intake with explicit human approval; work that belongs to an existing Intent's outcome goes to that Intent's scope backlog instead of becoming a new Intent.
- Domain findings are placed according to scope: Intent-specific notes go to `domain-notes.md`, adopted boundaries go to `amadeus/spaces/<space>/knowledge/domain-map.md`, adopted context dependencies go to `amadeus/spaces/<space>/knowledge/context-map.md`, Inception relationships go to `inception/traceability.md`, and detailed models and contracts go to Construction Functional Design.
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
