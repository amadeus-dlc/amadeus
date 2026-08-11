# Layered Configuration

> Languages: **English** | [日本語](21-layered-config.ja.md)

> Part of the [AI-DLC documentation](../README.md) · [User Guide](00-introduction.md)

Amadeus resolves Git-shared settings from Project, Space, and Intent files:

| Level | File | Applies to |
|-------|------|------------|
| Project | `amadeus/config.json` | The repository |
| Space | `amadeus/spaces/<space>/config.json` | One space |
| Intent | `amadeus/spaces/<space>/intents/<intent>/config.json` | One intent |

All files are optional. Resolution order is `Project → Space → Intent`; a
later value replaces the same leaf from an earlier file. Arrays replace rather
than append.

## Example

Project defaults:

```json
{
  "solo-election": { "trigger": { "mode": "manual" } },
  "swarm": { "unit": { "concurrency": { "limit": 4 } } },
  "plugin": { "activation": { "names": ["formal-model-check"] } },
  "subagent": { "dispatch": { "enforced-models": ["opus", "sonnet"] } }
}
```

Space override:

```json
{
  "solo-election": { "trigger": { "mode": "auto" } },
  "swarm": { "unit": { "concurrency": { "limit": 2 } } }
}
```

## Supported paths

| Path | Values | Default |
|------|--------|---------|
| `intent-mirror.github.issue.mode` | `off \| prompt \| auto` | `prompt` |
| `intent-mirror.github.project.targets` | Project target array | `[]` |
| `solo-election.trigger.mode` | `manual \| auto` | `manual` |
| `finding.github.issue.creation.mode` | `off \| prompt \| auto` | `prompt` |
| `swarm.unit.concurrency.limit` | integer `1..4` | `4` |
| `plugin.activation.names` | plugin-name array; Project only | `[]` |
| `plugin.scope-bindings` | plugin-to-stage-to-scope map; Project only | `{}` |
| `subagent.dispatch.enforced-models` | model-name array (aliases match full ids) | `["opus","sonnet"]` |

Configuration is fail-closed. Unknown paths, legacy flat keys, `null`, malformed
JSON, unreadable files, and invalid values reject the whole result. Diagnostics
for legacy keys name the new structured path; no compatibility alias is
provided.

See [Layered Configuration Resolver](../reference/19-layered-config.md) for the
complete target and validation contract.
