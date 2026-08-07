---
slug: scope-definition
phase: ideation
execution: ALWAYS
condition: Always executes — defines the scope boundary and prioritized backlog
lead_agent: amadeus-product-agent
support_agents:
  - amadeus-delivery-agent
mode: inline
produces:
  - scope-document
  - intent-backlog
  - scope-definition-questions
consumes:
  - artifact: intent-statement
    required: true
  - artifact: feasibility-assessment
    required: false
  - artifact: constraint-register
    required: false
requires_stage:
  - intent-capture
  - feasibility
sensors:
  - required-sections
  - upstream-coverage
  - answer-evidence
scopes:
  - enterprise
  - feature
  - mvp
  - installer-distribution
  - self-feature
inputs: Intent statement, feasibility assessment, constraint register
outputs: scope-document.md, intent-backlog.md, scope-definition-questions.md (under this stage's record dir, engine-resolved)
---

# Scope Definition & Prioritization

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Step 1: Load Agent Personas

Load amadeus-product-agent persona from `agents/amadeus-product-agent.md` and knowledge from `{{HARNESS_DIR}}/knowledge/amadeus-product-agent/`.

### Step 2: Load Prior Context

- Read intent statement from `<record>/ideation/intent-capture/`
- Read feasibility assessment from `<record>/ideation/feasibility/` (if exists)
- Read constraint register and RAID log (if exist)

### Step 3: Generate Clarifying Questions

FIRST, enumerate the capabilities this intent covers. Read the intent statement and any linked Issue, prior ruling, or approved artifact it cites, and list every capability they name. This inventory is REQUIRED and must be non-empty before you classify anything — if you cannot enumerate a single capability, the scope is undecided, so treat the whole inventory as OPEN and ask the full question set.

THEN classify each enumerated capability. A capability is SETTLED when an upstream source names it as in-scope; it is OPEN when no upstream source decides it either way.

This classification gates the SCOPE-BOUNDARY questions ONLY — the first two bullets below. Ask them only about OPEN capabilities, and when the inventory is non-empty and every entry is SETTLED, omit both bullets entirely: a reduction option offered against a settled boundary reads as a recommendation and silently drops work the upstream source already scrutinized. Reducing a settled boundary is a specification change and belongs to the human, not to a clarifying question. Do NOT re-litigate a SETTLED capability — record it as in-scope and carry it into Step 5.

The OPERATIONAL questions — the last three bullets — are NOT gated by this classification. Ask them every run, about the whole inventory including SETTLED capabilities: settling what is in scope does not settle how it sequences.

Create `<record>/ideation/scope-definition/scope-definition-questions.md` with the applicable questions:
- (scope-boundary; OPEN capabilities only) What is the minimum viable scope that delivers value?
- (scope-boundary; OPEN capabilities only) What capabilities are must-have vs. nice-to-have?
- (operational; always asked) What are the dependencies between capabilities?
- (operational; always asked) What is the sequencing preference (risk-first, value-first, dependency-first)?
- (operational; always asked) Are there hard deadlines tied to specific capabilities?

State the settled boundary and its upstream source at the top of the questions file, so the reader can see what was NOT asked and why. When an option would narrow, keep, or widen the upstream boundary, say which of the three it does in the option text itself.

Follow stage-protocol.md question flow.

### Step 4: Collect and Analyze Answers

Run ambiguity detection, contradiction analysis, and scope-vs-timeline validation.

### Step 5: Generate Artifacts

Create scope definition document (in/out boundary), prioritized intent backlog (proto-Units using MoSCoW/WSJF/RICE), and value stream map.

### Step 6: Update State

Mark scope-definition as `[x]` completed in `<record>/amadeus-state.md`.

### Step 7: Present Completion & Request Approval

Completion emoji: :dart:
Review path: `<record>/ideation/scope-definition/`
Standard approval gate (Approve / Request Changes).

## Sensors

This stage's outputs are markdown artefacts under `<record>/ideation/scope-definition/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. Failure mode: missing upstream references emit `SENSOR_FAILED` listing each unreferenced artefact (this stage consumes `intent-statement`, `feasibility-assessment`, `constraint-register`).

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
