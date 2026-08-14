# formal-model-check plugin

An opt-in Amadeus plugin that adds the `tla-authoring` and
`formal-model-check` construction stages. The plugin declares no workflow
scope; the host assigns either stage to its own scopes in project configuration.
Authoring runs first; the checker then performs an
exhaustive TLC exploration only when the applicability outcome requires one.
Both stages also remain directly invocable with `--single`. A spec-hash
advisory remains an additional trigger when a watched model changes.

Activation has four read-only outcomes: `not-ready` when no valid declared
model/config target exists, `never-run` when targets exist without a successful
verdict, `changed` when targets differ from that verdict, and `current` when
they match. Installation succeeds in `not-ready`; only an explicit model-check
run requires a valid `amadeus/spaces/<space>/specs/tla/model-map.json` target. Startup never launches
TLC.

An advisory-correlated local run receives the three all-or-none CLI options
`--advisory-target`, `--advisory-spec-identity`, and `--advisory-instance`.
They are copied into `manifest.json` alongside source provenance for the actual
model/config bytes. Validation of that plugin-specific evidence remains in this
plugin; core does not interpret its schema.

## Bundle layout

```text
formal-model-check/
  plugin.json
  sensors/amadeus-model-completeness.md
  stages/formal-model-check.md
  stages/tla-authoring.md
  tools/
  README.md
```

The bundle supplies two stages: `tla-authoring` assesses requirements and
carries applicable subjects to a registered model (authoring, referees,
independent review, human gate, registration), then `formal-model-check` checks
the resulting registration. Both retain `scopes: []`; direct stage invocation
works without a binding, while automatic workflow selection is host-owned.

For this repository, `amadeus/config.json` binds both stages to the four
`self-*` scopes through `plugin.scope-bindings`. A consumer can bind the same
stages to any scope it defines; the plugin contains no concrete host scope.

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

## Local execution requirements

The planner verifies the JDK by **major version** — it accepts any
`openjdk version "26.…"` from `$JAVA_HOME/bin/java` and rejects every other
major. The model-check receipt stays a reproducibility contract (NFR-1) because
each run records the exact build it used: the receipt binds the `java -version`
output and the executable checksum, so a patch release is visible in the
evidence without being a precondition of running at all.

This repository still pins one build in `mise.toml`, as the way it supplies a
JDK rather than as the contract:

```toml
[tools]
java = "temurin-26.0.1+8"
```

Run `mise trust` once after cloning. With the pin active, `bun` inside the
repository resolves `JAVA_HOME` to a major 26 JDK and `run-model-check` works
with no prefix.

**Why a repo-level pin rather than an exported variable.** When a machine's
global mise activates a different JDK, `bun` resolved through a mise shim
re-applies that global `JAVA_HOME` while resolving the shim — so `export
JAVA_HOME=…` and even `JAVA_HOME=… bun …` arrive already overwritten. The only
visible symptom was `ENVIRONMENT_UNAVAILABLE`, which cost four separate intents
the same rediscovery (#2410). The repo-level pin removes the mismatch at the
source.

**Diagnosing a failure.** `ENVIRONMENT_UNAVAILABLE` now names the check, the
expectation, and the observation:

```
run-model-check: HARNESS_ERROR (ENVIRONMENT_UNAVAILABLE) — Darwin environment
inspection failed: Error: OpenJDK major 26 verification failed: expected
`openjdk version "26.…"` from JAVA_HOME=/…/temurin-25.0.2+9, observed `openjdk
version "25.0.2" 2025-10-21` (see {{HARNESS_DIR}}/plugins/formal-model-check/README.md § Local
execution requirements)
```

The same string is carried on the JSON line as `errorDetail`.

**Supplying a JDK without the repo pin.** Outside the repository (or with the
pin inactive), name a major 26 build explicitly:

```
mise x java@temurin-26.0.1+8 -- bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/run-model-check.ts …
```

**Provider fallback.** `--provider auto` on macOS tries `sandbox-exec` first and
falls back to the Docker provider when the host cannot supply the sandbox-exec
environment — a missing or non-26 `JAVA_HOME`, or a sandbox probe that does not
deny the network. The published `env-receipt.json` always describes the provider
that actually ran. When neither provider is usable the run fails closed with
`ENVIRONMENT_UNAVAILABLE` (exit 2) and the detail names both refusals. An
explicit `--provider sandbox-exec` or `--provider docker` never falls back: it
is a request for that one isolation mode and fails loudly instead.

Local `sandbox-exec` execution needs the macOS built-in of the same name. CI
uses the Docker provider and does not read `JAVA_HOME`.

## Working with models

All execution surfaces resolve targets from `amadeus/spaces/<space>/specs/tla/model-map.json`. The
local runner selects one registered pair from the explicit `--model` / `--cfg`
paths and binds source bytes, vocabulary, and receipt to that same model. CI
and diagnostic runners check every registered pair when `--model` is omitted,
or exactly one registered pair with `--model <registered-name>`; unknown names
and source drift fail closed. `FormalElection` retains its frozen receipt,
while every other registered model uses a receipt derived from its verified
source.

For local runs, pass a fresh, previously unused directory to `--out`. The
publisher fails closed with `OUT_CONFLICT` (`HARNESS_ERROR`, exit 2) if that
directory already exists; use a new output path when rerunning the check.

Two reference chapters cover the model lifecycle around this stage:

- [Keeping a Formal Model in Step with Its Implementation](../../docs/reference/21-formal-model-following.md)
  — reading the `model-completeness` drift signal and deciding between an
  implementation-hash refresh (`updateModelMap --impl-only`) and a model
  revision.
- [Supplying a Formal Model for a New Protocol](../../docs/reference/22-formal-model-supply.md)
  — choosing a subject, declaring the reduction manifest, registering the model
  in `amadeus/spaces/<space>/specs/tla/model-map.json`, and the falling proof plus vacuity guard a new
  model must pass before it counts as evidence.

## Compose / doctor / drop

- **compose**: lands the stage under `<hostRoot>/plugins/formal-model-check/`,
  where the stage-graph compile joins it into the graph.
- **doctor**: reports the plugin as `composed`.
- **drop**: removes the stage; the next compile returns to the 0-plugin
  baseline.
