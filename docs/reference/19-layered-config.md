# Layered Configuration Resolver

> Languages: **English** | [日本語](19-layered-config.ja.md)

> Part of the [Developer Reference](00-overview.md)

`packages/framework/core/tools/amadeus-config.ts` is the source of truth for
the read-only layered configuration resolver. Its registry defines every
supported leaf path, default, allowed layer, replacement merge rule, and
domain parser.

## Layers and merge semantics

The resolver reads these optional, Git-shared files in order:

```text
Project: amadeus/config.json
Space:   amadeus/spaces/<space>/config.json
Intent:  amadeus/spaces/<space>/intents/<intent>/config.json
```

Later layers replace earlier values per leaf. Arrays replace rather than
append. An absent leaf inherits, an empty object is a no-op, and `null` is
invalid. Any invalid file or leaf rejects the whole result after all
diagnostics have been collected. The resolver never caches, retries, or
writes.

## Canonical schema

```json
{
  "intent-mirror": {
    "github": {
      "issue": { "mode": "prompt" },
      "project": { "targets": [] }
    }
  },
  "solo-election": { "trigger": { "mode": "manual" } },
  "finding": {
    "github": { "issue": { "creation": { "mode": "prompt" } } }
  },
  "swarm": { "unit": { "concurrency": { "limit": 4 } } },
  "plugin": { "activation": { "names": [] } },
  "subagent": { "dispatch": { "enforced-models": ["opus", "sonnet"] } }
}
```

| Path | Values and default | Layers |
|------|--------------------|--------|
| `intent-mirror.github.issue.mode` | `off \| prompt \| auto`; `prompt` | Project, Space, Intent |
| `intent-mirror.github.project.targets` | target array; `[]` | Project, Space, Intent |
| `solo-election.trigger.mode` | `manual \| auto`; `manual` | Project, Space, Intent |
| `finding.github.issue.creation.mode` | `off \| prompt \| auto`; `prompt` | Project, Space, Intent |
| `swarm.unit.concurrency.limit` | integer `1..4`; `4` | Project, Space, Intent |
| `plugin.activation.names` | sorted unique plugin-name array; `[]` | Project only |
| `plugin.scope-bindings` | plugin-to-stage-to-unique-scope-array map; `{}` | Project only |
| `subagent.dispatch.enforced-models` | non-empty unique model-name array; `["opus","sonnet"]` | Project, Space, Intent |

Unknown paths and legacy flat keys are errors. Legacy-key diagnostics identify
the structured replacement; the resolver does not migrate or alias them.
`observability` remains delegated to its existing resolver and is tolerated at
the root without becoming part of this registry.

## Project targets and plugins

Each Project target requires `project: "<owner>/<positive integer>"` and may
set a non-empty `phase-field` (default `Intent Phase`) plus non-empty
`status-names` values for `ideation`, `inception`, `construction`, `operation`,
and `done`. Normalized duplicate Project identities are rejected; input order
is preserved.

Plugin names must be unique, 1–64 characters, and match
`^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`. They are normalized to ascending
order because activation is a set.

## CLI integrations

- Automatic elections use `open --trigger auto`; manual opens use
  `--trigger manual` (the default). When the resolved mode is `manual`, an
  automatic request returns
  `{"opened":null,"reason":"solo-election-manual-trigger-required"}`.
- Finding creation uses the `create-github-issue` subcommand. The resolved
  mode gates GitHub access before readiness checks or mutation.
- Swarm concurrency flags may narrow, but never exceed, the resolved limit.

## Tests

- `tests/unit/t431-structured-config.test.ts` covers schema, defaults,
  precedence, replacement, normalization, and legacy diagnostics.
- `tests/integration/t257-amadeus-config.integration.test.ts` covers real
  filesystem resolution and read safety.
- Election, finding, mirror, swarm, and plugin integration suites cover their
  public CLI and consumer boundaries.

For placement and user examples, see
[Layered Configuration](../guide/21-layered-config.md).
