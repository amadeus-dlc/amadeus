---
slug: book-structure-design
phase: inception
execution: ALWAYS
condition: Always executes when in scope. Designs the book's part/chapter structure that Units Generation decomposes into chapter units.
lead_agent: amadeus-editor-agent
support_agents:
  - amadeus-author-agent
mode: inline
reviewer: amadeus-product-lead-agent
reviewer_max_iterations: 2
produces:
  - book-structure
  - book-structure-decisions
consumes:
  - artifact: requirements
    required: true
  - artifact: scope-document
    required: false
  - artifact: intent-statement
    required: false
requires_stage:
  - requirements-analysis
sensors:
  - required-sections
  - upstream-coverage
scopes:
  - book
inputs: <record>/inception/requirements-analysis/requirements.md, <record>/ideation/scope-definition/scope-document.md (if produced), <record>/ideation/intent-capture/intent-statement.md (if produced)
outputs: book-structure.md, book-structure-decisions.md (under this stage's record dir, engine-resolved)
---

# Book Structure Design

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

NOTE: **This stage designs the book's macro structure (parts, chapters, reader path). Stage 2.7 Units Generation decomposes that structure into chapter units and their dependency DAG.** This stage MUST NOT define unit boundaries or a writing order — those belong to 2.7 and the Bolt loop.

---

## Steps

### PART 1: Planning

### Step 1: Load Agent Personas

Load amadeus-editor-agent persona from `agents/amadeus-editor-agent.md`.
Load amadeus-author-agent persona from `agents/amadeus-author-agent.md` for feasibility input on drafting effort.

### Step 2: Load Prior Context

- Read `<record>/inception/requirements-analysis/requirements.md` (reader requirements, content requirements)
- Read `<record>/ideation/scope-definition/scope-document.md` (in/out boundary) if produced
- Read `<record>/ideation/intent-capture/intent-statement.md` if produced

### Step 3: Create Structure Plan with Questions

Create `<record>/inception/book-structure-design/book-structure-design-questions.md` with questions using [Answer]: tag format:

- Book form (tutorial, reference, cookbook, essay collection, hybrid) and why
- Part organization (flat chapter list vs. parts grouping chapters)
- Reader path assumption (strictly linear, mostly linear with optional detours, random access)
- Chapter granularity target (approximate count and per-chapter page/word budget)
- Sample-code and figure strategy (none, inline snippets, runnable examples repository)
- Front/back matter needs (preface, appendices, glossary, index)

### Step 4: Collect and Analyze Answers

Collect answers following stage-protocol.md §3 question flow (offer interaction mode choice, collect answers, write back to file).
- MANDATORY ambiguity analysis: scan for vague language, contradictions, missing details
- Create follow-up questions if ANY ambiguity found
- Resolve all ambiguities before proceeding

### Step 5: Get Plan Approval

Present the structure approach to the user as a structured question:
- Summarize: book form, part/chapter skeleton, reader path, estimated chapter count
- Options: Approve Plan / Revise Plan

---

### PART 2: Generation

### Step 6: Execute Plan — Generate Structure Artifacts

Based on the approved plan, generate 2 artifacts in `<record>/inception/book-structure-design/`:

**book-structure.md:**
- Part and chapter map: every part and chapter with working title and a 2-4 sentence synopsis
- Per-chapter reader contract: what the reader can do or understands after the chapter (derived from requirements — cite the requirement IDs each chapter serves)
- Reader path: the assumed reading order and any legitimate detours
- Terminology and notation conventions the whole manuscript must follow (canonical term list; this is the single source Chapter Drafting and Manuscript Review check against)
- Sample-code / figure strategy per chapter (which chapters carry runnable examples, which carry diagrams)
- Front/back matter inventory

**book-structure-decisions.md:**
- Structural decisions with trade-off analysis: for each major decision (book form, part split, chapter granularity) record Context, Decision, Consequences, and at least 2 Alternatives Rejected
- Traceability: how the structure covers every content requirement, and which requirements are deliberately deferred (with rationale)

### Step 7: Update State

Update `<record>/amadeus-state.md`:
- Mark Book Structure Design as `[x]` completed
- Update current stage and next stage

### Step 8: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :books:
- Summary of parts, chapters, reader path, and conventions established
- Review path: `<record>/inception/book-structure-design/`
- Structured approval question with options: Approve (continue to Units Generation) / Request Changes

## Sensors

This stage's outputs are markdown artefacts under `<record>/inception/book-structure-design/`.

The imported sensors check those outputs:

- **`required-sections`** verifies each output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter. Failure mode: missing upstream references emit `SENSOR_FAILED` listing each unreferenced artefact (this stage consumes `requirements`, `scope-document`, `intent-statement`).

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
