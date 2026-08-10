<!--
  Attribution: the grilling discipline in this file is adapted from the
  "grilling" skill by Matt Pocock (mattpocock/skills), MIT License.
  Original: https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md
  Copyright (c) Matt Pocock. Adapted for Amadeus as "Amadeus Grilling".
-->

# Grilling Protocol

The single source for the **grilling discipline**: a relentless, round-by-round
interview about a plan, design, or decision space until agent and user reach a
shared understanding. Two surfaces consume this protocol and define nothing of
the discipline themselves:

- **Grill me mode** (workflow) — the fourth interaction mode in
  `stage-protocol.md` §3 Step 3d.
- **`/amadeus-grilling`** (standalone) — the read-only session skill at
  `{{HARNESS_DIR}}/skills/amadeus-grilling/SKILL.md`.

Questions render through the harness's question-rendering annex, exactly like
every other structured question. This protocol never names a harness tool.

## Two layers: skeleton, then overlay

This file is two layers and never interleaves them:

1. **The skeleton** (§1) — the upstream grilling skill, adopted verbatim. It
   defines the model: a design tree, worked in rounds, driven by the frontier.
2. **The overlay** (§2 onward) — the Amadeus contracts that the skeleton knows
   nothing about: depth as a pruning threshold, the circuit breaker, the
   questions-file and audit obligations, the annex mapping. The overlay adds
   obligations around the skeleton; it never rewrites the skeleton's wording.

**Extracting the skeleton.** The skeleton is delimited by a marker pair, so
extraction survives any overlay edit and depends on no line numbers:

```bash
awk '/^<!-- amadeus-grilling-skeleton:begin /{f=1;next} /^<!-- amadeus-grilling-skeleton:end -->/{f=0} f' grilling-protocol.md > /tmp/skeleton.md
diff /tmp/skeleton.md <pinned-upstream-text>   # expected: no output, exit 0
```

The marker lines themselves are not part of the skeleton. The `upstream=`
attribute on the begin marker records the exact upstream commit the skeleton
was taken from — it is the attribution anchor for the MIT header above, and the
diff above is the machine check that the bytes still match that commit. Use the
same two commands to re-sync against a future upstream revision.

## 1. Skeleton — upstream grilling, verbatim

Everything between the markers is upstream text under MIT. Do not reword,
reformat, renumber, or annotate it; Amadeus additions belong in the overlay.

<!-- amadeus-grilling-skeleton:begin upstream=1495d014303e041c51c29f9e442485ba06f5878d -->
---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
<!-- amadeus-grilling-skeleton:end -->

## 2. Overlay — the Amadeus round loop

### 2.1 Rounds, frontier, termination

The round is the unit of presentation, not the single question. Ask the whole
(pruned) frontier in one round — numbered, each carrying a recommended answer
and the 1-2 sentence rationale for it — then wait for the answers before
recomputing the tree. Questions that depend on another question still open in
this round belong to a later round.

**Termination is coverage, not counting.** A session ends when the pruned
frontier is empty — every branch of the design tree visited, nothing left
silently assumed — or when the user says `done`. The number of questions asked
is an emergent value of the tree: it is never a termination condition, never a
target, and no rule in this protocol obliges a session to end at a count. The
only count-shaped rule is the circuit breaker in §2.4, which is a disclosed
abort, not a completion.

### 2.2 Depth is a materiality threshold

Depth decides **which nodes enter the tree**, not how many questions may be
asked. A node below the active threshold is pruned before the frontier is
computed, so it never becomes a question:

| Level | Nodes that enter the tree | Circuit breaker (§2.4) |
|---|---|---|
| Minimal | Decisions that block implementation, and irreversible decisions | 12 |
| Standard | The above, plus design decisions carrying a real trade-off | 24 |
| Comprehensive | The above, plus edge cases, extension points, operational detail | 36 |
| Free *(standalone only)* | No pruning — every branch of the tree | none |

Workflow grilling takes its level from the active stage depth, which carries the
engine's three values only — `Free` never appears on the wire, in state, or on a
directive. Standalone grilling takes an explicitly requested level and defaults
to Free when none is requested, matching upstream behaviour for single use.

### 2.3 Deferred nodes are named, never dropped

Pruning is a recorded decision, not an invisible one. The agreement summary
(§3, C-4) carries a required section — **"Deferred as below the threshold"** —
listing each pruned node and the level that would have admitted it. Under Free
nothing is pruned: state that explicitly ("none — Free prunes nothing") rather
than omitting the section.

### 2.4 Circuit breaker

A level in force (Minimal / Standard / Comprehensive) bounds session length with
a circuit breaker at three times the `stage-protocol.md` §8 depth guidance:
**Minimal 12, Standard
24, Comprehensive 36** rendered questions in total across all rounds, including
estimate confirmations and demoted or clarifying follow-ups. Free is exempt —
its safety valves are the per-round human gate and `done`.

When the breaker is reached, stop and **disclose that the tree was not fully
traversed**: name the frontier still open and carry it into the workflow
approval boundary record or the standalone terminal agreement summary alongside
the deferred nodes. Proceed directly to C-4; do not open another round.

Silent truncation is forbidden. Never present a summary as a completed
traversal when the breaker fired, and never end a session by quietly not asking
the next round — an unasked frontier is disclosed or it is asked.

### 2.5 Recording obligations (workflow only)

- **Mode marker.** The questions file is created header-only in
  `stage-protocol.md` §3 Step 2; its first line is
  `<!-- amadeus-grilling:v1 mode=grilling -->`. The marker declares that this
  file records a grilling session, so its question count is read against the
  frontier contract rather than a fixed ceiling.
- **One entry per question.** Round batching changes presentation only, never
  the record: each question is appended to the questions file with a blank
  `[Answer]:` tag **before** the round is presented, each answer is written back
  to its own tag before the next round, and the `decision` / `answer` audit
  pair is emitted per question, in order. No new event types, no batched entry.
- **Recorded justification on exceeding the depth ceiling.** Crossing the
  `stage-protocol.md` §8 Depth-Level Contract ceiling (Minimal 4 / Standard 8 /
  Comprehensive 12) is
  expected under frontier-driven termination. At the moment the total crosses
  it, append exactly one line to the questions file:

  ```
  <!-- amadeus-grilling:justification depth=<Depth> questions=<N> frontier-driven -->
  ```

  with `<Depth>` the active depth and `<N>` the total rendered questions at the
  crossing. This line is the standing form of the recorded-justification clause
  in `stage-protocol.md` §8. Fixed shape, one line, no free text, written once
  per session — it is machine-matched verbatim, so it is never reworded and
  never merged into another line.

### 2.6 Facts, estimates, decisions

- **Facts are the agent's job** (§1). Dispatch a sub-agent for anything the
  environment can answer and do not block the round on it: only the questions
  downstream of a running exploration wait, and they simply belong to a later
  round.
- **A fact self-research cannot settle** is put as an estimate with a
  confidence level (high / medium / low) for confirmation. If the user rejects
  the estimate, demote it to a regular judgement question.
- **Decisions are always the user's.** A recommended answer is a
  recommendation, never a default the agent may apply on the user's behalf —
  autonomy is never inferred.

## 3. Question Spec Templates

One spec block = one question; a round is several of them presented together
(§4). Options stay within 2-4; the "Other" escape is the harness built-in or
the annex-defined explicit option (existing contract — do not add it to
`options`).

### C-2: Round question

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

Estimate-confirmation variant (§2.6): the prompt includes "Based on my
research, I estimate [X] (confidence: high/medium/low)." with two options —
"Yes, proceed on that basis (recommended)" / "No, that's wrong (demote to a
regular question)".

### C-4: Agreement summary confirmation

Present immediately after printing the full decision table (question →
decision) to the terminal, followed by the required "Deferred as below the
threshold" section (§2.3) and any frontier left open by the circuit breaker
(§2.4):

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

Do not enter the generation flow until "Yes, confirmed" is selected. A
correction request updates the affected answer (workflow: its `[Answer]:` tag)
and re-presents the summary.

## 4. Workflow vs Standalone

The discipline (§1, §2) is identical in both contexts. Only the level source
and the recording obligations differ:

| Aspect | Grill me mode (workflow) | /amadeus-grilling (standalone) |
|---|---|---|
| Entry | Mode selection in stage-protocol §3 Step 2 | Skill invocation, subject via argument |
| Level source | Active stage depth (Minimal / Standard / Comprehensive) | Explicitly requested level; Free by default |
| Pruning | Per §2.2 at the active depth | Only when a level is requested; Free prunes nothing |
| Circuit breaker | Per §2.4 | Per §2.4 when a level is requested; exempt under Free |
| Questions file | REQUIRED — mode marker, one entry per question, blank `[Answer]:` before presenting, write-back before the next round, justification line on the depth-ceiling crossing | None — terminal only |
| Audit log | REQUIRED — `bun {{HARNESS_DIR}}/tools/amadeus-log.ts decision` before each question, `... answer` after each answer (per question; existing event types only) | None — read-only classification, no audit events |
| After confirmation | Stage artifact generation (stage-protocol Step 4+) | Terminal summary including deferred nodes and unresolved material points; file written only on explicit user request |
| State | Stage pointer advances via the normal stage lifecycle | Never touches the workflow stage pointer |

### Rendering a round through the annex

The round boundary is a semantic unit and is preserved on every harness:

- **Harness renders several questions per call** — present the round in one
  call. If the round exceeds the harness's per-call limit (the Claude Code
  annex allows up to 4), split it into consecutive calls within the same round
  and collect all answers before recomputing the frontier.
- **Harness renders a single question per call** — present the round's
  questions consecutively, in order, without recomputing the frontier between
  them. The tree is recomputed only after the round's last answer.

Either way, the questions file and audit record stay one entry per question
(§2.5).
