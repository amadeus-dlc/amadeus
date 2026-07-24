# formal-model-check plugin

An opt-in Amadeus plugin that adds one construction-phase stage,
`formal-model-check`, which runs an exhaustive TLC exploration of a TLA+ model
via the `run-model-check` CLI. The stage carries an empty `scopes:` list, so it
is never selected by a stock scope — it runs only on an explicit
`amadeus-orchestrate next --stage formal-model-check --single` invocation.

## Bundle layout

```
formal-model-check/
  plugin.json
  plugins/formal-model-check/stages/formal-model-check.md
  README.md
```

`plugin.json`'s `stages[].path` is declared **host-tree-relative**
(`plugins/formal-model-check/stages/formal-model-check.md`): the compose engine
writes a stage copy to that path verbatim under the host root, so the composed
stage lands exactly where the stage-graph compile discovers plugin stages
(`<hostRoot>/plugins/<name>/stages/`). The bundle therefore nests the stage file
under a matching `plugins/formal-model-check/` prefix inside the plugin dir.

## Opt-in runtime dependency (documented per FR-2.3)

The stage's `run-model-check` execution needs a Java toolchain and TLC
(`tla2tools.jar`). These are **not** part of the Bun-only framework baseline —
they are opt-in dependencies of this plugin, provisioned per execution surface:

- **Local (macOS)**: a JDK (Eclipse Temurin, major 26) plus `sandbox-exec` for
  process isolation. The provider builds the `sandbox-exec` argv and verifies
  the sandbox profile before spawning TLC.
- **CI (Linux)**: a Docker container built from the official `eclipse-temurin`
  image (pinned by digest) with the official `tla2tools.jar` from GitHub
  Releases (pinned by version + checksum). No `sandbox-exec` — the hosted runner
  is already an isolated environment (feasibility Q3 user ruling).

Images/toolchains are pinned (digest / version + checksum) so a check is
reproducible: the same model + config + image digest yields the same verdict
(NFR-1). The framework's Bun-only distribution surface is unaffected — with the
plugin absent (or dropped), the shipped `dist/` stage graph is byte-identical to
a zero-plugin build.

## Compose / doctor / drop

- **compose**: lands the stage under `<hostRoot>/plugins/formal-model-check/`,
  where the stage-graph compile joins it into the graph.
- **doctor**: reports the plugin as `composed`.
- **drop**: removes the stage; the next compile returns to the 0-plugin
  baseline.
