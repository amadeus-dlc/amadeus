---
slug: formal-model-check
number: 3.9
name: Formal Model Check
phase: construction
execution: CONDITIONAL
condition: In self-* workflows, run after TLA+ authoring when applicability produced or revised a model; otherwise record the terminal applicability outcome without invoking TLC. Explicit single-stage runs check the selected registered model or all registered models.
lead_agent: amadeus-quality-agent
support_agents: []
mode: inline
produces: []
consumes: []
requires_stage:
  - tla-authoring
inputs: all externalised TLA+ model + config pairs declared by amadeus/spaces/<space>/specs/tla/model-map.json and the model-check CLIs under {{HARNESS_DIR}}/plugins/formal-model-check/tools/.
outputs: the TLC exhaustive-exploration verdict (exit 0 detected / 1 not-detected / 2 harness-error) plus the report/artifacts written under the chosen --out directory.
sensors:
  - model-completeness
scopes:
  - self-document
  - self-feature
  - self-fix
  - self-refactor
---

# Formal Model Check

The `formal-model-check` plugin stage runs an exhaustive TLC exploration of a
declared TLA+ model, driven by the `run-model-check` CLI. It follows
`tla-authoring` in all four self-development scopes, so a missing model can be
supplied before the check is selected. Explicit `--stage formal-model-check`
runs remain supported. It never runs on `push` / `pull_request`. When a watched
spec changes, the existing spec-hash advisory remains an additional trigger.

## Stage body

1. Read the immediately preceding applicability outcome when this is a self-*
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

## Self-development lifecycle

The stage belongs to all four self-* scopes and is ordered after
`tla-authoring`. Dropping the plugin removes both stages from the graph and
restores the 0-plugin baseline.
