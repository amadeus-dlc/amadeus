# formal-model-check plugin

An opt-in Amadeus plugin that adds one construction-phase stage,
`formal-model-check`, which runs an exhaustive TLC exploration of a TLA+ model
via the `run-model-check` CLI. The stage carries an empty `scopes:` list, so it
is never selected by a stock scope. Install is the opt-in boundary: once
composed it runs on an explicit `amadeus-orchestrate next --stage
formal-model-check` invocation (`--single` optional). Amadeus never runs it
automatically — the engine only emits a spec-hash advisory when the watched
spec changed (U6 activation-policy).

Activation has four read-only outcomes: `not-ready` when no valid declared
model/config target exists, `never-run` when targets exist without a successful
verdict, `changed` when targets differ from that verdict, and `current` when
they match. Installation succeeds in `not-ready`; only an explicit model-check
run requires a valid `specs/tla/model-map.json` target. Startup never launches
TLC.

An advisory-correlated local run receives the three all-or-none CLI options
`--advisory-target`, `--advisory-spec-identity`, and `--advisory-instance`.
They are copied into `manifest.json` alongside source provenance for the actual
model/config bytes. The engine accepts only a complete, non-partial,
provenance-matching `NOT_DETECTED` result for that exact advisory instance.

## Bundle layout

```
formal-model-check/
  plugin.json
  stages/formal-model-check.md
  README.md
```

`plugin.json`'s `stages[].path` is declared relative to the plugin root
(`stages/formal-model-check.md`). The compose engine resolves the bytes from
that bundle path and independently namespaces the host target as
`plugins/<plugin-name>/<stage-path>`. The composed stage therefore lands at
`<hostRoot>/plugins/formal-model-check/stages/formal-model-check.md`, exactly
where stage-graph compilation discovers plugin stages, without duplicating the
plugin namespace inside the source bundle.

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

## Working with models

All execution surfaces resolve targets from `specs/tla/model-map.json`. The
local runner selects one registered pair from the explicit `--model` / `--cfg`
paths and binds source bytes, vocabulary, and receipt to that same model. CI
and diagnostic runners check every registered pair when `--model` is omitted,
or exactly one registered pair with `--model <registered-name>`; unknown names
and source drift fail closed. `FormalElection` retains its frozen receipt,
while every other registered model uses a receipt derived from its verified
source.

Two reference chapters cover the model lifecycle around this stage:

- [Keeping a Formal Model in Step with Its Implementation](../../docs/reference/21-formal-model-following.md)
  — reading the `model-completeness` drift signal and deciding between an
  implementation-hash refresh (`updateModelMap --impl-only`) and a model
  revision.
- [Supplying a Formal Model for a New Protocol](../../docs/reference/22-formal-model-supply.md)
  — choosing a subject, declaring the reduction manifest, registering the model
  in `specs/tla/model-map.json`, and the falling proof plus vacuity guard a new
  model must pass before it counts as evidence.

## Compose / doctor / drop

- **compose**: lands the stage under `<hostRoot>/plugins/formal-model-check/`,
  where the stage-graph compile joins it into the graph.
- **doctor**: reports the plugin as `composed`.
- **drop**: removes the stage; the next compile returns to the 0-plugin
  baseline.
