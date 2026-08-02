# Layered Configuration Resolver

> Languages: **English** | [日本語](19-layered-config.ja.md)

> Part of the [Developer Reference](00-overview.md)

The layered configuration resolver is a read-only component shared by mirror
routing, solo-election activation, and Amadeus finding filing. Its source of truth is
`packages/framework/core/tools/amadeus-config.ts`.

## Contract

`resolveAmadeusConfig(projectDir, intentDir?, space?, hooks?)` derives and reads
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
  "auto-solo-election": true,
  "auto-file-findings": "prompt",
  "plugins": ["formal-model-check"]
}
```

The closed key allowlist is the schema boundary. The parser rejects unknown
keys, non-object roots, values outside the `auto-mirror` mode set, malformed
Project targets, and non-boolean `auto-solo-election` values. Defaults are
`autoMirror: "prompt"`, an empty Project list, and
`autoSoloElection: false`. `auto-file-findings` accepts the same mode set as
`auto-mirror` and defaults to `autoFileFindings: "prompt"`. `plugins` is a
project-only, sorted unique name array and defaults to `[]`; its presence at the
Space or Intent layer is a configuration error.

## Solo-election integration

An automatic solo-election open uses `open --trigger auto-solo`. The CLI
resolves configuration before reading the definition or writing the election
store. Unless `autoSoloElection` is `true`, it returns
`{"opened":null,"reason":"auto-solo-election-disabled"}` and writes nothing.
Ordinary `open` remains the explicit activation path.

## Finding-filer integration

`amadeus-finding.ts file` resolves configuration before any GitHub readiness
check or mutation. `"off"` returns without contacting GitHub, `"prompt"`
returns an approval-required outcome, and `"auto"` proceeds through the
finding coordinator. `--approved` is the explicit human path for `"off"` and
`"prompt"`.

The coordinator targets only `amadeus-dlc/amadeus`. It hashes the caller's
stable fingerprint into a body marker, searches open and closed Issues through
the GitHub Gateway, and creates only after a zero-match result. One match is
reused; multiple matches fail closed. The create call requires a
coordinator-minted permit bound to the repository and exact body marker.
Defects use the repository's existing `bug` label; concerns use `enhancement`.
The Issue body is read through the shared descriptor-based contained-file
reader, which rejects symlinks, workspace escapes, non-regular files, growth
beyond 64 KiB, and identity changes before or during the read.

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

- `tests/unit/t257-amadeus-config.test.ts` for parsing, merging,
  defaults, path derivation, and reader behavior;
- `tests/integration/t257-amadeus-config.integration.test.ts` for real
  filesystem precedence and failure cases;
- `tests/integration/t265-engine-boundary.integration.test.ts` for all six
  mode-by-Issue boundary combinations;
- `tests/e2e/t265-engine-boundary.test.ts` for automatic lifecycle delegation
  and receipt recovery.
- `tests/unit/t366-amadeus-finding-coordinator.test.ts` for mode routing,
  marker idempotency, and duplicate handling;
- `tests/integration/t366-amadeus-finding-cli.integration.test.ts` for the
  public CLI boundary;
- `tests/integration/t368-amadeus-finding-cli.integration.test.ts` for invalid arguments, unsafe
  body files, and exit-code behavior;
- `tests/integration/t368-safe-contained-file.integration.test.ts` for
  descriptor-bound containment and size enforcement;
- `tests/integration/t367-amadeus-finding-protocol.integration.test.ts` for the
  all-stage finding admission contract.

For placement and user examples, see
[Layered Configuration](../guide/21-layered-config.md).
