# Supplying a Formal Model for a New Protocol

Until `amadeus/spaces/<space>/specs/tla/model-map.json` declares a model whose `.tla` and `.cfg` assets
exist, activation reports `not-ready` and an explicit check fails with the
missing-target reason. Plugin installation itself remains valid with zero
models, and no automatic lifecycle path launches TLC.

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
`amadeus/spaces/<space>/specs/tla/model-map.json`. The `entries` list should hold every file the model
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

When the plugin is composed and the host binds its stages to a workflow scope,
that scope runs the formal lifecycle after build and test. `tla-authoring` first assesses the active
requirements: an unregistered applicable subject takes the `author-new` route,
a semantic change to a registered subject takes `revise-model`, and a terminal
or not-applicable outcome skips TLC. `formal-model-check` then checks the model
that was created or revised. Scope assignment belongs to the host's
`plugin.scope-bindings` project configuration, so custom scopes can opt in
without changing the plugin. The checker can also be invoked explicitly:

```
bun .claude/tools/amadeus-orchestrate.ts next --stage formal-model-check --single
```

The stage runs TLC through the `run-model-check` CLI. Java and `tla2tools.jar`
are opt-in dependencies of the `formal-model-check` plugin, not part of the
Bun-only framework baseline; both are pinned so that the same model, config, and
image digest yield the same verdict. See the
[plugin README](../../plugins/formal-model-check/README.md) for how each
execution surface is provisioned.

## Recording the evidence: the `tla-authoring` CLI

Step 6 above produces a reviewable package. `tla-authoring` is how that package
is written down, addressed, and later re-checked — and how a checkpoint learns
that a governed requirement moved without its model following.

The CLI ships with the plugin at
`plugins/formal-model-check/tools/tla-authoring.ts` and is registered in the
plugin's `tools` list. It dispatches only: every judgement lives in
`tla-evidence.ts` and `tla-applicability.ts` below it. The contract is one JSON
line on stdout, with `0` for success, `1` for a typed failure, and `2` for a
usage error. Running it with no arguments prints the full usage on the error
path:

```
bun plugins/formal-model-check/tools/tla-authoring.ts
```

**Identity.** A model is tied to the requirement text it formalises, not to a
file. `identity extract` reads a document and digests the sections whose ids
match the closed grammar — `FR-`, `NFR-`, and `AC-` followed by three digits
under a `###` heading, `ADR-` followed by digits under a `##` heading. Section
bodies are canonicalised (LF newlines, no trailing whitespace, no leading or
trailing blank lines) before hashing, so reflowing prose does not move the
digest but changing a guard does. `identity compare` reports `current` or
`stale` against a recorded digest.

```
bun plugins/formal-model-check/tools/tla-authoring.ts identity extract \
  --doc amadeus/spaces/default/specs/tla/requirements.md --doc-kind requirements
```

**Bundles.** `bundle build` writes a content-addressed envelope into the
evidence store, chaining it to a `--predecessor` that is either `root` or an
earlier bundle digest. An authoring bundle carries five receipts —
applicability, trace, proof, review, approval; a terminal-route receipt carries
applicability and approval only. `bundle verify` re-derives the digest and
checks the recorded subject identity, `bundle read` returns the receipts,
and `bundle list` / `bundle head` enumerate the store and its chain heads,
reporting any corrupted entries separately rather than skipping them:

```
bun plugins/formal-model-check/tools/tla-authoring.ts bundle list
{"ok":true,"refs":[],"corrupted":[]}
```

**Applicability.** `applicability judge` takes a change declaration
(`{ subjects, kind, rationale }`, where `kind` is one of `new-subject`,
`semantic-change`, `impl-only`, `non-target`) and routes it against the
registered model map. `applicability receipt` performs the same judgement and
builds the receipt, verifying the referenced human approval against the audit
shard it names. Adding `--persist true` writes that receipt into the evidence
store as a `terminal-route-receipt`, which is the only thing the hold table
accepts as the release for a terminal route. Persisting is refused for a
non-terminal route and for a terminal route whose approval does not verify, so a
receipt that could not release a hold never reaches the store. The value is
spelled out because the CLI reads `--name value` pairs only. A terminal route
without `--persist true` is rejected by the CLI gate, so a print-only receipt
cannot complete the stage without durable hold-releasing evidence. Terminal routes
carry no authoring work, so the `tla-authoring` stage refuses them; issuing the
receipt is this CLI's job rather than the stage's. `applicability series`
derives the series key for a subject set.

**The hold.** `hold` evaluates whether authoring must stop: it lists the store,
refuses to release on any corrupted entry, and runs the hold table over the
current identity and series. The typed verdict on stdout is authoritative — the
exit code only mirrors it, and no caller may read hold or no-hold from the code
alone.

## The evidence store

`plugins/formal-model-check/tools/tla-evidence.ts` is a library, not a CLI — it
has no entry point of its own and is consumed by `tla-authoring.ts`. It is the
only writer of the evidence store, which lives at `amadeus/spaces/<space>/specs/tla-evidence` unless a
`--store` flag moves it.

The file is split so that the judgement half can be tested without a
filesystem. The pure layer owns parsing, canonicalisation, digesting, identity
comparison, envelope validation, and head resolution, and touches neither the
disk, the clock, nor the process. The handler layer below it owns store I/O and
hands the pure layer bytes. Writes stage through a `.tmp` directory and are
renamed into place, so a crashed run leaves no half-written bundle at a name
that claims to be its own digest.

Two properties are worth knowing when reading store output. `verify` is the only
function that mints a verified bundle, so holding one is itself proof the bundle
was checked rather than merely read. And a scan reports unreadable entries as
`corrupted` — with the reason `digest-filename-mismatch`, `unparseable`, or
`schema-invalid` — instead of dropping them, which is what lets the hold
evaluation refuse to release on a damaged store.
