---
slug: intent-capture
phase: ideation
execution: ALWAYS
condition: First stage of every workflow — establishes the initiative's foundation
lead_agent: amadeus-product-agent
support_agents:
  - amadeus-architect-agent
mode: inline
produces:
  - intent-statement
  - stakeholder-map
  - intent-capture-questions
optional_produces:
  - issue-evidence
consumes: []
requires_stage: []
sensors:
  - required-sections
  - upstream-coverage
  - answer-evidence
  - question-budget
scopes:
  - enterprise
  - feature
  - mvp
  - poc
  - installer-distribution
  - self-document
  - self-feature
inputs: User's project description ($ARGUMENTS), scope selection
outputs: intent-statement.md, stakeholder-map.md, intent-capture-questions.md (under this stage's record dir, engine-resolved)
---

# Intent Capture & Framing

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load amadeus-product-agent persona from `agents/amadeus-product-agent.md` and knowledge from `{{HARNESS_DIR}}/knowledge/amadeus-product-agent/`.
Load amadeus-architect-agent persona from `agents/amadeus-architect-agent.md` for technical context perspective.

### Step 2: Load Prior Context

- Read user's project description from $ARGUMENTS or `<record>/audit/<host>-<clone>.jsonl`
- Check for existing `<record>/` artifacts from prior sessions
- Load guardrails from `{{HARNESS_DIR}}/rules/`

### Step 3: Generate Clarifying Questions

Create `<record>/ideation/intent-capture/intent-capture-questions.md` with questions:
- What business problem are we solving?
- Who is the customer (internal/external)? What pain are they experiencing?
- What does success look like? What metrics matter?
- What is the trigger for this initiative (market pressure, tech debt, regulation, opportunity)?

Use the [Answer]: tag format from stage-protocol.md. Include A-E options with X (Other) as final option. Leave all [Answer]: tags blank.

Then follow the unified question flow from stage-protocol.md section 3: offer Guide Me / Grill Me / Edit File / Chat modes.

### Step 4: Collect and Analyze Answers

After all answers collected:
1. Confirm ALL [Answer]: tags are filled in
2. Run ambiguity detection and contradiction analysis
3. Apply the material-ambiguity definition and single follow-up-round budget in stage-protocol.md §3

### Step 5: Generate Artifacts

Create `<record>/ideation/intent-capture/intent-statement.md` containing:
- **Problem Statement** — What business problem is being solved
- **Target Customer** — Who benefits and how
- **Success Metrics** — Measurable outcomes
- **Initiative Trigger** — Why now
- **Initial Scope Signal** — Early indication of scope (enterprise, feature, mvp, poc, etc.)

Create `<record>/ideation/intent-capture/stakeholder-map.md` containing:
- Key stakeholders and their interests
- Decision-makers vs. influencers
- Communication requirements

#### Issue-first intents: capture the filing evidence

When this initiative starts from a GitHub Issue, capture that Issue and its
cross-review comments into the record so the inception stages consume the
established facts instead of re-deriving them:

```
bun {{HARNESS_DIR}}/tools/amadeus-utility.ts issue-evidence fetch --issues <n[,n...]>
```

It writes `<record>/ideation/intent-capture/issue-evidence.md` — the whole batch
or nothing — and prints the path. The verb is read-only and idempotent: rerun it
to refresh. A `gh` that is missing, unauthenticated, or failing exits non-zero
and writes nothing; that is not a reason to stop. Record the failure in this
stage's memory.md and continue on the user's free-text request, which is what
every non-issue-first intent runs on anyway.

**Effect measurement.** This capture exists to remove a measured cost, so the
number it is judged against is fixed here. Baseline: 47 minutes of
reverse-engineering + requirements-analysis active time per intent — the median
over 4 issue-first self-fix intents, measured at record tree `215855ea7` by
pairing `STAGE_STARTED`/`STAGE_COMPLETED` audit events per stage, capping the
gap between consecutive events at 900 s, and deducting parked time. Target: a
median under 35 minutes over the next 5 issue-first intents, re-measured by that
same method. Any later measurement must state its own tree/SHA and the
aggregation command it was read from; a figure that cannot be re-derived is a
claim, not a measurement.

### Step 6: Update State

Update `<record>/amadeus-state.md`:
- Mark intent-capture as `[x]` completed
- Update current stage and next stage

### Step 7: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :bulb:
- Summary of intent statement and stakeholder map
- Review path: `<record>/ideation/intent-capture/`
- Standard approval gate (Approve / Request Changes)

## Sensors

This stage's outputs are markdown artefacts under `<record>/ideation/intent-capture/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. This stage declares no upstream artefacts; the sensor still runs but reports zero unreferenced inputs by default.

## Learn

While running this stage, maintain a running log in
`<record>/<phase>/<stage>/memory.md` (create on stage start if absent).
Append entries under four standard headings:

- **Interpretations** — choices made where the stage prose was ambiguous
- **Deviations** — places you intentionally departed from the stage prose, and why
- **Tradeoffs** — alternatives considered and why you picked what you did
- **Open questions** — anything to confirm before next run, or uncertain context

Format each entry with an ISO 8601 timestamp:
`- 2026-05-20T10:14:32Z — <summary>; <context>`

Before the approval gate, read memory.md and surface candidates as a
structured question. For each entry the user keeps, write to the appropriate
harness destination per `stage-protocol.md` §13 — never to this stage file:

- Prescriptive rule → `{{HARNESS_DIR}}/rules/amadeus-phase-<phase>.md` (phase-scoped)
  or `{{HARNESS_DIR}}/rules/amadeus-<org|team|project>.md` (cross-cutting)
- Verification check → new manifest at `{{HARNESS_DIR}}/sensors/amadeus-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

If nothing surfaces or the user skips all, proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
