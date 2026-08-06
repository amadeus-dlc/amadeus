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

| Mode | What may be decided without a human |
| --- | --- |
| `none` | Nothing. Every gate and question is `human-required`. |
| `semi` | Internal stage gates only — a stage gate that is not a phase boundary, and only when the mode itself was set by a human command. |
| `full` | Whatever the current grant's scope allows. |

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

A grant is not a global switch. It carries a scope descriptor naming the Intent
uuid, the scope and norm fingerprints it was issued against, the interaction
kinds it covers (`stage-gate`, `phase-gate`, `walking-skeleton`, `question`),
and the effect classifications it explicitly prohibits. Authorization compares
the occurrence against that scope: a mismatched Intent, a workflow that is not
running, or an interaction kind outside the scope all return `human-required`
with reason `SCOPE_OUT` rather than falling through to a decision.

Effects are classified, and five classifications can never be authorized by a
grant: `new-permission`, `irreversible`, `scope-out`, `norm-waiver`, and
`quality-waiver`. An effect whose payload does not match its recorded
fingerprint, or whose applicable norm fingerprint has moved, is refused as
`PAYLOAD_MISMATCH` or `NORM_DRIFT`. Autonomy therefore cannot widen its own
permissions, waive quality, or take an irreversible action, regardless of mode.

## Deciding a question

A gate decision under `semi` or `full` is direct: the basis is the mode
provenance or the grant itself, and the decider is the deterministic engine.

A *question* under `full` goes through an ordered resolution, and the order is
the point — cheaper and more authoritative bases are consulted first:

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
