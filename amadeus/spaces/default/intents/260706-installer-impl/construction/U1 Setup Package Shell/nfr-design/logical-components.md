# Logical Components — U1 Setup Package Shell

> Stage: construction / nfr-design  
> Unit: U1 Setup Package Shell  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Component Inventory

| Component | Responsibility | Failure domain | Blast radius |
|---|---|---|---|
| npm bin wrapper | Node/npm entrypoint, Bun discovery, safe delegation | runtime startup | command exits before downstream behavior |
| Bun CLI entrypoint | process boundary, top-level error mapping | local process | stdout/stderr/exit code only |
| Command parser | command/flag grammar and classified parse errors | in-memory parser | no target mutation |
| Help renderer | canonical help text | output rendering | docs/snapshot drift only |
| Error renderer | stable user-facing stderr and next action | output rendering | command failure diagnostics only |
| Setup application service boundary | receives valid `SetupCommand` | downstream units | U2-U5 effects only after valid parse |
| Package metadata checker | maintainer validation of package manifest/files | CI/release tooling | PR/release gate failure |

## Isolation Strategy

- Wrapper and parser components must not depend on U2-U5 adapters.
- Help and error renderers are pure string/rendering components.
- Package metadata checker is maintainer tooling and not part of user help startup.
- Application service boundary is the only U1 path to downstream installer behavior.
- Filesystem/network/prompt ports are absent from U1 components except downstream service boundary types.

## Failure Domain Mapping

| Failure | Contained by | Expected result |
|---|---|---|
| Bun missing | npm bin wrapper | `bun-required`, no target access |
| invalid grammar | command parser | classified error, no service call |
| help drift | help renderer snapshot | test failure, no runtime mutation |
| secret-like env present | error renderer | no env dump |
| package metadata invalid | package metadata checker | U7/U8 gate failure |
| downstream service failure | application service boundary | mirror `ExitResult` or top-level classified fallback |

## Infrastructure Bridge

U1 does not require cloud infrastructure, databases, queues, caches, load balancers, or persistent storage. Infrastructure Design should treat U1 as local CLI/package infrastructure:

- npm package metadata and bin exposure;
- GitHub Actions package validation;
- release workflow dry-run/package dry-run evidence;
- CI smoke command execution;
- no hosted service availability target.

## Upstream Coverage

- `performance-requirements.md`: component isolation prevents accidental heavy imports and timing regressions.
- `security-requirements.md`: wrapper/parser/package checker components map to security controls.
- `scalability-requirements.md`: stateless component boundaries support single-process scaling constraints.
- `reliability-requirements.md`: failure domains map to classified exits and no-write guarantees.
- `tech-stack-decisions.md`: Bun/TypeScript, `packages/setup/`, parser, reporter, and package validation decisions define the component set.
- `business-logic-model.md`: Startup, parsing, help, delegation, and integration boundaries define component responsibilities.

