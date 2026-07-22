---
slug: units-generation
phase: inception
execution: ALWAYS
condition: Always executes when in scope. Decomposes the approved book structure into chapter units and produces the dependency DAG the Bolt loop consumes.
lead_agent: amadeus-editor-agent
support_agents:
  - amadeus-author-agent
mode: inline
reviewer: amadeus-product-lead-agent
reviewer_max_iterations: 2
produces:
  - unit-of-work
  - unit-of-work-dependency
consumes:
  - artifact: book-structure
    required: true
  - artifact: book-structure-decisions
    required: false
  - artifact: requirements
    required: true
requires_stage:
  - book-structure-design
sensors:
  - required-sections
  - upstream-coverage
  - answer-evidence
scopes:
  - book
inputs: <record>/inception/book-structure-design/book-structure.md, <record>/inception/book-structure-design/book-structure-decisions.md (if produced), <record>/inception/requirements-analysis/requirements.md
outputs: unit-of-work.md, unit-of-work-dependency.md (under this stage's record dir, engine-resolved)
---

# Units Generation (book fork)

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

NOTE: **This is the book-scope fork of Units Generation. A unit of work is a CHAPTER (or a small cohesive chapter group).** This stage produces the dependency topology only. It MUST NOT pick a writing order — the sample-chapter (walking skeleton) choice and Bolt sequencing happen at the Construction gate.

---

## Steps

### PART 1: Planning

### Step 1: Load Agent Personas

Load amadeus-editor-agent persona from `agents/amadeus-editor-agent.md`.
Load amadeus-author-agent persona from `agents/amadeus-author-agent.md` for drafting-effort feasibility input.

### Step 2: Load Prior Context

- Read `<record>/inception/book-structure-design/book-structure.md` (part/chapter map, reader contracts, conventions)
- Read `<record>/inception/book-structure-design/book-structure-decisions.md` (if produced)
- Read `<record>/inception/requirements-analysis/requirements.md`

### Step 3: Create Decomposition Plan with Questions

Create `<record>/inception/units-generation/units-generation-questions.md` with questions using [Answer]: tag format:

- Unit boundary strategy (one unit per chapter, or grouped units for tightly coupled chapter pairs / front-and-back matter)
- Dependency semantics (what counts as an edge: prerequisite knowledge, shared running example, narrative continuity)
- Parallel drafting tolerance (may independent chapters be drafted in parallel Bolts, or strictly one at a time)
- Front/back matter placement (own unit, folded into a chapter unit, or out of scope for the Bolt loop)

NOTE: Do NOT ask about writing order priorities (sample-chapter-first, value-first). Those are decided at the Construction gate using this DAG as input.

### Step 4: Collect and Analyze Answers

Collect answers following stage-protocol.md §3 question flow (offer interaction mode choice, collect answers, write back to file).
- MANDATORY ambiguity analysis: scan for vague language, contradictions, missing details
- Create follow-up questions if ANY ambiguity found
- Resolve all ambiguities before proceeding

### Step 5: Get Plan Approval

Present the decomposition plan to the user as a structured question:
- Summarize the approach: unit boundary strategy, estimated unit count, dependency structure
- Options: Approve Plan / Revise Plan

---

### PART 2: Generation

### Step 6: Execute Plan — Generate Unit Artifacts

Based on the approved plan, generate 2 artifacts in `<record>/inception/units-generation/`:

**unit-of-work.md:**
- Unit definitions (name, chapter(s) covered, boundaries)
- Unit responsibilities: the reader contract each unit discharges (cite chapter entries in book-structure.md)
- Relative drafting-complexity estimate per unit (S/M/L/XL)
- Drafting notes and constraints per unit (samples to build, figures to produce, research needed)

**unit-of-work-dependency.md:**
- Dependency DAG between chapter units (directed edges: "A depends on B"). Must be cycle-free.
- Edge rationale per dependency (prerequisite knowledge, shared running example, narrative continuity)
- Parallel drafting opportunities (sets of units with no dependency between them — multiple valid topological orderings exist)
- A REQUIRED fenced `yaml` edge block (below) — the machine-readable mirror of the prose DAG. The downstream batch fan-out is computed from this block, not the prose, so it must be present, well-formed, and cycle-free. The `required-sections` sensor checks it at this stage's gate.

The fenced block lists every unit with its direct dependencies (the unit names it depends on). Independent units carry `depends_on: []`. Name each unit exactly once; every name in a `depends_on` list must be a declared unit; no unit may depend on itself; the edges must be acyclic:

```yaml
units:
  - name: <unit-name>
    depends_on: []
  - name: <another-unit>
    depends_on: [<unit-name>]
```

NOTE: This artifact describes topology only. It does NOT pick a single "recommended writing order" — the sample chapter is chosen at the Construction gate (Skeleton Stance `on`), and Bolt order follows from the DAG plus that choice.

### Step 7: Update State

Update `<record>/amadeus-state.md`:
- Mark Units Generation as `[x]` completed
- Update current stage and next stage
- Record unit list for Construction phase

### Step 8: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :wrench:
- Summary of chapter units defined and dependencies mapped
- Review path: `<record>/inception/units-generation/`
- Structured approval question with options: Approve (continue to Construction phase) / Request Changes

## Sensors

This stage's outputs are markdown artefacts under `<record>/inception/units-generation/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings), and — for `unit-of-work-dependency.md` specifically — that the required fenced `yaml` edge block is present, well-formed, and cycle-free. Failure mode: missing headings or an absent/malformed/cyclic edge block emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter (this stage consumes `book-structure`, `book-structure-decisions`, `requirements`).

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

- Prescriptive rule → `.claude/rules/amadeus-phase-<phase>.md` (phase-scoped)
  or `.claude/rules/amadeus-<org|team|project>.md` (cross-cutting)
- Verification check → new manifest at `.claude/sensors/amadeus-<id>.md`
  (capability descriptor only — no `applies_to`); add the new id to
  the relevant stage's `sensors: [...]` frontmatter list to wire it

If nothing surfaces or the user skips all, proceed to the gate. The memory.md
file stays in the artefact directory as part of the stage's permanent record.

Stage files are immutable framework artefacts — the ritual writes into the
harness, not into this file. Next time this stage runs, the new rules and
sensors load automatically.
