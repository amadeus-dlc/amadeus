# Security Design — U1 Setup Package Shell

> Stage: construction / nfr-design  
> Unit: U1 Setup Package Shell  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U1 security is a process-boundary design. It prevents command confusion, wrapper command injection, accidental target mutation before validation, secret leakage in errors, and overbroad npm package contents. It does not perform authentication, authorization, archive integrity validation, or target write policy.

## Trust Boundaries

| Boundary | Trusted input | Untrusted input | Control |
|---|---|---|---|
| npm bin wrapper | fixed Bun executable name | argv and process env | spawn argv array, never shell string |
| command parser | supported command grammar | raw argv | classified `SetupError` before delegation |
| error renderer | stable error codes | user paths/env-derived context | no full env dump, no stack trace for user errors |
| package metadata gate | package manifest allowlist | repository files | package dry-run and U7 metadata gate |

## Wrapper Delegation Design

- Bun discovery uses a fixed executable lookup and platform-aware PATH delimiter.
- Delegation passes original argv as an array with inherited stdio.
- The wrapper must not use shell concatenation, interpolation, or user-controlled executable names.
- If Bun is absent, the wrapper emits `bun-required` and performs no downstream import.

## Parser Security Design

- Accept only `install`, `upgrade`, help, and help aliases.
- Reject `init` as `unsupported-command`.
- Reject unknown commands, duplicate harness values, unsupported harness values, and multiple command names before application-service construction.
- Preserve `--target` as a string but never resolve, normalize to absolute path, read, or write it inside U1.
- Preserve `--yes` and `--force` flags without applying collision or backup policy.

## Package Contents Controls

- `packages/setup/package.json` is the publishable package manifest; root `package.json` remains dev-only.
- Package `files` allowlist includes the built CLI and package docs only.
- Package dry-run rejects local memory, audit, worktree state, credentials, unrelated repo dev files, and test fixtures not needed at runtime.
- License and repository metadata are checked by maintainer scripts and U7/U8 gates.

## Upstream Coverage

- `performance-requirements.md`: no heavy imports on help/error paths reduces attack surface.
- `security-requirements.md`: command injection, package contents, secret-safe diagnostics, and no target mutation define controls.
- `scalability-requirements.md`: single-process stateless design removes shared mutable security state.
- `reliability-requirements.md`: classified errors and no-write invariants provide enforceable security outcomes.
- `tech-stack-decisions.md`: Bun/TypeScript, argv-array spawn, and dependency policy define implementation constraints.
- `business-logic-model.md`: Startup, command parsing, help, and delegation workflows define trust boundaries.

