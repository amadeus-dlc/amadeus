# Layered Configuration Resolver

> Languages: **English** | [日本語](19-layered-config.ja.md)

> Part of the [Developer Reference](00-overview.md)

The layered configuration resolver is a read-only component used by
phase-boundary mirror routing. Its source of truth is
`packages/framework/core/tools/amadeus-mirror-config.ts`.

## Contract

`resolve(projectDir, space, intentDir, reader?)` derives and reads exactly
three paths:

```text
<workspace>/amadeus/config.json
<workspace>/amadeus/spaces/<space>/config.json
<workspace>/amadeus/spaces/<space>/intents/<intentDir>/config.json
```

The caller resolves the active space and intent. The resolver performs no
cursor lookup, caching, retry, or write operation.

Each level produces `parsed`, `absent`, or `invalid`. `ENOENT`, including a
dangling symbolic link, means `absent`; other I/O failures mean `invalid`.
After parsing all levels, `mergeLayers` either returns every invalid level and
all errors collected within it, or applies Global, Space, then Intent partial
values to `DEFAULT_MIRROR_CONFIG`.

The operation is atomic from the caller's perspective: an invalid level never
produces a partial resolved configuration.

## Schema

The accepted JSON shape is:

```json
{
  "auto-mirror": true
}
```

`MIRROR_CONFIG_KNOWN_KEYS` is the schema boundary. The parser rejects unknown
keys, non-object roots, and non-boolean `auto-mirror` values.
`DEFAULT_MIRROR_CONFIG.autoMirror` is `false`. The on-disk kebab-case key maps
to the TypeScript property `MirrorConfig.autoMirror`.

## Phase-boundary integration

`amadeus-orchestrate.ts` resolves the configuration after detecting a verified
phase boundary and before choosing the mirror directive.

- Invalid resolution emits an error directive and stops routing.
- `autoMirror: true` plus an existing Mirror Issue emits a print directive
  that runs `sync` and records the boundary receipt.
- Otherwise the engine emits an ask directive. When no Mirror Issue exists,
  `create` is included as a choice.

The receipt protocol makes interrupted automatic synchronization retry-safe:
`pending` is recorded before synchronization and `completed` after success.

## Tests

The contract is covered by:

- `tests/unit/t257-amadeus-mirror-config.test.ts` for parsing, merging,
  defaults, path derivation, and reader behavior;
- `tests/integration/t257-amadeus-mirror-config.integration.test.ts` for real
  filesystem precedence and failure cases;
- `tests/e2e/t265-engine-boundary.test.ts` for phase-boundary automatic
  synchronization and receipt recovery.

For placement and user examples, see
[Layered Configuration](../guide/21-layered-config.md).
