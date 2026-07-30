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
- `autoMirror: "auto"` emits a print directive that runs the fixed lifecycle
  boundary command. The mirror coordinator selects guarded `create` when no
  Mirror Issue exists and guarded `sync` when one does.
- `autoMirror: "prompt"` is the only mode that emits an ask directive. When no
  Mirror Issue exists, `create` is included alongside `sync` and `skip`.
- `autoMirror: "off"` emits neither a mirror question nor a GitHub mutation.

The durable identity and receipt protocol makes interrupted automatic create
or sync retry-safe: `pending` is recorded before the lifecycle operation and
`completed` after success. If remote create succeeds but local persistence
fails, retry converges on the same Issue instead of creating a duplicate.

## Tests

The contract is covered by:

- `tests/unit/t257-amadeus-mirror-config.test.ts` for parsing, merging,
  defaults, path derivation, and reader behavior;
- `tests/integration/t257-amadeus-mirror-config.integration.test.ts` for real
  filesystem precedence and failure cases;
- `tests/integration/t265-engine-boundary.integration.test.ts` for all six
  mode-by-Issue boundary combinations;
- `tests/e2e/t265-engine-boundary.test.ts` for automatic lifecycle delegation
  and receipt recovery.

For placement and user examples, see
[Layered Configuration](../guide/21-layered-config.md).
