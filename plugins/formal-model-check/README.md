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
run requires a valid `amadeus/spaces/<space>/specs/tla/model-map.json` target. Startup never launches
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
  stages/tla-authoring.md
  README.md
```

The bundle supplies two stages: `formal-model-check` checks a registered model,
and `tla-authoring` carries a subject from an applicability route to a
registered one (authoring, referees, independent review, human gate,
registration). Both are opt-in — neither joins a stock scope.

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

The planner verifies the JDK by **exact patch version** — it accepts only
`openjdk version "26.0.1…"` from `$JAVA_HOME/bin/java`. That strictness is
deliberate: the model-check receipt is a reproducibility contract (NFR-1), and a
different JDK is a different toolchain identity.

This repository pins it in `mise.toml`:

```toml
[tools]
java = "temurin-26.0.1+8"
```

Run `mise trust` once after cloning. With the pin active, `bun` inside the
repository resolves `JAVA_HOME` to 26.0.1 and `run-model-check` works with no
prefix.

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
inspection failed: Error: OpenJDK 26.0.1 verification failed: expected `openjdk
version "26.0.1…"` from JAVA_HOME=/…/temurin-26.0.2+10, observed `openjdk
version "26.0.2" 2026-07-21` (see plugins/formal-model-check/README.md § Local
execution requirements)
```

The same string is carried on the JSON line as `errorDetail`.

**Fallback.** Without the repo pin (or outside the repository), force the
toolchain explicitly:

```
mise x java@temurin-26.0.1+8 -- bun plugins/formal-model-check/tools/run-model-check.ts …
```

Local execution also needs `sandbox-exec` (macOS built-in). CI uses the Docker
provider instead and does not read `JAVA_HOME`.

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
