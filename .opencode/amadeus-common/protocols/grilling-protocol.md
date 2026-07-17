<!--
  Attribution: the grilling discipline in this file is adapted from the
  "grilling" skill by Matt Pocock (mattpocock/skills), MIT License.
  Original: https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md
  Copyright (c) Matt Pocock. Adapted for Amadeus as "Amadeus Grilling".
-->

# Grilling Protocol

The single source for the **grilling discipline**: a relentless, one-question-
at-a-time interview about a plan, design, or decision space until agent and
user reach a shared understanding. Two surfaces consume this protocol and
define nothing of the discipline themselves:

- **Grill me mode** (workflow) — the fourth interaction mode in
  `stage-protocol.md` §3 Step 3d.
- **`/amadeus-grilling`** (standalone) — the read-only session skill at
  `.opencode/skills/amadeus-grilling/SKILL.md`.

Questions render through the harness's question-rendering annex, exactly like
every other structured question. This protocol never names a harness tool.

---

## 1. Dialogue Discipline (applies in BOTH contexts)

| # | Rule |
|---|------|
| D1 | Present questions **one at a time**. Never bundle multiple questions into a single structured-question call. |
| D2 | Every question carries a **recommended answer**: state the rationale for the recommendation in 1-2 sentences inside the question text, and mark the first option's label with "(recommended)". |
| D3 | **Facts are never asked.** Anything determinable from the codebase, prior artifacts, or the code knowledge base is looked up by the agent, not put to the user. |
| D4 | A fact the agent cannot settle by self-research is presented as an **estimate with a confidence level** (high / medium / low) for confirmation. If the user disagrees, demote it to a regular judgement question. |
| D5 | **Decisions are always the user's.** Put each decision to the user and wait for the answer. Never decide on the user's behalf — autonomy is never inferred. |
| D6 | **Hybrid termination.** When the depth guideline is reached (the existing `stage-protocol.md` §3 contract: Minimal ~2-4 / Standard ~5-8 / Comprehensive ~8-12+ questions), present a continuation check. The user may extend with "continue" or cut the session short at any point with "done". |
| D7 | **Shared understanding is confirmed, never assumed.** At the end, present an agreement summary of every decision and obtain explicit confirmation. Do not proceed to artifact generation or session close before confirmation. On a correction request, update the affected answer and re-present the summary. |

## 2. The Grilling Loop (8 steps)

1. **Investigate** — Establish the subject (stage context or skill argument)
   and self-research the relevant facts from the codebase, artifacts, and the
   code knowledge base. Never generate a fact-lookup question (D3).
2. **Formulate** — Build the next single question: a judgement question, or a
   confidence-tagged estimate confirmation (D4). Include the recommendation
   rationale in the question text and "(recommended)" on the first option (D2).
3. **Append** — *(workflow only)* The questions file was created header-only in
   `stage-protocol.md` §3 Step 2 (grilling never pre-authors a question set).
   Append this dynamically-formulated question to it with a blank `[Answer]:` tag
   **before presenting it** (the Stop hook's human-wait convention), and log the
   pre-presentation `decision` audit event.
4. **Present** — Present exactly one question through the annex (D1). If an
   estimate confirmation is rejected, demote it to a judgement question and
   re-present.
5. **WriteBack** — *(workflow only)* Write the answer back to its `[Answer]:`
   tag immediately, and log the `answer` audit event — one per question.
6. **CheckEnd** — "done" short-circuits to step 7. If the depth guideline is
   reached, present the continuation check (§3 C-3); "continue" loops to
   step 1. Otherwise, if open points remain, loop to step 1 (D6).
7. **Summary** — Present the agreement summary of all decisions and request
   explicit confirmation (§3 C-4). A correction request updates the affected
   answer (workflow: the `[Answer]:` tag) and re-presents the summary. Never
   move on until confirmed (D7).
8. **Confirmed** — Workflow: hand off to the stage's artifact generation
   (stage-protocol Step 4 onward, unchanged). Standalone: print the summary to
   the terminal and finish (write it to a path only on explicit user request).

## 3. Question Spec Templates

One spec block = one question, using the annex's existing field mapping.
Options stay within 2-4; the "Other" escape is the harness built-in or the
annex-defined explicit option (existing contract — do not add it to `options`).

### C-2: Grilling question (one at a time)

```question
prompt: "Q[n]. [Question]. [1-2 sentence rationale for the recommendation]"
header: "[Short topic label]"
multiSelect: false
options:
  - label: "[Recommended answer, summarised] (recommended)"
    description: "[What the recommendation entails]"
  - label: "[Alternative B]"
    description: "[Description]"
  - label: "[Alternative C]"
    description: "[Description]"
```

Estimate-confirmation variant (D4): the prompt includes "Based on my research,
I estimate [X] (confidence: high/medium/low)." with two options — "Yes,
proceed on that basis (recommended)" / "No, that's wrong (demote to a regular
question)".

### C-3: Continuation check (depth guideline reached)

```question
prompt: "The depth guideline ([N] questions) is reached. [One sentence on how well the key points are covered]. Continue?"
header: Continue?
multiSelect: false
options:
  - label: "Proceed to summary (recommended)"
    description: Review the agreement summary and finish
  - label: "Continue"
    description: Keep drilling deeper
```

"done" is accepted as free text at any point in the dialogue, not only at this
surface (D6).

### C-4: Agreement summary confirmation

Present immediately after printing the full decision table (question →
decision) to the terminal:

```question
prompt: "That is the full set of agreed decisions. Confirm this understanding?"
header: Shared understanding
multiSelect: false
options:
  - label: "Yes, confirmed (recommended)"
    description: "Workflow: proceed to artifact generation / Standalone: finish"
  - label: "I want to revise"
    description: Point at what to change (the answer is updated and the summary re-presented)
```

Do not enter the generation flow until "Yes, confirmed" is selected.

## 4. Workflow vs Standalone

The discipline (§1, §2) is identical in both contexts. Only the recording
obligations differ:

| Aspect | Grill me mode (workflow) | /amadeus-grilling (standalone) |
|---|---|---|
| Entry | Mode selection in stage-protocol §3 Step 2 | Skill invocation, subject via argument |
| Questions file | REQUIRED — append each question with a blank `[Answer]:` tag before presenting; write each answer back before the next question | None — terminal only |
| Audit log | REQUIRED — `bun .opencode/tools/amadeus-log.ts decision` before each question, `... answer` after each answer (per question; existing event types only) | None — read-only classification, no audit events |
| After confirmation | Stage artifact generation (stage-protocol Step 4+) | Terminal summary; file written only on explicit user request |
| State | Stage pointer advances via the normal stage lifecycle | Never touches the workflow stage pointer |
