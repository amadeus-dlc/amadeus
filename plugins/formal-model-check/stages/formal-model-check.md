---
slug: formal-model-check
number: 3.9
name: Formal Model Check
phase: construction
execution: CONDITIONAL
condition: When selected by the host workflow, run after TLA+ authoring if applicability produced or revised a model; otherwise record the terminal applicability outcome without invoking TLC. Explicit single-stage runs check the selected registered model or all registered models.
lead_agent: amadeus-quality-agent
support_agents: []
mode: inline
produces: []
consumes: []
requires_stage:
  - tla-authoring
inputs: all externalised TLA+ model + config pairs declared by amadeus/spaces/<space>/specs/tla/model-map.json and the model-check CLIs under {{HARNESS_DIR}}/plugins/formal-model-check/tools/.
outputs: the TLC exhaustive-exploration verdict (exit 0 not-detected / 1 detected / 2 harness-error) plus the report/artifacts written under the chosen --out directory.
sensors: []
scopes: []
---

# Formal Model Check

The `formal-model-check` plugin stage runs an exhaustive TLC exploration of a
declared TLA+ model, driven by the `run-model-check` CLI. It follows
`tla-authoring` in the scopes assigned by the host, so a missing model can be
supplied before the check is selected. Explicit `--stage formal-model-check`
runs remain supported. It never runs on `push` / `pull_request`. When a watched
spec changes, the existing spec-hash advisory remains an additional trigger.

## Stage body

1. Read the immediately preceding applicability outcome when this is a host
   workflow. An `author-new` or `revise-model` route must name the model just
   registered by `tla-authoring`; check that model. An `impl-only`, `non-target`,
   or `not-applicable` outcome records `NOT_APPLICABLE` and does not invoke TLC.
   A missing or contradictory outcome is a halt. For an explicit run with no
   preceding applicability outcome, resolve the requested model + config as
   before. CI acceptance checks every pair declared
   in `amadeus/spaces/<space>/specs/tla/model-map.json`, sequentially and in declaration order. The
   optional `--model <registered-name>` selector narrows CI or diagnostics to
   one pair and rejects unknown names without falling back. `FormalElection`
   retains frozen-receipt normalization; other registered models use the
   verified-source path and require a TLC completion marker plus state
   statistics.
2. Run the CLI, letting it select the execution provider for the current
   environment (see the README for the local vs CI dependency contract):

   ```
   bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/run-model-check.ts \
     --model amadeus/spaces/default/specs/tla/FormalElection.tla \
     --cfg   amadeus/spaces/default/specs/tla/FormalElection.cfg \
     --out   <out-dir>
   ```

   The explicit paths above demonstrate a single-model local pass. Omitting
   `--model` from `run-model-check-ci.ts run|verify --root <absolute-path>`
   checks all registered models.

   A `run-now` advisory choice reaches this plugin through its declared handoff
   stage. The host does not construct or execute a plugin-specific command.
   This stage owns the model-check invocation and evidence contract.

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
4. After a completed check, record the checked spec identity from the plugin:
   `bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/plugin-activation.ts record {{HARNESS_DIR}}`.

## Sensors

The plugin owns its model-completeness checker. Run it from the plugin tool
directory when the stage changes a model registration; core carries no
plugin-specific sensor or implementation.

## Host-assigned lifecycle

The plugin declares no host scope. Project configuration assigns this stage to
the host's workflow scopes. It remains ordered after `tla-authoring`; dropping
the plugin removes both stages from the graph and restores the 0-plugin
baseline.
