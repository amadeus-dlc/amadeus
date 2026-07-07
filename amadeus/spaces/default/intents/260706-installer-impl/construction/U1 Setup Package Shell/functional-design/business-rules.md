# Business Rules — U1 Setup Package Shell

> Stage: functional-design / Unit: `U1 Setup Package Shell`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Command Contract Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U1-001 | The public executable name is `amadeus-setup`. | `requirements.md` FR-001, `unit-of-work.md` U1 |
| BR-U1-002 | The only supported action commands are `install` and `upgrade`. | `requirements.md` CLI Contract, `components.md` CLI Command Parser |
| BR-U1-003 | `init` is rejected and is not provided as an alias in the first release. | `requirements.md` CLI Contract, `component-methods.md` `parseCommand` |
| BR-U1-004 | Help output must not mention `init` as an available command. | `requirements.md` CLI Contract, FR-001, FR-002, `mockups.md` M1 |
| BR-U1-005 | One invocation targets exactly one harness. Duplicate harness flags or multiple harness values are rejected. | `requirements.md` FR-004, `stories.md` US-004 |
| BR-U1-006 | Supported harness values are `claude`, `codex`, `kiro`, and `kiro-ide`. | `requirements.md` FR-004, `component-methods.md` `Harness` |

## Runtime Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U1-007 | Bun is the required runtime for this release. | `requirements.md` FR-002 |
| BR-U1-008 | `bunx @amadeus-dlc/setup --help` must start successfully when Bun is available. | `stories.md` US-001 |
| BR-U1-009 | `npx @amadeus-dlc/setup` may delegate to Bun only when Bun is discoverable. | `requirements.md` FR-002 |
| BR-U1-010 | `npx @amadeus-dlc/setup` without Bun exits non-zero with a Bun-required message. | `requirements.md` FR-002 |
| BR-U1-011 | U1 must not promise full Node-only runtime compatibility. | `requirements.md` FR-002 |

## Safety Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U1-012 | Help, parser validation, unsupported command errors, and runtime errors must not read or write target files. | `requirements.md` FR-001/FR-004/FR-011 |
| BR-U1-013 | U1 must return classified errors before any U2-U5 behavior starts when command grammar is invalid. | `component-methods.md` `parseCommand`, `services.md` communication contracts |
| BR-U1-014 | Non-interactive missing `--harness`/`--target` validation is represented in the command/mode contract, but target mutation remains impossible in U1. | `requirements.md` FR-011, `component-methods.md` `resolveInteractionMode` |
| BR-U1-015 | `--force` does not imply `--yes`, does not fill missing values, and does not bypass shared-file backup rules. U1 only preserves flags for downstream policy. | `requirements.md` FR-010 |

## Package Metadata Rules

| Rule | Statement | Source |
|---|---|---|
| BR-U1-016 | Installer source lives under `packages/setup/`. | `requirements.md` FR-003 |
| BR-U1-017 | Root `package.json` remains dev-only and is not the publishable installer package. | `requirements.md` FR-003, `application-design/decisions.md` ADR-001 |
| BR-U1-018 | Package metadata includes valid `name`, `bin`, `license`, `repository`, and `files`. | `requirements.md` FR-001 |
| BR-U1-019 | License metadata reflects the repository's MIT + Apache-2.0 dual-license posture. | `requirements.md` FR-001 |
| BR-U1-020 | The package files allowlist must include the built CLI and package docs but not unrelated repository development files. | `unit-of-work.md` U1, `components.md` Package Check |

## Validation Outcomes

| Invalid Input | Error Code | Message Requirement | Next Action |
|---|---|---|---|
| `init` | `unsupported-command` | Say `install` replaces the old init wording for this release. | Use `amadeus-setup install`. |
| unknown command | `unknown-command` | List `install` and `upgrade`. | Run `amadeus-setup --help`. |
| duplicate harness | `duplicate-harness` | Explain one harness per invocation. | Run one command per harness. |
| unsupported harness | `unsupported-harness` | List supported harnesses. | Pick `claude`, `codex`, `kiro`, or `kiro-ide`. |
| Node/npm launch without Bun | `bun-required` | State Bun is required. | Install Bun or use `bunx`. |

## Testable Invariants

- Running help exits 0 and never creates files under a target directory.
- Parsing `init` exits non-zero and never delegates to the application service.
- Parsing `install --harness codex --target /tmp/project --yes` preserves `yes: true` and `force: false`.
- Parsing `install --harness codex --harness claude` rejects before version resolution.
- The package metadata check can run without network access.
