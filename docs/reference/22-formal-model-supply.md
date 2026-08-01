# Supplying a Formal Model for a New Protocol

> Languages: **English** | [日本語](22-formal-model-supply.ja.md)

Amadeus verifies in two layers. Property-based, unit, and integration tests run
on every change and carry the everyday load. A single exhaustive formal model
runs on demand, and only for concurrent protocols — election, audit locking,
provenance, the mirror lifecycle — where the interesting failures are orderings
no example-based test will think to try.

The second layer exists because the first one has a structural blind spot. When a
property-based test re-derives the invariant it is checking inside its own
oracle, a defect in the implementation is cancelled by the same defect in the
oracle and the test stays green. Measured on this repository's own eligibility
experiment, that cancellation hid four of seven seeded defects; the exhaustive
model found all seven.

This chapter is the process for adding a model to that second layer. For keeping
an existing model in step with code that changed, see
[Keeping a Formal Model in Step with Its Implementation](21-formal-model-following.md).

## When a protocol qualifies

Add a model when the protocol has *state that concurrent or resumable actors
share*, and a safety property whose violation would be silent. The mirror
lifecycle qualifies because a crash between two boundaries can strand a receipt,
and the wrong recovery opens a second GitHub Issue that nothing else reports.

Do not add a model for pure functions, single-threaded transformations, or
anything a property-based test can cover without re-implementing its own oracle.
The formal layer is not a quality tier that everything should eventually reach —
it is a tool for a specific failure class, and applying it more widely spends
exhaustive-run time to prove things the cheap layer already proves.

## 1. Choose the subject and its invariants

Start from defects that actually happened. An invariant derived from a real
Issue is one you can name a witness for; an invariant invented from the design
tends to restate what the code already obviously does.

Write each invariant with its provenance burned into the module as a comment —
the Issue number, the FR, the `file:line` of the predicate it polices. Six months
later the provenance is what tells a reader whether an invariant is still load
bearing or is a fossil.

State an invariant over the condition the implementation actually guarantees. If
the code enforces a property at the moment an operation is *enabled*, an
invariant written over the current state will report violations for orderings the
implementation never performs. Record the enabling condition as a witness in the
state instead, and assert over the witness.

## 2. Reduce to a finite domain, and declare every reduction

TLC explores exhaustively, which means the domain has to be finite and small.
Every reduction is a claim that the abstracted-away detail cannot affect the
invariants — and an unstated reduction is indistinguishable from an oversight.

Put a reduction manifest at the top of the module. For each reduction, state what
was dropped and the argument for why the invariants still range over the same
abstract space. Prefer arguments of the form "this transition reaches no abstract
state that a modelled transition does not already reach" over "this transition
looks unrelated".

Two rules keep the manifest honest:

- **Enumerate mechanically, not from memory.** Derive the full transition set
  with a grep over the dispatch, then subtract. A hand-recalled list omits the
  arm somebody added last month.
- **Check each exclusion individually.** A single sentence covering seven
  excluded transitions will be wrong for at least one of them. Verify each
  against the code and give the ones that differ their own argument.

Over-approximation is the safe direction. Dropping a guard admits behaviours the
implementation would reject, so a proved invariant stays proved. Dropping a
*transition* is the dangerous direction, because it removes reachable states.

## 3. Translate guards faithfully

Each operator should correspond to a named predicate in the implementation, with
the `file:line` in a comment. Resist restating the guard in a form you find
tidier: the value of the model is that a reviewer can put the two side by side.

Line numbers drift; the SHA pins in `model-map.json` are the binding that a
machine checks. Write both — the line number for a human's eye, the pin for the
sensor.

## 4. Register the model

Add the model, its `.cfg`, and its canonical implementation files to
`specs/tla/model-map.json`. The `entries` list should hold every file the model
translates a predicate from, not just the obvious one. A predicate whose file is
missing from `entries` can change without the sensor noticing.

Extend the `model-completeness` sensor's `matches` glob to cover the new
implementation paths in the same change. The map and the glob are two halves of
one watched surface, and half a surface fails open.

## Completion is the evidence

A run is evidence only when TLC reaches the fixed point of the declared finite
domain and reports it. Record the completion marker together with the state
statistics — states generated, distinct states, search depth, and zero states
left on the queue.

A partial exploration, a timeout, or a run with missing statistics is a harness
error, not a result. It must never be reported as "no violation found": the
model checked some prefix of the state space and stopped, which is exactly the
situation where an undetected violation is most likely.

## 5. Prove the model can fail

A model that has never rejected anything is indistinguishable from a model with a
vacuous invariant. Before treating a new model as evidence, make it fail twice —
in two different ways.

**Falling proof.** Build a variant that reproduces a real defect and confirm the
relevant invariant produces a counterexample trace. When the defect is historical
— already fixed on the mainline — keep the variant pointed at the defective
semantics rather than re-pointing it at the fixed code. Re-pointing it makes the
two variants identical and destroys the evidence.

Keep the failing variant out of every recurring job. A permanently red scheduled
job trains everyone to ignore it. Run it once, record the trace, and register
only the passing variant in `model-map.json`.

**Vacuity guard.** Confirm that the states an invariant talks about are actually
reachable inside the finite bound. The cheap way is an inverted invariant —
assert that the interesting state is unreachable, and require TLC to violate it.
A bound chosen slightly too small will otherwise leave an invariant trivially
true, with a green run to match.

## 6. Take it through the human gate

The model, the reduction manifest, the completion statistics, the counterexample
trace, and the vacuity result are one reviewable package. The reduction manifest
is the part that most needs a second reader: it is the only place where the model
can be wrong in a way that no run will reveal.

## Running a check

The `formal-model-check` stage is opt-in — it carries an empty `scopes:` list, so
no stock scope selects it, and Amadeus never runs it on its own. Invoke it
explicitly:

```
bun .claude/tools/amadeus-orchestrate.ts next --stage formal-model-check --single
```

The stage runs TLC through the `run-model-check` CLI. Java and `tla2tools.jar`
are opt-in dependencies of the `formal-model-check` plugin, not part of the
Bun-only framework baseline; both are pinned so that the same model, config, and
image digest yield the same verdict. See the
[plugin README](../../plugins/formal-model-check/README.md) for how each
execution surface is provisioned.
