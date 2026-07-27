---
slug: formal-model-check
phase: construction
execution: CONDITIONAL
condition: Opt-in — runs only on an explicit `--stage formal-model-check --single` invocation; never auto-selected by a stock scope (scopes is empty).
lead_agent: amadeus-quality-agent
support_agents: []
mode: inline
produces: []
consumes: []
requires_stage: []
inputs: the externalised TLA+ model + config under specs/tla/ (FormalElection.tla / FormalElection.cfg) and the run-model-check CLI (scripts/formal-verif/run-model-check.ts).
outputs: the TLC exhaustive-exploration verdict (exit 0 detected / 1 not-detected / 2 harness-error) plus the report/artifacts written under the chosen --out directory.
sensors:
  - model-completeness
scopes: []
---

# Formal Model Check

The `formal-model-check` plugin stage runs a **single formal-model-check pass**:
an exhaustive TLC exploration of a declared TLA+ model, driven by the
`run-model-check` CLI. It is an opt-in plugin stage (empty `scopes:`), reachable
only via `amadeus-orchestrate next --stage formal-model-check --single`, so it
never joins a stock scope's workflow and never runs on `push` / `pull_request`.

## Stage body

1. Resolve the model + config to check. The default target is the externalised
   `specs/tla/FormalElection.tla` + `specs/tla/FormalElection.cfg` (U1
   tla-externalize). A caller may point at another externalised `.tla`/`.cfg`
   pair registered in `specs/tla/model-map.json`.
2. Run the CLI, letting it select the execution provider for the current
   environment (see the README for the local vs CI dependency contract):

   ```
   bun scripts/formal-verif/run-model-check.ts \
     --model specs/tla/FormalElection.tla \
     --cfg   specs/tla/FormalElection.cfg \
     --out   <out-dir>
   ```

3. Report the CLI's verdict by its exit code — `0` = the checked invariants held
   across the whole finite state space (detected), `1` = a counterexample /
   not-detected, `2` = a harness error (fail-closed; never reported as a pass).
   The `run-model-check` CLI derives every verdict from real TLC output, never a
   hardcoded value (NFR-3, no verification theatre).

## Sensors

This stage declares the core `model-completeness` sensor (U5) in its
frontmatter. The sensor is supplied by the core framework, not the plugin, so
the stage graph compile resolves the id against the core sensor registry; an
unknown id fails the compile loudly.

## Not a stock-scope stage

`scopes:` is intentionally empty. The stage is a plugin-supplied capability that
a team opts into per run. Dropping the plugin removes this stage from the graph
and restores the 0-plugin baseline.
