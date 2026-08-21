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
  "intent-mirror": { "github": { "issue": { "consent": "prompt" } } },
  "swarm": { "unit": { "concurrency": { "limit": 4 } } },
  "plugin": { "activation": { "names": ["github-pr-convergence"] } },
  "subagent": { "dispatch": { "enforced-models": ["opus", "sonnet"] } }
}
```

Space override:

```json
{
  "intent-mirror": { "github": { "issue": { "consent": "auto" } } },
  "swarm": { "unit": { "concurrency": { "limit": 2 } } }
}
```

## Supported paths

| Path | Values | Default |
|------|--------|---------|
| `intent-mirror.github.issue.consent` | `off \| prompt \| auto` | `prompt` |
| `intent-mirror.github.project.targets` | Project target array | `[]` |
| `finding.github.issue.creation.consent` | `off \| prompt \| auto` | `prompt` |
| `swarm.unit.concurrency.limit` | integer `1..4` | `4` |
| `plugin.activation.names` | plugin-name array; Project only | `[]` |
| `plugin.scope-bindings` | plugin-to-stage-to-scope map; Project only | `{}` |
| `plugin.settings` | plugin-to-setting-key scalar map; merged per key | `{}` |
| `subagent.dispatch.enforced-models` | model-name array (aliases match full ids) | `["opus","sonnet"]` |

There is no `solo-election.trigger.mode` config path. The solo-election
auto-trigger is DERIVED from the active Intent's Autonomy Mode (`none` ->
manual, `semi`/`full` -> auto) — it is not configurable.

Configuration is fail-closed. Unknown paths, legacy flat keys, `null`, malformed
JSON, unreadable files, and invalid values reject the whole result. Diagnostics
for a *renamed* legacy key (the consent-axis keys above, `.mode` -> `.consent`)
name the new structured path; the *abolished* `solo-election.trigger.mode` key
diagnoses without naming a replacement path, since none exists. No compatibility
alias is provided for either case.

See [Layered Configuration Resolver](../reference/19-layered-config.md) for the
complete target and validation contract.
