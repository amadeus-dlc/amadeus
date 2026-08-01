# Telemetry Schema Reference

> Languages: **English** | [日本語](21-telemetry-schema.ja.md)

This chapter describes what Amadeus telemetry records carry: which attributes
live on the resource, which on a span, which on an exception event, how subagent
intervals are observed, which metric instruments exist, and where redaction runs.

**The schema itself is governed by Issue #1868**, the ruling that fixed
telemetry metadata schema v1. This chapter is a transcription of the landed
implementation of that schema, not a second source of truth. When the two
disagree, follow the reconciliation rule at the end of this chapter: the
divergence is resolved in the implementation or in #1868, never absorbed here.

Every example value below is synthetic. Paths appear in their post-masking form
(`<home>/…`) so this chapter never demonstrates an unredacted record.

## Resource attributes

The resource bag is assembled once per process and shared by all three signals —
traces, logs, and metrics read the same bag rather than each building their own
(`otel/resource.ts:126-141` `buildResource`, `:155-161` `currentResource`).

The vocabulary is closed (`otel/resource.ts:61-65` `RESOURCE_ATTRIBUTE_KEYS`),
which is what lets the resource redaction policy be expressed as an allow-list.
It is the union of three groups: what core measures for itself
(`:43-52` `NEUTRAL_RESOURCE_KEYS`), the pair measured from git
(`:56` `VCS_RESOURCE_KEYS`), and what a harness may supply
(`otel/resource-suppliers.ts:22-27` `SUPPLIED_RESOURCE_KEYS`).

| Attribute | Type | Source | Omitted when |
|---|---|---|---|
| `service.name` | string | constant `SERVICE_NAME` (`resource.ts:39`) | never |
| `service.version` | string | `AMADEUS_VERSION` (`resource.ts:129`) | version constant unreadable |
| `telemetry.sdk.language` | string | constant `TELEMETRY_SDK_LANGUAGE` (`resource.ts:40`) | never |
| `deployment.environment.name` | string | `GITHUB_ACTIONS`/`CI` probe → `ci`, else `local` (`resource.ts:100-102`) | never |
| `host.name` | string | `os.hostname()` (`resource.ts:132`) | hostname unresolvable |
| `amadeus.clone_id` | string | `auditCloneId` — the same token that names an audit shard (`resource.ts:133`) | no clone id resolvable |
| `amadeus.operating_mode` | string | `AMADEUS_OPERATING_MODE`, defaulting to `solo` (`resource.ts:134`) | never |
| `amadeus.harness` | string | `detectHarnessType()` (`resource.ts:135`) | harness undetectable |
| `vcs.ref.head.name` | string | `git rev-parse --abbrev-ref HEAD` (`resource.ts:111-121`) | not a work tree — omitted together with the revision |
| `vcs.ref.head.revision` | string | `git rev-parse HEAD` (`resource.ts:111-121`) | not a work tree — omitted together with the branch |
| `amadeus.harness.version` | string | harness supply seam | never supplied |
| `gen_ai.request.model` | string | harness supply seam | never supplied |
| `session.id` | string | harness supply seam | never supplied |
| `amadeus.agent.role` | string | harness supply seam | never supplied |

### Resolution rules

- **Fail-open, per attribute.** Each attribute resolves under its own `try`
  (`resource.ts:89-98` `put`). One that cannot be measured is *absent* from the
  bag — never `null`, never the empty string, so a consumer filtering on
  presence does not also have to know which empty values mean "unknown".
- **The vcs pair resolves as one step** (`resource.ts:111-121`). A directory
  that cannot answer for its head revision cannot answer for its branch either,
  and reporting one half would describe a checkout that was never observed.
- **Supply is fail-closed on both axes** (`resource-suppliers.ts:49-64`). A key
  outside the closed supplied set throws, a second supply of the same key throws
  rather than overwriting, and a blank value throws — the fail-open shape for an
  unknown attribute is absence, not an empty string.
- **The bag is read through a memoised getter, not a snapshot**
  (`resource.ts:155-161`). A harness can supply an attribute after the providers
  are already standing, so the reader polls a generation counter
  (`resource-suppliers.ts:76-78`) and rebuilds when a supply has landed.

## Span attributes

Every span carries the workflow context it belongs to, so that grouping spans by
intent or stage does not require joining back to the audit journal by trace id.
The vocabulary is closed, and is defined next to the allow-list that admits it
(`otel/redaction.ts:80-87` `SPAN_CONTEXT_ATTRIBUTE_KEYS`) and re-exported from
the resolver (`otel/span-context.ts:31`).

| Attribute | Type | Source | Omitted when |
|---|---|---|---|
| `amadeus.intent.id` | string | `activeIntent` (`span-context.ts:57-63`) | the cursor does not resolve — omitted together with the space |
| `amadeus.space` | string | `activeSpace` (`span-context.ts:57-63`) | the cursor does not resolve — omitted together with the intent |
| `amadeus.stage` | string | `Current Stage` of the active intent's state file (`span-context.ts:76`) | no state file, or the field is absent |
| `amadeus.phase` | string | `Lifecycle Phase` of the same state file (`span-context.ts:77`) | no state file, or the field is absent |
| `amadeus.agent.type` | string | `AMADEUS_AGENT_TYPE` (`span-context.ts:88`) | the variable is unset or blank |
| `amadeus.agent.id` | string | `AMADEUS_AGENT_ID` (`span-context.ts:89`) | the variable is unset or blank |
| `amadeus.bolt` | string | the worktree's Construction marker (`span-context.ts:86-99`) | no marker, or it names a unit |
| `amadeus.unit` | string | the worktree's Construction marker (`span-context.ts:86-99`) | no marker, or it names a Bolt |

### Where the Construction pair comes from

A Bolt or swarm unit is served by its own git worktree, and the fork that
creates that worktree drops a marker naming what it is for
(`tools/amadeus-state.ts:5081-5085`). The resolver reads the marker of the
workspace it is asked about (`span-context.ts:86-99`), so two concurrent Bolts
resolve their own value with no shared state between them.

The marker is deliberately **not** a state field. The state file is a tracked
path shared with main: a value written into one worktree reaches main when that
branch merges, and would then name that Bolt for every later process there — a
wrong value where the contract is absence. The marker's name sits inside the
repository's `.amadeus-*` ignore pattern, so it stays in the worktree that owns
it (`tools/amadeus-observability.ts:140-170`).

Only the caller knows whether a slug names a Bolt or a swarm unit — the swarm
drives the same fork with a unit name — so it says which, and the fork records
the discriminated value rather than guessing from the slug.

### Resolution rules

- **The intent/space pair resolves as one step** (`span-context.ts:57-63`). A
  space alone describes no unit of work — it is the container an intent lives in
  — so a bag carrying a space with no intent would let a consumer group spans
  under a workspace whose intent is unknown.
- **Both keys are omitted where the journal falls back.** This is a deliberate
  difference, not an oversight: an audit row must name some ledger, so the
  journal stamps `workspace` when the cursor does not resolve
  (`otel/logger-provider.ts:94`). A span attribute carries no such obligation,
  and a consumer grouping by intent must not be handed a bucket named after a
  fallback that describes no intent at all.
- **An unanticipated failure degrades to no context rather than partial
  context** (`span-context.ts:90-96`). The keys resolve in pairs, and half a
  pair would describe a unit of work that was never observed. Span creation
  continues either way.
- **Resolution happens once per process** (`span-context.ts:111-116`). Amadeus
  tools are short-lived — one process serves one stage of one intent and exits —
  and span end is a hot path. The memo is keyed by workspace, so a harness
  driving several fixture workspaces through one process does not answer the
  second from the first's memo.
- **Explicit span attributes win over context.** The record merges context first
  and the span's own attributes second (`otel/tracer-provider.ts:155`), so a
  caller that sets a context key explicitly is not overwritten by the resolver.

`Command` and `ExitCode` on subprocess spans predate schema v1 and are unchanged.

## Exception events

`span.recordException()` produces an OTel semantic-convention `exception` span
event (`otel/event-registry.ts:83` `EXCEPTION_SPAN_EVENT_NAME`). It is
registered as **telemetry**, never canonical (`event-registry.ts:839-854`): the
event rides the span record and never reaches the audit journal. Canonical
failures are emitted separately as `amadeus.operation.failed`. The classification
is an invariant — `recordException` re-checks it and throws if the registry def
has been reclassified (`otel/tracer-provider.ts:172-175`).

| Attribute | Requirement | Source | Omitted when |
|---|---|---|---|
| `exception.message` | required | the thrown value's message, or `String(value)` for a non-`Error` (`tracer-provider.ts:176`) | never |
| `exception.type` | optional | `err.name` (`tracer-provider.ts:188`) | the thrown value is not an `Error` |
| `exception.stacktrace` | optional | `err.stack`, redacted (`tracer-provider.ts:190`) | the value is not an `Error`, or carries no stack |

The two companions are optional rather than required because a non-`Error`
thrown value has neither and an `Error` may carry no stack; requiring them would
turn a recorded failure into a second failure.

### Stacktrace redaction

A raw stack names the machine's user and directory layout in every frame, so it
cannot be stored as captured. `redactStacktrace` (`otel/redaction.ts:197-202`)
rewrites every path-like token into one of three bounded forms
(`redaction.ts:180-189` `rewritePathToken`) and credential-scrubs the result:

| Zone | Rewritten form | Rule |
|---|---|---|
| Inside the repository | repo-relative (`packages/framework/core/otel/…`) | tried first: the repo usually lives under the home directory, and the relative form locates the frame better than a home-masked one |
| Under the home directory | `<home>/…` | applied when the token is not repo-relative |
| Anywhere else | `<external>/…` | the fallback zone marker |

The pattern is one character class under one quantifier
(`redaction.ts:174`), so matching costs a single linear scan however adversarial
the input. It also recognises the markers it emits, which makes the rewrite
idempotent — a second pass sees `<home>/x` as one already-rewritten token.

This is the only write-time-redacted `addEvent` path, and it degrades to the
message-only event if redaction itself throws (`tracer-provider.ts:193-196`).

## Subagent observability

A subagent's interval is observed as two canonical events, paired afterwards by
a read-only post-process. Both are part of the canonical audit vocabulary whose
cardinality the drift guard pins (`otel/event-registry.ts:77`
`EXPECTED_CANONICAL_COUNT`).

| Event | Audit event | Required | Optional |
|---|---|---|---|
| `amadeus.subagent.started` | `SUBAGENT_STARTED` | `Agent Type` | `Agent ID`, `Purpose` |
| `amadeus.subagent.completed` | `SUBAGENT_COMPLETED` | `Agent Type` | `Agent ID`, `Message` |

Source: `event-registry.ts:475-496`.

### Why the start attributes are mostly optional

Harnesses do not agree on when a subagent *begins*, and the attribute optionality
follows directly from that asymmetry
(`hooks/amadeus-log-subagent-start.ts:8-16`):

| Harness | Start seam | Consequence |
|---|---|---|
| Claude Code | `PreToolUse` on the dispatch tool | the hook fires for *every* tool, so the field derivation declines anything but the dispatch tool `Task` (`tools/amadeus-lib.ts:4430`, `:4456-4457`) |
| Kimi | a dedicated `SubagentStart` event carrying the prompt | supplies the prompt that `Purpose` is derived from |
| Codex, Cursor, OpenCode, Kiro, Kiro IDE | none | the completed half is emitted alone |

Both payload shapes converge on one derivation (`amadeus-lib.ts:4456-4467`): the
tool envelope carries `subagent_type`/`prompt` inside `tool_input`, while a
dedicated start event carries them at the top level and has no tool name at all.

`Purpose` is a **label derived from the dispatch prompt, never a transcript of
it** (`amadeus-lib.ts:4437-4442`): escaped line breaks are normalised first, then
the first line is taken, trimmed, stripped of control characters, and bounded by
`SUBAGENT_PURPOSE_MAX_LENGTH` (`amadeus-lib.ts:4425`). Normalising escapes first
is load-bearing — a prompt delivered with literal `\n` characters would otherwise
be a single "line" and carry its body into the audit row.

Both halves share the same emission gates — no TTY, an existing audit shard for
the active intent, and a workflow that is not already terminal — so a start is
never recorded where its completion would be dropped.

### Lifetime composition

`composeSubagentLifetimes` (`otel/subagent-lifetime.ts:111-171`) derives
intervals from journal records. It writes nothing and mutates nothing: the
journal is the source of truth and this is one derived view of it.

Matching is two-tiered (`subagent-lifetime.ts:97-109`):

1. **Exact** — equal, non-empty `Agent ID` on both halves, resolved first and
   independently of position.
2. **Greedy by type** — applies only when a side is *missing* an id, which is
   what makes the ids uninformative in the first place. It picks the most recent
   unmatched start of the same type (ties broken on the clone-local sequence,
   highest first), because subagents of one type nest more often than they
   interleave. When both halves carry ids and the ids disagree, the harness has
   said these are different agents, so they are not paired.

A start is consumed at most once, so N completions can never manufacture more
than N lifetimes. The two unmatched sides are deliberately asymmetric:

| Unmatched side | Treatment | Why |
|---|---|---|
| completion with no start | dropped | most harnesses have no start seam, so this is the normal steady state; synthesizing a start would put an interval into the record that never happened |
| start with no completion | reported with `incomplete: true`, null `completedAt` and null `durationMs` | a subagent that began and never finished is the signal this half exists to carry; null rather than 0 because the interval is unknown, not instantaneous |

A completion that predates its start (clock skew across clones) is clamped to
zero rather than reported backwards (`subagent-lifetime.ts:85-90`).

## Metrics instruments

The instrument catalogue is closed and written down once
(`otel/metrics-vocabulary.ts:22-48` `INSTRUMENTS`); the name union, the name
list, and the redaction policy's dimension set are all derived from it.

| Instrument | Kind | Dimensions | Recorded by | Derived from |
|---|---|---|---|---|
| `gen_ai.client.token.usage` | histogram | `gen_ai.token.type`, `gen_ai.request.model` | `recordTokenUsage` (`metrics-instruments.ts:83-94`) | the harness supply seam — no Amadeus process sees an LLM call |
| `amadeus.stage.duration` | histogram | `amadeus.stage`, `amadeus.phase` | `recordStageDuration` (`metrics-instruments.ts:60-65`) | `amadeus.stage.started` ↔ `amadeus.stage.completed` |
| `amadeus.gate.iterations` | counter | `amadeus.stage` | `recordGateIteration` (`metrics-instruments.ts:67-69`) | `amadeus.stage.revising` |
| `amadeus.operation.failures` | counter | `amadeus.operation` | `recordOperationFailure` (`metrics-instruments.ts:71-73`) | `amadeus.operation.failed` |
| `amadeus.subagent.duration` | histogram | `amadeus.agent.type` | `recordSubagentDuration` (`metrics-instruments.ts:75-77`) | `amadeus.subagent.started` ↔ `amadeus.subagent.completed` |

Token usage is recorded as two observations of the same histogram rather than
one two-dimensional record: `gen_ai.token.type` is the dimension the GenAI
conventions split input from output on, and its two permitted values are pinned
(`metrics-vocabulary.ts:74` `TOKEN_TYPES`).

Four of the five derive from a canonical event through a lookup table
(`metrics-instruments.ts:173-210` `DERIVATIONS`). `amadeus.gate.iterations`
counts the *revising* row rather than the rejection, because the rejection and
the revision are emitted as a pair and counting the revision counts each
rejection once. `amadeus.operation.failures` uses the low-cardinality `Tool`
attribute; `Command` is argv-derived and would make every invocation its own
series.

### Cardinality is the point

Metric attributes are dimensions: every distinct value multiplies the stored
series. The vocabulary is therefore closed per instrument, and an out-of-set key
is an invariant violation that throws rather than a dimension quietly dropped
(`metrics-vocabulary.ts:89-105` `admitInstrumentAttributes`). Intent ids and
agent ids are **not** metric dimensions — the correlation they would provide is
the trace and log side's job. A dimension whose value cannot be resolved is
dropped, which is the fail-open shape for an unknown dimension.

Three rules hold every measurement call site
(`metrics-instruments.ts:1-29`):

1. **No Meter, no measurement.** A process that never stood the metrics arm up
   records nothing — the call sites ask whether a meter is registered rather
   than demanding one, so a CLI that only writes audit rows does not crash
   because it passed a measurement point (`metrics-instruments.ts:48`).
2. **Measurement never changes the caller's control flow.** Anything the meter
   or the store does wrong degrades to "no record"
   (`metrics-instruments.ts:51-57`).
3. **Cardinality is closed before the `try`.** An out-of-set attribute is a
   caller bug, not an infrastructure failure, so it throws where the author can
   see it (`metrics-instruments.ts:50`).

Durations cross process boundaries — a stage starts in one CLI invocation and
completes in another — so the start instant is parked as a one-line marker
beside the Signal Stores and consumed by the completing process
(`metrics-instruments.ts:105-141`). The marker is removed when consumed, so a
second completion cannot re-measure the same interval, and a completing half
that finds no marker records nothing rather than reporting an error.

## Redaction layers

Redaction runs at **two layers**, sharing one policy instance: write time (the
provider emit paths) and the export boundary (each exporter and the Relay,
immediately before the record leaves). A caller bypassing the emit path
therefore still cannot place sensitive data into a Signal Store, and a record
written before a policy tightened cannot leave the machine unfiltered.

| Layer | Where | Call sites |
|---|---|---|
| write time | canonical and diagnostic emit | `logger-provider.ts:128`, `:163` |
| write time | resource assembly | `resource.ts:140` (`redactResource`) |
| write time | exception events | `tracer-provider.ts:192` |
| export boundary | span store | `local-span-exporter.ts:92-104`, applied at `:119` |
| export boundary | log store | `local-log-exporter.ts:94-99` |
| export boundary | metric store | `local-metric-exporter.ts:78-80` |
| export boundary | OTLP Relay | `relay.ts:231-233`, `:310` |

Admission is **default-deny** (`redaction.ts:152-162` `redactAttributes`): only
safe keys and explicit opt-in keys are admitted, and every admitted value is
credential-scrubbed. Opt-in never means raw pass-through. The pass is idempotent
and never mutates its input, which is what lets the two layers compose.

### The three safe-key layers

The production safe-key set (`redaction.ts:89-123` `DEFAULT_REDACTION_POLICY`)
is derived from three vocabularies rather than hand-listed, so a new attribute
cannot be silently eaten out of a stored record:

| Layer | Derived from | Why it must be listed |
|---|---|---|
| registry vocabulary | every registered event's required *and* optional attributes (`redaction.ts:66-72`) | those keys are the audit fields by design; taking only the required half made optional keys vanish from stored rows while the append still reported success |
| span context | `SPAN_CONTEXT_ATTRIBUTE_KEYS` (`redaction.ts:111`) | no canonical event declares them, so the registry-derived baseline cannot admit them and default-deny would drop them at the store and Relay boundaries |
| metric dimensions | `INSTRUMENT_ATTRIBUTE_KEYS` (`redaction.ts:117`) | without them, default-deny would strip every dimension off a measurement at the export boundary and still report the append as a success |

Alongside these sit a small set of low-cardinality operational keys that predate
the registry vocabulary and the correlation ids the audit exporter may add.

`Command` is the one opt-in key (`redaction.ts:121`). It is a required attribute
of `amadeus.operation.failed`, so it cannot be dropped — it is admitted only
through the scrubbed opt-in tier, so argv-derived values never persist with
credentials intact.

### Credential scrubbing

One compiled pattern vocabulary (`redaction.ts:36-46`
`CREDENTIAL_SCRUB_PATTERNS`) is shared by both redaction layers and by the
credential-free CI gate, so there is no second list to maintain. Each pattern
carries a stable label — the gate reports labels, never the matched secret, so
CI logs never echo a credential (`redaction.ts:207-215` `scanForCredentials`).
Matches are replaced by a fixed, label-free mask (`redaction.ts:50`) that carries
no hint of the secret's shape. Scrubbing is recursive over nested JSON values
(`redaction.ts:127-146`).

The resource bag carries its own policy (`resource.ts:74-78`) whose allow-list
is the closed resource vocabulary: the default policy admits the registry's
event attributes, which have no overlap with resource keys, so redacting the bag
under it would empty the bag. Default-deny still holds, and supplied values —
free text from outside core — are still scrubbed.

Failure paths are not an exception to redaction: a dropped diagnostic leaves a
note whose name and reason are scrubbed and whose attributes are withheld
entirely (`local-log-exporter.ts:68-77`).

## Keeping this chapter true

The schema is governed by Issue #1868; this chapter is transcribed from the
implementation. When a divergence is found, resolve it as follows — **never by
absorbing it here**:

| Situation | Resolution |
|---|---|
| The implementation matches #1868 | transcribe from the implementation (the normal case) |
| The implementation diverges from #1868 and the divergence is a defect | fix the implementation; this chapter stays #1868-conformant |
| The divergence is intentional — a design improvement found while implementing | revise #1868 first, then transcribe the revised schema here |
| #1868 diverges from the approved requirements | escalate as an upstream deviation; do not resolve it in either the code or this chapter |

Cite the implementation by file and line when adding to this chapter, and verify
each citation against the current source at the time of writing.
