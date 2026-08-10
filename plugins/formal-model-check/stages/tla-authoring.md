---
slug: tla-authoring
phase: construction
execution: CONDITIONAL
condition: Opt-in — install is the boundary. Once composed, runs on an explicit `--stage tla-authoring` invocation (with or without `--single`); never auto-selected by a stock scope (scopes is empty).
lead_agent: amadeus-architect-agent
support_agents: []
mode: inline
produces: []
consumes: []
requires_stage: []
inputs: an ApplicabilityReceipt from the `tla-authoring.ts applicability` verbs, the requirements and design documents its subjects name, and the evidence store the bundle verbs read and write.
outputs: the model deliverables (.tla / .cfg / reduction manifest / trace rows), the referee evidence, the review receipt, the human approval reference, the authoring evidence bundle, and the model-map registration receipt.
scopes: []
---

# TLA+ Authoring

The `tla-authoring` plugin stage carries one subject from an applicability
route to a registered TLA+ model. It is the authoring counterpart of
`formal-model-check`: this stage produces and registers the model, that stage
checks it. Like its sibling it is opt-in (empty `scopes:`) — install is the
opt-in boundary, so once composed it is reachable via
`amadeus-orchestrate next --stage tla-authoring`, and it never joins a stock
scope's workflow.

The conductor running this stage owns the progression. The referees, the
evidence store and the registration committer are called by it; none of them
starts the next step on its own.

## Steps

### 1. Receive the route

Take the `ApplicabilityReceipt` produced by
`tla-authoring.ts applicability receipt` and build the work plan from its
`route`, `subjects` and `subjectIdentity`. The receipt is the entry
condition: without one, do not start.

Refuse to start on a terminal route as well. `impl-only` and `non-target`
carry no authoring work, so a receipt naming either one ends the stage
instead of opening it. This refusal is an addition made by this unit's
functional design (ADR-7) rather than an inherited rule — the upstream
procedure table only names the missing-receipt refusal.

### 2. Author or revise the model

Derive the named invariants from the requirements and design documents the
receipt's subjects point at, then write the deliverables: the `.tla` module,
the `.cfg` config, the trace rows that tie each subject to an invariant, and
the reduction manifest.

The reduction manifest must declare, for every invariant, a **vacuity witness**
and the `declaredIdentity` of the subjects it was authored against. Both are
inputs the proof referee evaluates: an invariant with no witness cannot be
shown non-vacuous, and a manifest with no `declaredIdentity` cannot be bound to
the identity under review. The referee rejects either omission, so write them
here rather than discovering the gap in step 3.

### 3. Run the referees

Run the trace referee and then the proof referee:

```
bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/tla-authoring.ts trace \
  --subjects <subjects.json> --rows <trace-rows.json> --invariants <invariants.json>

bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/tla-authoring.ts proof \
  --model <module.tla> --cfg <module.cfg> --reduction <reduction.json> \
  --invariants <invariants.json> --identity <sha256:...>
```

A typed failure from either referee is a halt. Present every failure the
referee reported — the whole list, not the first one — to the human, and stop.
No referee failure is converted into a pass, and no later step reads evidence
the referee refused to produce.

### 4. Independent review

Dispatch an independent reviewer over the authoring deliverables. The reviewer
must be a different subject from the one that authored the model, and runs with
**read-only** permissions (Read / Grep / Glob equivalents) — no engine
operation, no artefact write, no Git operation.

The reviewer's `ReviewReceipt` records `reviewer`, `modelAuthor`, `verdict`,
`reviewedAt` and `artifactDigests`. Filling `modelAuthor` with the name of the
subject that did the authoring work is not optional: the registration
committer compares the two names and refuses a receipt whose author is
missing, empty, or equal to the reviewer.

A `NOT-READY` verdict goes back to the authoring step with the reviewer's
findings. Only a `READY` receipt continues.

### 5. Human gate

Present the reviewed deliverables to the human and obtain an explicit
approval. Build the `HumanApprovalRef` from the real HUMAN_TURN that approval
produced — the audit shard it landed in, its timestamp, and the event
identity.

No receipt substitutes for this. A referee's evidence, a reviewer's `READY`,
and a complete bundle are all necessary and none of them is an approval; with
no verified approval the stage does not reach step 6.

### 6. Register

Build the authoring bundle, verify it, and commit the entry:

```
bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/tla-authoring.ts bundle build \
  --parts <parts.json> --predecessor <root|sha256:...> --identity <sha256:...>

bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/tla-authoring.ts bundle verify \
  --ref <sha256:...> --identity <sha256:...>

bun {{HARNESS_DIR}}/plugins/formal-model-check/tools/tla-authoring.ts commit \
  --draft <entry.json> --bundle <sha256:...> --preconditions <preconditions.json>
```

The verify step is not a formality: `commit` accepts only a `VerifiedBundle`,
the branded value `bundle verify` returns, so a bundle that was never verified
has no way into the model map. The `commit` verb re-runs the verification for
the identity the applicability receipt binds, and checks the six registration
preconditions together, reporting every one that failed.

A refused registration is a halt: the subject stays unregistered, the previous
model map is left byte-for-byte intact, and the failure list goes to the human.
Do not hand-edit the model map to work around a refusal.

## Sensors

This stage declares no sensors. Its outputs are model artefacts and JSON
receipts rather than the markdown artefacts the universal shape sensors
(`required-sections`, `upstream-coverage`) check, and their real verification
is the referees in step 3 and the precondition gate in step 6 — deterministic
checks that already fail closed.

## Not a stock-scope stage

`scopes:` is intentionally empty. The stage is a plugin-supplied capability a
team opts into per run. Dropping the plugin removes it from the graph and
restores the 0-plugin baseline.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-08-05T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question, then write each entry the user keeps to the harness
destination `stage-protocol.md` §13 names — never to this stage file.
