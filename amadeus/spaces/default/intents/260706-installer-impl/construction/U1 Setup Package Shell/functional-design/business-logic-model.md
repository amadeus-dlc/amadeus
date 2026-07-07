# Business Logic Model — U1 Setup Package Shell

> Stage: functional-design / Unit: `U1 Setup Package Shell`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U1 establishes the executable shell for `@amadeus-dlc/setup`. It owns package metadata, bin exposure, Bun-first startup, best-effort `npx` delegation, command parsing, help text, and top-level result/error mapping. It does not resolve versions, inspect targets, fetch archives, plan file operations, or write target files; those behaviors belong to U2 through U5 as defined in `unit-of-work.md` and `components.md`.

Primary stories from `unit-of-work-story-map.md`:

- US-001: package entrypoint starts without cloning the repository.
- US-002: install can be invoked through the package shell.
- US-003: interactive mode can later prompt for missing values.
- US-004: non-interactive install safety starts with parser/runtime validation.
- US-009: release workflow can validate package metadata.

## Processing Workflow

### Startup Workflow

1. npm runner invokes package bin `amadeus-setup`.
2. Entrypoint checks whether it is running under Bun.
3. If running under Bun, it calls `runSetup(argv, env, deps)`.
4. If launched through a Node/npm context and Bun is discoverable, the wrapper delegates to Bun with the same argv and stdio.
5. If Bun is not discoverable, the wrapper exits non-zero with a human-readable Bun-required message.
6. Top-level errors are caught and rendered through the reporter contract from `component-methods.md`.

### Command Parsing Workflow

1. Normalize raw argv by removing the executable prefix.
2. Read the first positional command.
3. Accept only `install`, `upgrade`, `--help`, and help aliases.
4. Reject `init`, unknown commands, duplicate harness flags, unsupported harness values, and multiple command names.
5. Parse optional flags: `--harness`, `--target`, `--version`, `--yes`, `--force`.
6. Return a structured `ParseResult<SetupCommand>` or classified `SetupError`.

### Help Workflow

1. If command is absent or help flag is supplied, render canonical help output.
2. Help output lists only `install` and `upgrade`.
3. Help output states that Bun is required for this release and `npx` may delegate to Bun when Bun is installed.
4. Help never reads or writes the target project.

### Delegation Workflow

1. Parser returns `SetupCommand`.
2. Entrypoint calls the Setup Application Service boundary from `services.md`.
3. U1 passes through command data and runtime environment only.
4. U1 maps the returned `ExitResult` to process stdout, stderr, and exit code.

## Decision Tree

| Condition | Result | No-Write Guarantee |
|---|---|---|
| `--help` or no command | render help, exit 0 | no target access |
| command is `install` | produce `SetupCommand` and delegate | U1 performs no target writes |
| command is `upgrade` | produce `SetupCommand` and delegate | U1 performs no target writes |
| command is `init` | error `unsupported-command` | no target access |
| command is unknown | error `unknown-command` | no target access |
| duplicate `--harness` | error `duplicate-harness` | no target access |
| unsupported harness | error `unsupported-harness` | no target access |
| Node/npm launch without Bun | error `bun-required` | no target access |

## Data Transformations

| Input | Transformation | Output |
|---|---|---|
| raw argv | parse command and flags | `SetupCommand` or `SetupError` |
| process env | detect runtime and Bun availability | runtime startup decision |
| parse error | map code/message/next action | human-readable stderr |
| application result | map stdout/stderr/code | process exit result |

## Integration Boundaries

- `requirements.md` defines the accepted CLI contract and rejection of `init`.
- `components.md` places Setup Package Entrypoint and CLI Command Parser in `packages/setup/src/**`.
- `component-methods.md` defines `runSetup`, `parseCommand`, `SetupCommand`, `ParseResult`, `SetupError`, and `ExitResult`.
- `services.md` states that U1 is an in-process local CLI shell and not a backend service.
- U1 feeds U2/U3/U4/U5 but must not depend on their concrete adapter implementations.

