# Layered Configuration Resolver

> Languages: **English** | [日本語](19-layered-config.ja.md)

> Part of the [Developer Reference](00-overview.md)

The layered configuration resolver is a read-only component shared by mirror
routing and solo-election activation. Its source of truth is
`packages/framework/core/tools/amadeus-mirror-config.ts`.

## Contract

`resolveMirrorConfig(projectDir, intentDir?, space?, hooks?)` derives and reads
these paths:

```text
<workspace>/amadeus/config.json
<workspace>/amadeus/spaces/<space>/config.json
<workspace>/amadeus/spaces/<space>/intents/<intentDir>/config.json
```

The resolver uses explicit selectors when supplied and otherwise resolves the
active space and intent. It performs no caching, retry, or write operation.

Each level produces `parsed`, `absent`, or `invalid`. `ENOENT`, including a
dangling symbolic link, means `absent`; other I/O failures mean `invalid`.
After parsing all levels, it either returns every invalid level and all errors
collected within it, or applies Global, Space, then Intent values independently
per key.

The operation is atomic from the caller's perspective: an invalid level never
produces a partial resolved configuration.

## Schema

The accepted JSON shape is:

```json
{
  "auto-mirror": "prompt",
  "mirror-projects": [],
  "auto-solo-election": true
}
```

The closed key allowlist is the schema boundary. The parser rejects unknown
keys, non-object roots, values outside the `auto-mirror` mode set, malformed
Project targets, and non-boolean `auto-solo-election` values. Defaults are
`autoMirror: "prompt"`, an empty Project list, and
`autoSoloElection: false`.

## Solo-election integration

An automatic solo-election open uses `open --trigger auto-solo`. The CLI
resolves configuration before reading the definition or writing the election
store. Unless `autoSoloElection` is `true`, it returns
`{"opened":null,"reason":"auto-solo-election-disabled"}` and writes nothing.
Ordinary `open` remains the explicit activation path.

## Phase-boundary integration

`amadeus-orchestrate.ts` resolves the configuration after detecting a verified
phase boundary and before choosing the mirror directive.

- Invalid resolution emits an error directive and stops routing.
- `autoMirror: "auto"` plus an existing Mirror Issue emits a print directive
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
