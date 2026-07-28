# Layered Configuration

> Languages: **English** | [日本語](21-layered-config.ja.md)

> Part of the [AI-DLC documentation](../README.md) · [User Guide](00-introduction.md)

Amadeus resolves repository-shared settings at three levels. Use the highest
level that matches the audience for the setting:

| Level | File | Applies to |
|-------|------|------------|
| Global Config | `amadeus/config.json` | Every space and intent in the repository |
| Space Config | `amadeus/spaces/<space>/config.json` | Every intent in one space |
| Intent Config | `amadeus/spaces/<space>/intents/<intent>/config.json` | One intent |

All three files are optional and intended to be committed to Git. There is no
machine-local configuration level.

## Precedence

Amadeus reads the files in this order:

```text
Global Config → Space Config → Intent Config
```

Later, more specific levels override earlier levels key by key. For example,
`amadeus/config.json` may keep solo elections manual by default:

```json
{
  "auto-solo-election": false
}
```

The `payments` space can opt in to automatic solo elections in
`amadeus/spaces/payments/config.json`:

```json
{
  "auto-solo-election": true
}
```

Every intent in that space uses `true` unless its Intent Config overrides the
value. Other spaces continue to use `false`.

## Supported settings

| Key | Type | Default | Effect |
|-----|------|---------|--------|
| `auto-mirror` | `"off"` \| `"prompt"` \| `"auto"` | `"prompt"` | Controls mirror synchronization at verified phase boundaries |
| `mirror-projects` | project target array | `[]` | Maps an intent to GitHub Project targets and optional status names |
| `auto-solo-election` | boolean | `false` | Enables automatic solo elections for design deviations, blockers, and §13 learning selection |

`auto-solo-election` controls automatic activation only. When it is absent or
`false`, a user can still explicitly request an election. Specification
changes and other human-only escalation decisions never become election
eligible.

## Validation and failure behavior

Configuration is fail-closed:

- the root value must be a JSON object;
- unknown keys are rejected;
- each setting must match the type in the table above;
- malformed JSON or an unreadable configuration file is an error;
- a missing file is treated as an absent level;
- if any present level is invalid, Amadeus rejects the whole resolved
  configuration instead of applying the remaining levels.

When a configuration error stops phase-boundary routing, fix every reported
level and run the workflow again. Errors include their level (`global`,
`space`, or `intent`) so that the affected file can be identified.

For the implementation contract, see
[Layered Configuration Resolver](../reference/19-layered-config.md).
