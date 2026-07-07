# Domain Entities — U1 Setup Package Shell

> Stage: functional-design / Unit: `U1 Setup Package Shell`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Entity Overview

U1 uses lightweight command-shell entities rather than persistent domain aggregates. Persistent installer state starts in U3 Target State And Manifest. U1 entities are value objects that normalize runtime invocation and command grammar before delegating to the Setup Application Service described in `services.md`.

## Core Entities

### PackageIdentity

| Attribute | Type | Rule |
|---|---|---|
| `name` | string | Must be `@amadeus-dlc/setup`. |
| `binName` | string | Must be `amadeus-setup`. |
| `packageRoot` | path | Must resolve under `packages/setup/`. |
| `license` | string | Must reflect MIT OR Apache-2.0. |
| `repository` | string | Must reference `amadeus-dlc/amadeus`. |
| `filesAllowlist` | string[] | Must include publishable package files only. |

Lifecycle: authored in package metadata, checked by package validation, consumed by CI/release in later units.

### RuntimeInvocation

| Attribute | Type | Rule |
|---|---|---|
| `argv` | string[] | Raw invocation arguments after executable prefix normalization. |
| `env` | record | Environment available to the wrapper and application service. |
| `runtime` | `bun` / `node` / `unknown` | Determines whether to execute directly or delegate. |
| `bunPath` | string or null | Required when runtime is not Bun and delegation is attempted. |
| `stdioMode` | inherited | Delegation must preserve user-facing terminal behavior. |

Lifecycle: created at process start, used once, not persisted.

### SetupCommand

| Attribute | Type | Rule |
|---|---|---|
| `command` | `install` / `upgrade` | `init` and unknown commands are invalid. |
| `harness` | optional harness | Must be one of supported harnesses when present. |
| `target` | optional path | U1 preserves text; downstream validates semantics. |
| `version` | optional string | U1 preserves text; U2 resolves. |
| `yes` | boolean | True only when `--yes` was supplied. |
| `force` | boolean | True only when `--force` was supplied. |

Lifecycle: created by CLI Command Parser, passed to Setup Application Service, never persisted by U1.

### HelpRequest

| Attribute | Type | Rule |
|---|---|---|
| `reason` | `explicit` / `no-command` | Determines help exit behavior if needed. |
| `commands` | string[] | Must list `install` and `upgrade` only. |
| `runtimeNote` | string | Must state Bun requirement and best-effort `npx` delegation. |

Lifecycle: created by parser when help should render; ends after output.

### ParseFailure

| Attribute | Type | Rule |
|---|---|---|
| `code` | string | Classified error code such as `unsupported-command`. |
| `message` | string | Human-readable stderr. |
| `noFilesModified` | true | Always true for U1 parse/runtime failures. |
| `nextAction` | optional string | One concrete next action. |

Lifecycle: created by parser/runtime shell, rendered by reporter, exits non-zero.

### EntrypointResult

| Attribute | Type | Rule |
|---|---|---|
| `code` | number | Process exit code. |
| `stdout` | string | Help, plan, or result output. |
| `stderr` | string | Validation/runtime errors. |

Lifecycle: output of `runSetup`, mapped to process streams by the bin wrapper.

## Relationships

```text
PackageIdentity
  owns bin metadata for
RuntimeInvocation
  creates either
HelpRequest | SetupCommand | ParseFailure
SetupCommand
  delegates to Setup Application Service
ParseFailure
  renders as EntrypointResult
HelpRequest
  renders as EntrypointResult
```

## State Boundaries

- U1 has no target-project persistent state.
- U1 does not create or update the installer manifest.
- U1 does not read source distribution metadata.
- U1 does not inspect target sentinel files.
- U1's only durable repository data is `packages/setup/package.json`, bin wrapper source, parser source, and package validation configuration.

## Downstream Contracts

| Entity | Downstream Consumer | Contract |
|---|---|---|
| `SetupCommand` | U2/U3/U4/U5 through Setup Application Service | command, harness, target, version, yes, force |
| `PackageIdentity` | U7 CI And Package Gates, U8 Manual Release And Docs | publishable metadata and bin name |
| `ParseFailure` | Reporter / tests | classified no-write error |
| `HelpRequest` | README/docs and smoke tests | canonical command listing |

## Traceability

- `requirements.md` FR-001, FR-002, FR-003, FR-004, FR-011 define the entities' accepted states.
- `unit-of-work.md` U1 defines ownership boundaries.
- `unit-of-work-story-map.md` maps these entities to US-001, US-003, US-004, and US-009.
- `components.md`, `component-methods.md`, and `services.md` define how these value objects connect to the application service and later units.

