---
slug: manuscript-review
phase: construction
execution: ALWAYS
condition: Always executes once after all chapter units are drafted.
lead_agent: amadeus-editor-agent
support_agents: []
mode: inline
produces:
  - manuscript-review-report
consumes:
  - artifact: chapter-draft-plan
    required: true
  - artifact: chapter-summary
    required: true
  - artifact: book-structure
    required: true
requires_stage:
  - chapter-drafting
sensors:
  - required-sections
  - upstream-coverage
scopes:
  - book
inputs: ALL chapter drafts across all units + every unit's chapter-draft-plan.md / chapter-summary.md + <record>/inception/book-structure-design/book-structure.md
outputs: manuscript-review-report.md (under this stage's record dir, engine-resolved) + verification/phase-check-construction.md
---

# Manuscript Review

MANDATORY: Follow stage-protocol.md for approval gates, question format, and completion messages.

NOTE: **This is the whole-manuscript pass.** Per-chapter quality was already gated by the Chapter Drafting reviewer; this stage checks the properties that only exist ACROSS chapters — consistency, continuity, and completeness against the book structure.

## Steps

### Step 1: Load Agent Persona

Load amadeus-editor-agent persona from `agents/amadeus-editor-agent.md`.

### Step 2: Assemble the Review Corpus

- Read `<record>/inception/book-structure-design/book-structure.md` (structure, reader contracts, canonical terms)
- Read every unit's `chapter-draft-plan.md` and `chapter-summary.md`
- Read the full manuscript tree at the workspace root

### Step 3: Run the Cross-Chapter Checks

Run each check and record findings with file:line evidence:

1. **Structure conformance** — every chapter in `book-structure.md` exists in the manuscript; no unplanned chapters without a recorded deviation
2. **Terminology consistency** — grep-based sweep of every canonical term and its known synonym violations across all chapters
3. **Cross-reference validity** — every outgoing reference recorded in the chapter summaries resolves to an existing chapter/section
4. **Open-thread closure** — every open thread promised in a chapter-summary is either discharged by a later chapter or explicitly carried into the report as known-open
5. **Redundancy and gaps** — content covered twice across chapters, and reader-contract items no chapter delivers
6. **Sample verification** — re-run every runnable sample; record actual exit codes / outputs, never assumed results

### Step 4: Produce the Review Report

Write `manuscript-review-report.md` in this stage's record dir:

- Per-check findings with evidence (file:line, command outputs verbatim)
- Per-chapter verdict: READY / REVISE with the blocking findings listed
- Whole-manuscript verdict and the fix list ordered by severity

### Step 5: Apply or Route Fixes

- Mechanical fixes (typo-class, terminology substitutions): apply directly to the manuscript, list each applied fix in the report
- Structural fixes (chapter rewrites, missing content): do NOT fix silently — surface them in the completion message; the user decides whether to loop the affected chapter units back through Chapter Drafting

### Step 6: Produce the Phase-Check Artifact

Construction is the final phase of the book scope, so the engine's phase-boundary
guard requires `<record>/verification/phase-check-construction.md` before this
stage's approval can complete. Produce it: summarize which construction outputs
exist, which checks ran, and their real results.

### Step 7: Update State

Update `<record>/amadeus-state.md`:
- Mark Manuscript Review as `[x]` completed

### Step 8: Present Completion & Request Approval

Use stage-protocol.md completion template with completion emoji: :mag:
- Summary of checks run, fixes applied, chapters needing revision
- Review path: `<record>/construction/manuscript-review/`
- Structured approval question with options: Approve (workflow complete) / Request Changes

## Sensors

This stage's outputs are markdown artefacts under `<record>/construction/manuscript-review/`.

The imported sensors check those outputs:

- **`required-sections`** verifies the output contains the registry default (≥2 H2 headings). Failure mode: missing headings emit `SENSOR_FAILED` with detail at `<record>/.amadeus-sensors/<stage-slug>/required-sections-<iso>.md`.
- **`upstream-coverage`** verifies the output prose references each artefact declared in this stage's `consumes:` frontmatter (this stage consumes `chapter-draft-plan`, `chapter-summary`, `book-structure`).

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
