# Keeping a Formal Model in Step with Its Implementation

The `formal-model-check` activation judgment is `not-ready`, `never-run`,
`changed`, or `current`. A missing/invalid declared model target is
`not-ready`; it cannot be recorded as a successful or unchanged verdict.
Session-start reconciliation installs the plugin but never runs TLC.

> Languages: **English** | [日本語](21-formal-model-following.ja.md)

A TLA+ model in `specs/tla/` is only worth its runtime if it still describes the
code it claims to describe. `specs/tla/model-map.json` pins each model to the
implementation files it was derived from, and the `model-completeness` sensor
recomputes those pins on every touch of a watched path. When a pin no longer
matches, the sensor reports drift.

This chapter is about what to do next. Drift is a question, not a verdict: the
sensor can see that the bytes moved, but it cannot see whether the *meaning*
moved. Answering that question is the developer's job, and answering it wrongly
in either direction is expensive — refreshing a hash that should have forced a
model revision leaves a model that quietly lies, while revising a model for a
pure rename wastes a full exhaustive run.

For writing a model for a protocol that does not have one yet, see
[Supplying a Formal Model for a New Protocol](22-formal-model-supply.md).

## The drift signal

`model-completeness` reads `specs/tla/model-map.json`, recalculates SHA-256 for
every pinned implementation entry, and reports mismatches without modifying
anything. It never rewrites the map, the model, the configuration, or the
implementation — a detector that repaired its own signal would be unable to tell
you that anything happened.

Findings carry repository-relative paths and fixed reason codes only. Hashes,
file contents, and absolute paths are deliberately excluded.

Two distinct conditions surface here, and they are not interchangeable:

- **Implementation drift** — a pinned implementation file changed. The model and
  its configuration are untouched.
- **`SOURCE_DRIFT`** — the model or configuration bytes themselves changed, in
  some cases *during* a run. The model-check toolchain also raises this when the
  module or `.cfg` identity shifts between planning and spawn, or across the
  process seam, so that a verdict is never attributed to bytes other than the
  ones actually checked.

## Deciding which branch you are on

Ask one question about the implementation change: **can it alter the set of
behaviours the model's invariants range over?**

Answer it by reading the diff against the model's own reduction manifest — every
model in `specs/tla/` declares, in a comment block at the top, which parts of the
implementation it abstracts away and why. A change confined to something the
manifest already discards cannot change what the model proves. A change to a
guard, a status value, a dispatch arm, or a state field the manifest names as
load-bearing can.

Concretely:

| The change | Branch |
| --- | --- |
| Rename, comment, formatting, type-only edit | Implementation-only |
| Refactor with no new reachable state | Implementation-only |
| New or altered guard predicate | Model revision |
| New transition kind, status, or operation | Model revision |
| A field the reduction manifest lists as abstracted away is now load-bearing | Model revision |

When you cannot decide, take the model-revision branch. Its cost is one
exhaustive run; the implementation-only branch's failure mode is a model that
reports success about code it no longer describes.

## Branch A — implementation-only change

The pins are stale but the model still holds. Refresh the implementation hashes
without touching the model:

```
bun .claude/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only
```

`--impl-only` exists so that this case has a *recorded* path rather than a hand
edit of `model-map.json`. It requires an explicit declaration that the change
does not affect model semantics, refuses to run when the model or configuration
identity has also changed, and writes an audit line so the assertion is
attributable later. Without the flag the same command rejects the update as
`MODEL_UNCHANGED`, because refreshing implementation pins is not what the
unflagged path is for.

The declaration is the point of the flag. It converts "someone edited the JSON"
into "a named person asserted, on this date, that this diff is semantically
inert" — which is the only part of the exchange a reviewer can actually check.

## Branch B — model revision

The implementation's meaning moved, so the model has to move with it.

1. **Update the model.** Translate the changed guard, transition, or domain into
   the `.tla` module. Keep the `file:line` provenance comments pointing at the
   predicate each operator translates.
2. **Update the reduction manifest** if the change alters what may be abstracted
   away. A reduction that was sound before a new transition existed may not be
   sound after it. State the new argument, per reduction, in the manifest.
3. **Re-run the exhaustive check** and confirm it completes. A partial
   exploration is not evidence — see
   [Supplying a Formal Model](22-formal-model-supply.md#completion-is-the-evidence).
4. **Refresh the map.** Run `updateModelMap` without `--impl-only`; the model and
   configuration identities have genuinely changed, so the normal path applies.
5. **Land model and implementation together.** A commit that moves one without
   the other leaves the tree in a state where the sensor is red for a reason
   nobody can act on.

If the re-run now fails, that is the model doing its job. Read the
counterexample before assuming the model is wrong: an invariant that starts
failing after an implementation change is the expected shape of a regression
being caught.

## What the sensor cannot tell you

- **It does not watch unpinned files.** Its `matches` glob and the `entries` list
  in `model-map.json` jointly define the watched surface. Logic that a model
  depends on but that nobody pinned will change in silence. When a model starts
  translating a predicate from a new file, add that file to `entries` in the same
  change.
- **It does not check that the model is faithful**, only that the bytes it was
  derived from have not moved. Faithfulness is established when the model is
  written and re-argued whenever the manifest changes.
- **It does not run TLC.** Drift detection is cheap and runs on every touch;
  exhaustive checking is expensive and runs on the `formal-model-check` stage.
  Green drift detection says the pins match, not that the invariants hold.
