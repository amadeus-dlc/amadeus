# Vendored OpenTelemetry API (FR-DST-1)

The shipped framework runs `bun <file>.ts` in user projects with no
`node_modules`, so runtime dependencies must be taken into the distributable
bundle itself. This directory vendors the two OTel API packages the Amadeus
Providers are implemented against — API surface only, no SDK.

| Package | Version | Source | License |
|---|---|---|---|
| `@opentelemetry/api` | 1.9.1 | npm `build/esm` tree (`.js` + `.d.ts`, source maps omitted) | Apache-2.0 (per-package `LICENSE`) |
| `@opentelemetry/api-logs` | 0.221.0 | npm `build/esm` tree (`.js` + `.d.ts`, source maps omitted) | Apache-2.0 (per-package `LICENSE`) |

The files are byte-identical to the npm artifacts — never hand-edit them.
To upgrade: bump the pinned devDependencies in the root `package.json`, then
re-copy the `build/esm` trees and `LICENSE` files, and re-run the API
singleton + bundle checks (`tests/unit/otel/`).

`@opentelemetry/context-async-hooks` is deliberately NOT vendored: its
published build is CommonJS with a bare `require("@opentelemetry/api")` that
would need patching to resolve against this tree. The ContextManager is
implemented directly on `node:async_hooks` in `../../otel/context-manager.ts`
against the OTel ContextManager interface (Phase 1 ADR, decisions.md).
