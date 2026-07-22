---
slug: chapter-drafting
phase: construction
execution: ALWAYS
condition: Always executes for every chapter unit in the execution plan.
lead_agent: amadeus-author-agent
support_agents: []
mode: subagent
reviewer: amadeus-editor-agent
reviewer_max_iterations: 2
for_each: unit-of-work
workspace_requires: true
produces:
  - chapter-draft-plan
  - chapter-summary
consumes:
  - artifact: unit-of-work
    required: true
  - artifact: unit-of-work-dependency
    required: false
  - artifact: book-structure
    required: true
  - artifact: requirements
    required: true
requires_stage:
  - units-generation
sensors:
  - required-sections
  - upstream-coverage
scopes:
  - book
inputs: <record>/inception/units-generation/unit-of-work.md (this chapter's unit), <record>/inception/book-structure-design/book-structure.md, <record>/inception/requirements-analysis/requirements.md, chapter-summary.md of already-drafted chapters
outputs: manuscript chapter file(s) at workspace root + chapter-draft-plan.md, chapter-summary.md (under this stage's per-unit record dir, engine-resolved)
---

# Chapter Drafting

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

## Steps

### Critical Rules

- Manuscript content goes to the workspace root manuscript tree (e.g. `manuscript/<chapter-file>.md`), NEVER to the record dir
- The record dir for this unit receives exactly two artifacts: `chapter-draft-plan.md` and `chapter-summary.md`
- Use the terminology and notation conventions from `book-structure.md` verbatim — do not coin synonyms for canonical terms
- Brownfield manuscripts: modify chapter files in-place. NEVER create duplicates like `chapter-01_v2.md`

### Step 1: Load Agent Persona

Load amadeus-author-agent persona from `agents/amadeus-author-agent.md`.

### Step 2: Read All Chapter Inputs

- This chapter's unit definition from `<record>/inception/units-generation/unit-of-work.md`
- Prerequisite edges for this chapter from `<record>/inception/units-generation/unit-of-work-dependency.md` (if exists)
- Book structure, reader contract, and conventions from `<record>/inception/book-structure-design/book-structure.md`
- Reader/content requirements from `<record>/inception/requirements-analysis/requirements.md`
- `chapter-summary.md` of every already-drafted chapter this chapter depends on (continuity: terms already introduced, promises already made to the reader)

### Step 3: Write the Chapter Draft Plan

Write `chapter-draft-plan.md` in this unit's record dir BEFORE drafting prose:

- Section outline (H2/H3 skeleton) with 1-2 sentences of intent per section
- The chapter's reader contract restated, and which sections discharge which part of it
- Terms this chapter introduces (checked against the canonical term list) and terms it assumes from prerequisite chapters
- Examples, sample code, and figures planned, with their source strategy
- Target length and any structural risks

### Step 4: Draft the Chapter

Write the manuscript file(s) at the workspace root following the plan:

- Honour the section outline; if the draft needs to deviate from the plan, update `chapter-draft-plan.md` in the same session and note the deviation
- Every sample-code block must actually run (execute it) or be explicitly marked as pseudo-code
- Cross-references to other chapters use the chapter identifiers from `book-structure.md`, never ad-hoc titles

### Step 5: Self-Review Pass

Before handing to the reviewer:

- Terminology sweep: grep the draft for violations of the canonical term list
- Reader-contract check: does the chapter deliver what `book-structure.md` promised for it
- Continuity check: no forward references to chapters that do not exist yet, unless recorded as an open thread

### Step 6: Write the Chapter Summary

Write `chapter-summary.md` in this unit's record dir:

- Manuscript file paths written or modified
- Terms introduced (additions to the working glossary)
- Cross-references made (outgoing and expected incoming)
- Open threads left for later chapters (promises the manuscript now carries)
- Deviations from the draft plan, with rationale

### Step 7: Update State

Update `<record>/amadeus-state.md`:
- Mark this unit's Chapter Drafting as `[x]` completed

### Step 8: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :memo:
- Summary of the chapter drafted, files written, contract coverage
- Review path: manuscript file(s) + this unit's record dir
- Structured approval question with options: Approve / Request Changes

## Sensors

This stage's record outputs are markdown artefacts under this unit's record dir.

The imported sensors check those outputs:

- **`required-sections`** verifies each record artifact contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter (this stage consumes `unit-of-work`, `unit-of-work-dependency`, `book-structure`, `requirements`).

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
