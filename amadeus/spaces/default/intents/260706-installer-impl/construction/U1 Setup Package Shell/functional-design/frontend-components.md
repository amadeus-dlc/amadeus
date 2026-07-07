# Frontend Components — U1 Setup Package Shell

> Stage: functional-design / Unit: `U1 Setup Package Shell`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Applicability

U1 has no browser or graphical frontend. The user-facing surface is the terminal CLI. This file therefore defines CLI interaction components, matching the CLI/DX treatment in `mockups.md` and the Reporter/Prompt boundaries in `components.md`, `component-methods.md`, and `services.md`.

## CLI Interaction Components

| Component | User Surface | U1 Ownership | Downstream Ownership |
|---|---|---|---|
| Help Screen | `amadeus-setup --help`, no command help | command list, runtime note, usage grammar | none |
| Runtime Error Output | Node/npm launch without Bun | Bun-required stderr and exit code | none |
| Parser Error Output | `init`, unknown command, duplicate harness, unsupported harness | classified parse error and next action | none |
| Entrypoint Result Mapper | stdout/stderr/exit code | stream and process exit mapping | application service result content |
| Command Handoff | parsed `install`/`upgrade` | pass-through command object | U2-U5 behavior |

## Help Screen Content

The canonical help screen must show:

- product name: `Amadeus Setup`
- usage for `install`
- usage for `upgrade`
- supported harness values: `claude`, `codex`, `kiro`, `kiro-ide`
- optional flags: `--target`, `--version`, `--yes`, `--force`
- runtime note: Bun is required; `npx` may delegate to Bun when Bun is installed

It must not show:

- `init`
- multi-harness invocation examples
- JSON output as the default user-facing mode
- a promise of Node-only compatibility

## Interaction Flows

### Help Flow

1. User runs `bunx @amadeus-dlc/setup --help`.
2. U1 detects help request.
3. U1 renders help to stdout.
4. U1 exits 0.

### Unsupported Command Flow

1. User runs `amadeus-setup init`.
2. U1 parser rejects `init`.
3. U1 renders a classified stderr message explaining that `install` is the first-release command.
4. U1 exits non-zero.
5. U1 does not invoke source loading or target mutation.

### Node Without Bun Flow

1. User runs `npx @amadeus-dlc/setup --help`.
2. Wrapper discovers it is not running under Bun.
3. Wrapper cannot find Bun.
4. U1 renders Bun-required stderr.
5. U1 exits non-zero.

### Delegated Command Flow

1. User runs `amadeus-setup install --harness codex --target /tmp/project --yes`.
2. U1 parser returns `SetupCommand`.
3. U1 delegates to Setup Application Service.
4. U1 maps returned `ExitResult` to stdout/stderr/exit code.

## Accessibility And Automation

- Default output is plain text, line-oriented, and snapshot-testable.
- Help and parser errors do not rely on ANSI colors for meaning.
- Error output includes one concrete next action.
- Non-interactive callers can rely on exit codes and stderr without parsing prompts.

## Validation Hooks

| Check | Expected Result |
|---|---|
| `bunx @amadeus-dlc/setup --help` | exit 0, lists `install` and `upgrade` |
| `amadeus-setup init` | non-zero, no files modified, suggests `install` |
| `npx @amadeus-dlc/setup --help` without Bun | non-zero, Bun-required message |
| duplicate harness | non-zero, one harness per invocation message |
| unsupported harness | non-zero, supported harness list |

## Traceability

- `requirements.md` FR-001, FR-002, FR-004, FR-011 and `mockups.md` M1 define the CLI UX contract.
- `unit-of-work-story-map.md` maps U1 CLI interaction to US-001, US-003, and US-004.
- `components.md` assigns human-readable output to Reporter and top-level exit handling to Setup Package Entrypoint.
- `services.md` confirms this is a local in-process CLI surface, not a backend frontend.

