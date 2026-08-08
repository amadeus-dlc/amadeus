---
slug: formal-model-check
phase: construction
execution: CONDITIONAL
condition: Opt-in — install is the boundary. Once composed, runs on an explicit `--stage formal-model-check` invocation (with or without `--single`); never auto-selected by a stock scope (scopes is empty).
lead_agent: amadeus-quality-agent
support_agents: []
mode: inline
produces: []
consumes: []
requires_stage: []
inputs: all externalised TLA+ model + config pairs declared by amadeus/spaces/<space>/specs/tla/model-map.json and the model-check CLIs under plugins/formal-model-check/tools/.
outputs: the TLC exhaustive-exploration verdict (exit 0 detected / 1 not-detected / 2 harness-error) plus the report/artifacts written under the chosen --out directory.
sensors:
  - model-completeness
scopes: []
---

# Formal Model Check

The `formal-model-check` plugin stage runs a **single formal-model-check pass**:
an exhaustive TLC exploration of a declared TLA+ model, driven by the
`run-model-check` CLI. It is an opt-in plugin stage (empty `scopes:`): install is
the opt-in boundary, so once composed it is reachable via
`amadeus-orchestrate next --stage formal-model-check` — `--single` optional
(U6 activation-policy, FR-7(a)). It never joins a stock scope's workflow and
never runs on `push` / `pull_request`. When the watched spec changed, the
engine emits a spec-hash advisory nudge (ADR-1 option A, U6); whether that
advisory starts a run depends on the Intent autonomy mode: under `none` a
human decides whether to run it; under `semi` or `full` the advisory is routed
through the autonomy ladder as a `question` occurrence
(`amadeus-advisory-choice.ts`), and a `run-now` decision starts the check
unattended — any other ladder outcome falls back to the human.

## Stage body

1. Resolve the model + config to check. CI acceptance checks every pair declared
   in `amadeus/spaces/<space>/specs/tla/model-map.json`, sequentially and in declaration order. The
   optional `--model <registered-name>` selector narrows CI or diagnostics to
   one pair and rejects unknown names without falling back. `FormalElection`
   retains frozen-receipt normalization; other registered models use the
   verified-source path and require a TLC completion marker plus state
   statistics.
2. Run the CLI, letting it select the execution provider for the current
   environment (see the README for the local vs CI dependency contract):

   ```
   bun plugins/formal-model-check/tools/run-model-check.ts \
     --model amadeus/spaces/default/specs/tla/FormalElection.tla \
     --cfg   amadeus/spaces/default/specs/tla/FormalElection.cfg \
     --out   <out-dir>
   ```

   The explicit paths above demonstrate a single-model local pass. Omitting
   `--model` from `run-model-check-ci.ts run|verify --root <absolute-path>`
   checks all registered models.

   When an `await-advisory-choice` directive supplies a
   `formal_checks[].command`, run that command unchanged. It adds
   `--advisory-target`, `--advisory-spec-identity`, and
   `--advisory-instance` as one all-or-none correlation group and uses the
   engine-selected output directory. The local manifest records those
   coordinates together with the selected model/config paths, registered
   identities, and byte digests. These fields prove which evidence may resolve
   that one advisory; they do not change TLC exploration.

3. Report the CLI's verdict by its exit code. The CLI's outcome names say what
   was detected — a **counterexample** — so read them that way:

   - `0` = `NOT_DETECTED`: no counterexample was found; the checked invariants
     held across the whole finite state space.
   - `1` = `DETECTED`: a counterexample was found and the run reports its
     identity.
   - `2` = `HARNESS_ERROR`: the check could not be carried out (fail-closed;
     never reported as a pass).

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
