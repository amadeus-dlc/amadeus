# Intent Autonomy, Review, and Completion

> Languages: **English** | [日本語](24-intent-autonomy.ja.md)

Autonomy in Amadeus is scoped to one Intent. An Intent carries a mode, and — in
`full` — a grant that a human issued for that Intent and no other. When the
engine reaches an interaction it would normally put to a person, the mode and
the grant decide whether it may answer on its own; if it does, the answer is
recorded as an immutable auto decision that a human can review afterwards.

This chapter covers that machinery end to end: the mode table and grants, how a
question is decided, the append-only review surface, the seal that closes a
completed Intent, and the harness registry the three of them share. For the
audit-event tables and the emitter of each event, see
[State Machine](12-state-machine.md); this chapter explains what the events
mean.

## Modes and grants

The mode is one of three values, held on the Intent's autonomy projection
(`packages/framework/core/tools/amadeus-intent-autonomy.ts`):

There are four interaction kinds — `stage-gate`, `phase-gate`,
`walking-skeleton` and `question` — and a mode is defined by which of them it
decides for itself:

| Mode | What may be decided without a human |
| --- | --- |
| `none` | Nothing. Every gate and question is `human-required`. |
| `semi` | Everything `full` decides, minus the two milestones `phase-gate` and `walking-skeleton`, and only when the mode itself was set by a human command. |
| `full` | All four kinds, within the current grant's scope. |

`semi`'s permission set is not a written list: it is computed as the complement
of the milestone pair, so adding a fifth interaction kind makes it
semi-decidable without either list being edited. The milestone line is also
enforced independently of scope — hand `semi` a scope that names `phase-gate`
and the milestone is still not decided.

Deciding a kind is not the same as never stopping. A ruling point reserved to
the user, and a derivation that does not single out one option, still go to a
person in every mode including `full` — see
[When a mode cannot decide](#when-a-mode-cannot-decide).

The mode also projects onto Construction scheduling. `Construction Autonomy
Mode` is derived from the Intent mode by one function that the writer and the
scheduler both call — `none` → `gated`, `semi` / `full` → `autonomous` — so
`semi` runs the Bolt swarm unattended, and a record whose two fields disagree
is refused loudly instead of quietly scheduling the lower of the two.

`none` is the default, and it is also where a legacy or unreadable projection
lands: the two non-human provenances (`system-default` and
`legacy-fail-closed`) both resolve to `none`, so an Intent never acquires
autonomy by accident.

Set the mode with `amadeus-bolt.ts set-autonomy`. `full` additionally requires
that the displayed grant be confirmed by a real human turn — preview it first,
then pass back the digest you were shown:

```
bun .claude/tools/amadeus-bolt.ts preview-autonomy
bun .claude/tools/amadeus-bolt.ts set-autonomy --mode full \
  --confirmed-display-digest sha256:...
```

A `HUMAN_TURN` is minted only when the host fires a trusted presence hook:
Claude Code's `UserPromptSubmit` (a typed prompt at a turn boundary) or
`PostToolUse` on `AskUserQuestion`. Claude Code does **not** fire
`UserPromptSubmit` for a message queued while the agent is mid-turn
(`queued_command` attachments; measured on Claude Code 2.1.69–2.1.233 against
[anthropics/claude-code#31114](https://github.com/anthropics/claude-code/issues/31114)).
That delivery is real human input, but it is not presence. `set-autonomy` and
other provenance gates refuse with `PROVENANCE_REQUIRED` and tell you to submit
the same command again at a turn boundary (after the agent yields). There is no
complementary capture path: scraping the transcript would mint presence from a
channel the host does not treat as a prompt, which collides with the
machine-injection classifier and with consuming an unrelated turn.

### Declaring the mode at launch

`set-autonomy` is the canonical recording path, but it needs an Intent to already
exist. `--autonomy <none|semi|full>` records the same declaration as part of the
invocation, including the invocation that births the Intent:

```sh
/amadeus --autonomy semi Add rate limiting to the public API
/amadeus --autonomy none
```

The flag is an additional recording *means*, never a source of authority. It is
accepted only as the **first** declaration — while the mode's provenance is still
`system-default` — so it can never overwrite a mode a human already set; re-state
the same mode and it is a no-op, name a different one and the run is refused and
points at `set-autonomy`. `none` and `semi` go through the one canonical write
path, and because a freshly born Intent has no audit history of its own to cite,
the declaration is bound to the launching keystroke's human turn: a launch that
carries no real human turn is refused loudly, the Intent stands with its mode
unset, and the first declaration is still available.

`--autonomy full` is accepted but never applied. Granting `full` is the ceremony
above, and a launch flag may not stand in for it: the run reports the two
commands that issue a grant and stops there. A launch that also revokes — asking
for `none` while an active grant exists — is likewise refused, because revoking a
grant is a deliberate act rather than the side effect of a flag.

A grant is not a global switch. It carries a scope descriptor naming the Intent
uuid, the scope and norm fingerprints it was issued against, the interaction
kinds it covers (`stage-gate`, `phase-gate`, `walking-skeleton`, `question`),
and the effect classifications it explicitly prohibits. Authorization compares
the occurrence against that scope: a mismatched Intent, a workflow that is not
running, or an interaction kind outside the scope all return `human-required`
with reason `SCOPE_OUT` rather than falling through to a decision.

Effects are classified. Two classifications an autonomous authority may act on —
`workflow-reversible` and `advisory-deferral` (deferring past a
plugin-declared advisory, which used to borrow `quality-waiver` and no longer
does) — are read from one shared list by both authorization arms. Five
classifications can never be authorized by a grant: `new-permission`,
`irreversible`, `scope-out`, `norm-waiver`, and
`quality-waiver`. An effect whose payload does not match its recorded
fingerprint, or whose applicable norm fingerprint has moved, is refused as
`PAYLOAD_MISMATCH` or `NORM_DRIFT`. Autonomy therefore cannot widen its own
permissions, waive quality, or take an irreversible action, regardless of mode.

## Deciding a question

A gate decision under `semi` or `full` is direct: the basis is the mode
provenance or the grant itself, and the decider is the deterministic engine.

A *question* under `semi` or `full` goes through an ordered resolution, and the
order is the point — cheaper and more authoritative bases are consulted first.
Before any of them runs, one question is asked first:

0. **Is this ruling point reserved to the user?** A spec change, a goal
   revision, an election hold, a merge outside the standing delegation. A
   reserved point is settled here, so no basis — however unanimous — can
   auto-decide it. The predicate belongs to the mode authority; the ladder only
   asks it.

1. **Confirmed policy** — an answer the human pre-confirmed when issuing the
   grant, supplied via `--policies-file` as `{sourceText, selector, optionId}`.
2. **Norm** — an applicable norm fact matching the selector under the current
   norm fingerprint. If two norm facts select different options, the resolution
   does not guess: it parks the workflow with `NORM_CONFLICT`.
3. **History** — a past human ruling on the same selector under the same scope
   lineage and norm fingerprint.
4. **Solo election** — when the capability is available.
5. **Agent recommendation** — only when solo election is unavailable, and the
   record is stamped with the degraded capability and the reason it degraded.

Every branch validates that the selected option is one the occurrence actually
offered and that the evidence fingerprint is a real digest; anything else is
`invalid` rather than a decision.

Rungs 4 and 5 answer in a three-way vocabulary rather than always producing an
option: `unique(optionId, basis)`, `contested(candidates, reason)`, or
`none(reason)`. Only `unique` carries an option id, which is what makes
"decide without a basis" unrepresentable. Reaching the last rung is therefore
not a licence to answer: an agent that cannot single out an option returns
`contested` or `none`, and the ruling goes to a person. Past human rulings that
disagree with each other terminate the same way — a conflict there is the state
most in need of a ruling, so it is not handed down to the election or the agent.

## When a mode cannot decide

Two terminals hand a ruling back: the reserved point (step 0) and the
non-unique derivation (`contested` / `none`). What happens next is decided by
the session, not the mode:

- **Interactive** — this clone's own audit shard holds at least one
  `HUMAN_TURN`. The engine returns `human-required` carrying the outcome, and
  the conductor presents exactly those candidates and that reason, then ends the
  turn.
- **Non-interactive** — it does not. The engine enters **waiting**
  (`AWAITING_RULING`) and emits a terminal `waiting` directive naming the
  occurrence, the basis fingerprint and the transaction that holds the full
  cause, so `/amadeus --resume` re-presents the same ruling rather than a
  paraphrase of it.

Interactivity is judged per session and re-read from disk on every call, so a
`HUMAN_TURN` that lands mid-session is observed on the next one. There is no
freshness window, no TTY probe and no declaration flag — all three were
considered and rejected — and any resolution failure (no active Intent, missing
shard, corrupt lines) falls closed to non-interactive. The judgment can
under-report; it can never fabricate a turn that is not on disk.

`waiting` is its own stop reason, distinct from `AWAITING_HUMAN` (an
authorization the run lacks), `REPAIR_STALLED` (a defect stopped it) and
`USER_PARKED` (somebody chose to stop). Conflating any two of the four would
make "broken" and "waiting for an answer" resume the same way. Repeated
arrivals at the same waiting key are rate-constrained, and the constraint
escalates to a human or to repair — "over the limit, therefore continue" is not
a representable outcome.

Parking is mode-blind. The retired guard refused a park under an autonomous
Construction projection when no unconsumed `HUMAN_TURN` was on record, on the
premise that an unattended run has nobody to resume it; an unattended run that
reaches a ruling it may not make is exactly the run that has to stop, so the
refusal is gone — there is no mode arm, no flag and no env off-switch. The
presence *accounting* is untouched: `WORKFLOW_PARKED` is still a presence
resolution, so a park still spends whatever turn was outstanding.

Drive it with the `decide-question` verb, which takes the occurrence and its
context as a JSON document:

```
bun .claude/tools/amadeus-bolt.ts decide-question --input question-decision.json
```

The result is an `AutoDecisionRecord` — decision id, occurrence id, the question
and the option ids it offered, the selected option, the decider, the basis kind
and its fingerprint, the principal and actor, the grant id, any degraded
capability, and a review state. It is emitted as `AUTO_DECIDED` inside the
Intent autonomy transaction, which commits atomically.

## Approval boundary for remote writes

A remote write is an action that changes a surface other people share: a push,
opening a PR, replying to or resolving a review thread, and filing an Issue.
Stages have long deferred these to "the workspace's approval boundary" without
that boundary being written down anywhere. This section is it.

The boundary is not a standing permission and not a workspace preference. Under
`none` the human is asked, like any other question. Under `semi` and `full` the
conductor neither asks the human directly nor acts on the strength of the grant:
it puts the occurrence through `decide-question`, exactly as it would any other
stage question. The ladder rules it, the ruling is recorded as `AUTO_DECIDED`
with its basis, and only a `human-required` result reaches a person.

Routing through the ladder does not widen what a grant may authorize. The five
classifications a grant can never authorize still apply, so a remote write whose
occurrence classifies as `irreversible` or `new-permission` comes back
`human-required` instead of being decided.

Merging is never one of these. A merge is a separate human decision, asked about
that specific PR; no convergence verdict, grant, or ladder ruling authorizes it.
Where the workspace's norms carry a standing merge delegation, the human
exercises it under those norms and the engine's part is to *record* it:
`amadeus-merge-provenance record` emits `DELEGATED_MERGE_RECORDED` with the
standing-ruling reference, the CI conclusion and the convergence digest the
delegation rested on. That recorder is not a mode arm — it takes the caller's
word for the evidence, touches neither git nor GitHub, and no Intent mode makes
a merge automatic.

## Reviewing an auto decision

Auto decisions are immutable. The review surface
(`amadeus-autonomy-review.ts`, with its production audit adapter
`amadeus-autonomy-review-production.ts`) is an **append-only projection** over
them: reviewing never replays the decided effect, never mutates a grant, never
reopens an Intent, and never creates a remediation Intent. It records a human's
reading of what already happened.

Each decision carries a review state — `not-applicable`, `unreviewed`,
`accepted`, or `flagged`. List and filter them:

```
bun .claude/tools/amadeus-bolt.ts list-auto-decisions --state unreviewed
```

Committing a review is a two-step confirmation, so a human sees exactly what
they are about to attest. Ask for the detail with the choice you intend, and the
surface returns the decision together with the digest of that command:

```
bun .claude/tools/amadeus-bolt.ts get-auto-decision --decision <id> --choice flag \
  --classification contract-defect
```

Then commit, passing the digest back:

```
bun .claude/tools/amadeus-bolt.ts review-auto-decision --decision <id> --choice flag \
  --classification contract-defect --confirmed-review-digest sha256:...
```

The preview digest and the digest verified at commit are computed by the same
exported helper, so the value displayed and the value checked cannot drift. A
flag classification is one of `contract-defect`, `specification-change`, or
`unspecified`; notes are carried as a digest rather than raw text, and the
detail projection marks withheld or redacted fields explicitly instead of
silently omitting them.

The commit appends `AUTO_DECISION_REVIEWED`. The production adapter is the only
writer of that path, and it takes the audit lock to do so.

### The completion-boundary summary

`full` decides its milestones too, which removes the phase boundary as the place
a human used to sweep the unreviewed queue. In its place, terminal completion
writes `completion/auto-decision-summary.md` into the record: the total number
of `AUTO_DECIDED` rows, the breakdown by basis kind and by review state, and a
count mismatch when the audit rows and the listed items disagree. Every number
is read from the `AUTO_DECIDED` audit trail and the existing review listing —
none is authored — and the whole step is best-effort: any failure becomes a
warning on the completion JSON rather than blocking the completion.

## The completion seal

When an Intent reaches its terminal state, the closing events are not appended
one at a time. `amadeus-intent-completion.ts` builds a terminal commit plan
holding the whole ordered set — `INTENT_GRANT_COMPLETED` when a grant is open,
then `WORKFLOW_STATE_CLEARED`, then `WORKFLOW_COMPLETED` — together with the
expected event identities, the expected state projection revision, and the
terminal projection.

The **completion seal** is a digest over the transaction id, the completion
evidence and its digest, the terminal projection, and the result. Acceptance is
strict: the receipt must carry the same transaction id, the expected projection
revision, and exactly the expected event identities in exactly the expected
order. A partial or reordered receipt is a `CONFLICT`, not a completion. This is
what makes "this Intent is closed" a checkable claim rather than a state flag —
the review surface reads the seal off the last
`INTENT_COMPLETION_TRANSACTION_COMMITTED` event to mark a completed Intent's
decisions as reviewed against a fixed history.

Live multi-harness verification lives in the same module, but it is **optional
evidence**. The constant `CORE_INTENT_COMPLETION_REQUIRES_LIVE_RECEIPTS` is
`false`, and the production workflow completion path neither imports the live
path nor waits for a receipt cohort. Cohorts and revisions pin the registry
digest described below, so a cohort minted against one registry cannot be
replayed against another.

## The harness registry

`amadeus-harness-registry.ts` is the canonical table of harnesses and what each
one can do. It is a Core file projected byte-for-byte into every harness
distribution, so all faces agree on the same facts rather than each maintaining
a copy.

Each descriptor carries an id and display name, two face flags — `packageFace`
(the packager projects into it) and `selfInstallFace` (it can be reflected into
the project root) — and two autonomy flags: `autonomyContract`, whether the
harness honours the autonomy contract, and `autonomyLive`, whether live
verification can run there. The `native` block records how the harness supplies
live authorization (`credential-attested` or `unavailable`), whether judge
replay is `invoke-once` or unavailable, and the environment variable carrying
its live command, or `null` when it has none.

`PACKAGE_HARNESS_IDS` and `SELF_INSTALL_HARNESS_IDS` are derived from the table
by filtering on those flags, and the corresponding TypeScript union types are
derived from the same literal rows. A harness is added by adding one row: the
id unions, the derived id lists, and every consumer's type checking follow from
it, and there is no second list to keep in step.
