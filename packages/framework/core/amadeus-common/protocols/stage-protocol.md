# Stage Protocol

MANDATORY: All stages follow this protocol. Referenced by every stage file.

### Structured questions (harness-neutral contract)

Whenever this protocol or a stage file says **present a structured question**,
render the question through the harness's question-rendering annex —
`question-rendering.md` beside the orchestrator SKILL.md. Question specs in
this protocol are written as fenced ` ```question ` blocks (`prompt`, `header`,
`multiSelect`, `options[].label`, `options[].description`); the annex is the
single place that binds that spec to the harness's native UI. Stage files and
this protocol never name a harness tool.

### Critical Compliance Checklist (most commonly missed steps)
Before and during EVERY stage, verify:
1. [ ] **Use the engine for forward gate transitions** — `amadeus-state.ts gate-start <slug>` may be used before the approval gate (`[-]` → `[?]`) so status shows the held gate, but the approve path is `amadeus-orchestrate.ts report --stage <slug> --result approved --user-input "<choice>"`. The report command opens a missing gate when needed, emits the correct audit events through the state tool, and advances. Request-changes still uses `amadeus-state.ts reject <slug> --feedback "<text>"`. Do NOT call `amadeus-audit.ts append` separately. (§2)
2. [ ] **Log questions via `amadeus-log.ts`** — before presenting a structured question: `bun {{HARNESS_DIR}}/tools/amadeus-log.ts decision --stage <slug> --decision "<summary>" --options "<csv>"`. After response: `bun {{HARNESS_DIR}}/tools/amadeus-log.ts answer --stage <slug> --details "<exact choice>"`. (§3)
3. [ ] **Never summarize User Input** — use exact option labels. (§2, §3)
4. [ ] **Task transitions + state sync** — Mark previous task `completed`, then `TaskUpdate({ ..., status: "in_progress", activeForm: "Running [Stage] [slug]" })`. The `[slug]` suffix triggers the PostToolUse hook that syncs the state file. `amadeus-orchestrate.ts report --stage <slug> --result approved` auto-advances to the next in-scope stage (or completes the workflow on the final stage) — do NOT call `advance` separately after approval. (§4)
5. [ ] **Stage ritual is ATOMIC** — once a stage starts, EVERY step in its protocol fires: questions → artifact → reviewer (if declared) → learnings → gate. No step is skippable based on inferred user intent. "Skip to stage X" means skip INTERMEDIATE stages, NOT shortcut the TARGET stage's ritual. If a user jumps forward from a stage at its gate, the current stage's learnings ritual (§13) MUST fire before the jump executes.
6. [ ] **Autonomy is NEVER inferred** — a user saying "go with recommended" or "pick the best answers" for one stage is a ONE-TIME instruction for THAT stage only. It does NOT create a standing rule. The next stage starts fresh with its declared autonomy mode. The ONLY way to get autonomous mode is: (a) the directive explicitly carries `autonomy: autonomous`, OR (b) the human explicitly says "run this autonomous" for the specific stage being proposed. NEVER carry forward an autonomy inference from a previous stage. NEVER self-answer questions without explicit permission for THIS stage.
7. [ ] **Route Amadeus-owned findings** — a confirmed Amadeus defect or actionable concern outside the active intent goes through the deterministic GitHub Issue creator and the resolved `finding.github.issue.creation.consent`. Never improvise a direct GitHub mutation. (§14)

---

## 1. Approval Gates

Every stage (except the 3 stages in the Initialization phase: workspace-scaffold, workspace-detection, state-init) requires explicit user approval before proceeding.

### HARD STOP RULE (non-negotiable)

When a gate requires human adjudication (any gate under `none`, or a `semi` milestone — a phase boundary, or the walking skeleton where its ceremony fires; Intent completion is the final phase boundary and travels as one), you MUST end your turn immediately after presenting it and wait for the user's explicit response. Do NOT call any tool until the user has typed their choice in a new message. A directive carrying `autonomy_auto_approve: true` is different: the audit-backed Intent authorization (a `full` grant decision, or a `semi` authorized ruling) has already selected the gate effect, so after the full quality ritual the conductor reports approval without presenting a human question or synthesizing `HUMAN_TURN`.

`full` is not "never stops". A ruling point reserved to the user, and any derivation that ends contested or empty, is still owed to a person in every mode — under `full` too. In an INTERACTIVE session the rule above applies verbatim: present it and end the turn. In a NON-INTERACTIVE session there is nobody to present it to, so the engine enters **waiting** instead (`AWAITING_RULING`), recording the candidates and why none was unique; the conductor relays that terminal and stops rather than inventing an answer to keep moving.

When that same directive also carries `phase_boundary`, auto-approval does not waive the phase-check artifact. Write `<record>/verification/phase-check-<phase>.md` **before** reporting the approval, exactly as on a human-adjudicated boundary. The state guard is fail-closed and knows nothing about autonomy: an auto-approve reported with that artifact absent is refused, not excused, and the refusal is a typed error on an authorization that was otherwise valid. The grant decides *who* approves; it never decides whether the boundary evidence exists.

### NO EMERGENT BEHAVIOR RULE
Construction and Operation stages MUST use standardized 2-option completion messages. DO NOT create 3-option menus or other emergent navigation patterns. Only IDEATION and INCEPTION stages may conditionally include a 3rd option (to add a previously skipped stage). Any deviation from these patterns is a protocol violation.

### For simple decisions (3 or fewer options):
Present a structured question:

```question
prompt: "[Stage Name] complete. How would you like to proceed?"
header: Approval
multiSelect: false
options:
  - label: Approve
    description: Continue to [next stage]
  - label: Request Changes
    description: Provide revision feedback
```

**`[next stage]`** is the run-stage directive's `next_stage` field — the ACTUAL
next in-scope stage the engine will route to on approval (SKIP stages already
excluded). Fill the placeholder from that value; never derive or guess the next
stage yourself. When `next_stage` is `null` this is the final in-scope stage, so
word the Approve option as completing the workflow (e.g. "Complete the workflow")
rather than naming a next stage.

### For stages with conditional options:
IDEATION and INCEPTION stages may include a 3rd option to add a previously skipped stage:

```question
prompt: "[Stage Name] complete. How to proceed?"
header: Approval
multiSelect: false
options:
  - label: Approve
    description: Continue to [next stage]
  - label: Request Changes
    description: Provide revision feedback
  - label: Add [Skipped Stage]
    description: Include [stage] which was skipped
```

CONSTRUCTION and OPERATION stages: Strictly 2-option only (Approve / Request Changes).

### Revision loop escape hatch
After 3 "Request Changes" cycles on the same stage, add a third option to all subsequent approval gates for that stage:

```question
prompt: "[Stage Name] — this is revision cycle [N]. How would you like to proceed?"
header: Approval
multiSelect: false
options:
  - label: Approve
    description: Continue to [next stage]
  - label: Request Changes
    description: Provide further revision feedback
  - label: Accept as-is
    description: Archive current version and move on
```

If "Accept as-is" selected: log the decision in `<record>/audit/<host>-<clone>.jsonl` ("User accepted stage output as-is after [N] revision cycles"), mark stage complete, and proceed. This overrides the NO EMERGENT BEHAVIOR RULE for Construction stages only when the revision threshold is reached.

After the 2nd revision cycle (before the escape hatch activates), include a note in the approval question: "After one more revision, an 'Accept as-is' option will become available."

### Intent-scoped autonomy at Construction gates

Construction introduces three gate patterns that differ from the standard per-stage approval gate. See SKILL.md §CONSTRUCTION Flow for the complete orchestrator behaviour.

**Walking-skeleton gate**

The first Bolt in Construction carries the walking-skeleton ceremony only where the **Skeleton Stance** says it should. The stance is read from the record (`Skeleton Stance`, or the scope's greenfield classification when the field is absent or says `scope-dependent`); where it resolves `off` — the incremental scopes, which have nothing to bootstrap — the stage is an ordinary stage or phase gate and the milestone does not fire at all. An unreadable record keeps the ceremony with the human.

Where the ceremony does fire, the gate follows the same Intent mode as every other gate: `full` may auto-approve it under the active Intent grant after quality is READY; `none` and `semi` require the human. The gate covers the Bolt's design artifacts and generated code together. Audit: automatic approval records `AUTO_DECIDED`; the enclosing `BOLT_COMPLETED` ties the gate to the Bolt.

**Mode selection**

Intent autonomy is selected explicitly by a real human and is not inferred from headless invocation or a previous answer:

```question
prompt: "How autonomously should this Intent run?"
header: Autonomy
multiSelect: false
options:
  - label: none
    description: A human decides gates and questions.
  - label: semi
    description: Everything full decides, minus two milestones - the phase boundary and the walking skeleton - which always wait for a human. Bolt batches still run unattended.
  - label: full
    description: Every ruling point advances on its own where the derivation is unique. Where it is not, an interactive session is asked and a non-interactive one stops and waits.
```

- The default is always `none`.
- Record `none` / `semi` through `amadeus-bolt set-autonomy --mode <mode>`. For `full`, first run `amadeus-bolt preview-autonomy [--policies-file <normalized-json>]`, display its principal, grant scope, and normalized pre-decision policies, then wait for explicit human confirmation. After that real human turn, run `amadeus-bolt set-autonomy --mode full --confirmed-display-digest <preview-digest> [--policies-file <same-file>]`. The user supplies policies as natural language; the conductor, not the user, owns the normalized JSON carrier. The `--autonomy none|semi|full` launch flag is an additional recording means: it is accepted only as the first declaration (while `modeProvenance.kind === "system-default"`); `--autonomy full` still requires the grant ritual above and fails closed without it; `amadeus-bolt set-autonomy` remains the canonical recording path.
- The canonical authorization is the Intent audit. `Construction Autonomy Mode` is only an internal scheduling projection; legacy values never authorize a gate.
- Legacy standing delegation remains replayable for migration diagnostics but cannot authorize new work.

**Subsequent gates (per Intent mode)**

The four interaction kinds are `stage-gate`, `phase-gate`, `walking-skeleton` and `question`, and a mode is defined by which of them it decides for itself.

`none` decides none of them: every gate and every question is the human's.

`full` decides all four under the active Intent grant.

`semi` is `full` minus exactly two: `phase-gate` and `walking-skeleton` stay with the human. The permission set is not a hand-written list — it is the complement of that milestone pair, so a new interaction kind becomes semi-decidable without either list being edited, and a caller that hands `semi` a scope naming a milestone still does not get the milestone decided. `semi` holds no Intent grant (the current grant stays null — rulings rest on a lightweight semi-scoped authorization basis), accepts pre-decision policies via `--policies-file` as confirmed-policy material, and takes effect only when the mode was set by a human command (`modeProvenance.kind === "human-command"`).

Under `semi` and `full` alike, a `question` occurrence resolves through the same ruling order, and every ruling is recorded as `AUTO_DECIDED` — rulings from the last two rungs enter the unreviewed queue:

1. **Reserved to the user?** A spec change, a goal revision, an election hold, a merge outside the standing delegation. Reserved points are settled before any derivation runs, so no basis — however unanimous — auto-decides one.
2. **Confirmed policy → norm → past ruling → solo election → agent recommendation.** The first rung that singles out ONE option decides.
3. **Not unique.** A rung that ends `contested` (candidates, none dominant) or `none` (nothing to go on) is not a decision: the ruling goes to a person. Reaching the last rung is not a licence to answer anyway.
4. **Mechanism failure or norm conflict** parks. That is a defect, not a ruling.

Terminals 1 and 3 are where the modes stop being "unattended": an INTERACTIVE session is asked, and a NON-INTERACTIVE one enters waiting with the candidates recorded. Interactivity is judged per session — this clone's own audit shard holds at least one `HUMAN_TURN` — with no freshness window, no TTY probe and no declaration flag, and an unreadable signal falls closed to non-interactive.

Mode names are the same `none` / `semi` / `full` shown on the `--status` `Autonomy:` line, alongside the projection, the current interactivity verdict and the two consent-axis values. `Construction Autonomy Mode` is derived from the Intent mode by one function that the writer and the scheduler both call (`none` → `gated`, `semi` / `full` → `autonomous`); a record whose two fields disagree is refused loudly instead of quietly scheduling the lower of the two. `semi` therefore runs the Bolt swarm unattended: for parallel batches, authorization mode and execution shape remain separate axes.

Quality failure is never approval. In `semi` and `full`, the conductor writes the closed blocking observations and its fresh replan context to a machine-local carrier and runs `amadeus-bolt observe-quality --input <carrier>` before each repair. `repair` / `replanned` reruns the same closed checks; `READY` may proceed; `parked` is a hard stop whose result envelope must be surfaced without another LLM repair attempt. When the re-run is a §12a review whose iteration budget is already spent, that receipt funds exactly one further review iteration and is recorded through `complete-review` (§12a step 3); the review's own halt arm applies only when no such ruling exists. The first-party Quality Repair contribution and Loop Monitor persist the evidence history, replan once at the first threshold, and eventually park nonproductive repair as `REPAIR_STALLED` while retaining an active `full` grant. After the user explicitly retries, or after strictly improved evidence exists, the conductor writes a machine-local resume carrier and runs `amadeus-bolt resume-quality --input <carrier>`; only a `resumed` result restarts the forwarding loop. The user is never asked to author carrier JSON.

For a question under `full`, the conductor writes the normalized question, stable option IDs, applicable norm/history facts, recommendation, and (when available) the native solo-election result to a machine-local JSON carrier, then runs `amadeus-bolt decide-question --input <carrier>`. Use the returned `decided.effect.optionId` as the answer and record it in the questions file; `parked` is a hard stop, and `conflict` / `aborted` fail closed. The user is never asked to author JSON. When no election result is available, the Core records loud degradation before using the recommendation.

`human-required` is the one result that is not a failure. It means the ruling order reached terminal 1 or 3 — reserved to the user, or a derivation that did not single out an option — and it carries the outcome with it, so the candidates and the reason none was unique are already computed. Do not re-derive them and do not retry the carrier: present exactly what the result carries when the session is interactive, and relay the engine's waiting terminal when it is not.

For a question under `semi`, the conductor runs the **same** `amadeus-bolt decide-question --input <carrier>` procedure, unchanged — the carrier shape, the ruling order, the `decided.effect.optionId` answer, the loud degradation when no election result exists, the hard stop on `parked`, the fail-closed handling of `conflict` / `aborted`, and the `human-required` handling above are identical. Two things differ, and neither is a step of the procedure: the authorization basis is the semi-scoped one (`semi` holds no Intent grant, so the current grant stays null), and pre-decision policies reach the ladder through `--policies-file` as confirmed-policy material rather than through a grant. Under `semi`, therefore, do **not** put a stage question to the human directly: `decide-question` is the route, and a `human-required` result is what sends the question to a person. Milestones are unaffected — a phase boundary and the walking skeleton still require a human under `semi`.

**Halt-and-ask on failure**

When a Bolt's code-generation returns failure, **always halt regardless of autonomy mode** — the Bolt never proceeds on its own. This is the one case where `autonomous` mode stops to consult. Halting is unconditional; who rules on the halt is decided by the solo auto-election hook below, which names the one branch that does not present the prompt.

- Solo Bolt failure: preserve the explicit `batch_id` and `attempt_id` returned by `amadeus-bolt start`, halt immediately, emit `BOLT_FAILED` with `--slug`, `--batch-id <batch_id>` (the `solo:<n>:<unit>` value, not the numeric batch number), `--attempt`, and the current `--stage`, then present retry / skip / abort. Never recover these immutable keys by selecting the latest Bolt event.
- Parallel batch partial failure: wait for all parallel Tasks to return, preserve successful Bolts' artifacts, emit `BOLT_FAILED` for the failed Bolt with `Succeeded=[names]`, present `"Bolts [X, Y] succeeded, Bolt [Z] failed with: [error]. Options: retry Z, skip Z, abort Construction."`
- Retry: re-run the failed Bolt only inside the existing worktree.
- Skip: mark `[S]` in state with reason, proceed to next batch. Worktree at `<path>` is preserved.
- Abort: stop Construction; user can resume later. Worktree at `<path>` is preserved.

**Solo auto-election hook — which branch rules the halt.** The trigger is no longer a config leaf: `solo-election.trigger.mode` was abolished and the value is derived from the Intent Autonomy Mode, so a workspace that still carries the retired key (in any of its spellings) fails the config resolution loudly rather than being silently ignored — a setting you can see must be a setting that acts. Invalid layered config fails closed with an engine `error` before branch selection; neither an election nor a human prompt is emitted until the config is corrected. For a valid resolution, exactly one of these two branches runs, and the first one that applies wins:

1. **Solo mode AND the Intent Autonomy Mode derives an `auto` solo-election trigger** (`semi` / `full`; `none` derives `manual`) — the engine emits `execute-failure-election` (not `ask`). The conductor opens an election INSTEAD OF presenting the prompt below: write a definition JSON carrying `schemaVersion: 2`, `electionId`, `kind`, `voters` and a one-element `questions[]` whose entry sets `questionId` to the fixed id `q-failure-ruling`, `text` to the failure summary the directive carries, and `choices` mapped deterministically from `directive.choices` (`internalNo` = 1-based position, `label` = the choice text) — Retry / Skip / Abort, then run `bun {{HARNESS_DIR}}/tools/amadeus-election.ts open --trigger auto --file <definition.json>`. `--file` is REQUIRED: without it the CLI exits 2 on usage and no trigger is evaluated. Drive the election to a ruling and commit it through the ordinary ask report path (`report --user-input` with the ruling (`retry` / `skip` / `abort`)). Do not present the prompt on this branch.
2. **Every other case** — team mode, an Intent mode of `none` (deriving `manual`), the CLI answering `{"opened":null,"reason":"solo-election-manual-trigger-required"}` (which writes nothing), or a non-converged election (hold / split / interrupt / CLI error) — present the halt-and-ask prompt below exactly as written. This is the default branch.

The orchestrator runs `bun {{HARNESS_DIR}}/tools/amadeus-worktree.ts info --slug <slug>` to obtain the worktree `<path>` and `<branch_name>` deterministically before composing the halt-and-ask question. See `SKILL.md` § "Halt-and-ask failure handling" for the full tool-call sequence and the `worktree-info-schema.md` knowledge file for the JSON contract.

```question
prompt: "Bolt [Z] failed during code generation: [short error]. Worktree at [path] on branch [branch_name]. How would you like to proceed?"
header: Bolt Failure
multiSelect: false
options:
  - label: Retry
    description: Re-run Bolt [Z] in the existing worktree.
  - label: Skip
    description: Mark Bolt [Z] skipped; worktree preserved.
  - label: Abort
    description: Stop Construction; worktree preserved.
```

---

## 2. Completion Messages

Every stage ends with this 5-part structure:

### Closed stage-completion verification

Before entering the approval gate, verify only this closed checklist:

1. Every required artifact named by the current directive exists. Optional
   artifacts are required only when their documented condition applies.
2. Every validation command or sensor explicitly declared by the stage has run,
   and its recorded result is available to the gate.
3. Every unresolved finding has been classified with the closed severity
   vocabulary below, and any `BLOCKER` is named at the existing approval
   boundary.

Once these three checks are complete, do not start another exploratory review,
search for additional improvement opportunities, or invent a new completion
criterion. `FOLLOW-UP` and `NIT` findings do not prevent the approval gate;
`BLOCKER` findings are handed to the human there when the bounded reviewer loop
cannot resolve them.

### Part 0: Enter the approval gate (mandatory — before presenting completion)
Before showing the completion message:
1. Optional before the human prompt: `bun {{HARNESS_DIR}}/tools/amadeus-state.ts gate-start <slug>` — marks the stage `[-]` → `[?]` and emits `STAGE_AWAITING_APPROVAL`. The stage is now on-hold waiting for the user; `/amadeus --status` will show "Awaiting your approval on <stage-name>". If this step is missed, the later `report --stage <slug> --result approved` opens the missing gate before approval, and `reject <slug>` likewise backfills it before the rejection (both backfilled rows carry `Recovered: true`).
2. Present Parts 1-3 (announcement, summary, approval question).
3. Based on the user response:
   - **Approve** → `bun {{HARNESS_DIR}}/tools/amadeus-orchestrate.ts report --stage <slug> --result approved --user-input "<exact choice>"`. The engine emits any missing `STAGE_AWAITING_APPROVAL`, then `GATE_APPROVED` + `STAGE_COMPLETED`, and auto-advances to the next in-scope stage (or completes the workflow on the final stage). No separate `advance` call required.
   - **Request Changes** → `bun {{HARNESS_DIR}}/tools/amadeus-state.ts reject <slug> --feedback "<text>"`. The tool emits `GATE_REJECTED` + `STAGE_REVISING`, marks `[?]` → `[R]`, increments Revision Count. If gate-start was skipped (stage still `[-]`), reject backfills the missing `STAGE_AWAITING_APPROVAL` first — mirroring the approve-side backfill. After re-running the stage work, call `bun {{HARNESS_DIR}}/tools/amadeus-state.ts revise <slug>` to re-enter the gate (emits a fresh `STAGE_AWAITING_APPROVAL`, marks `[R]` → `[?]`).
   - **Accept as-is** (after 3 rejection cycles) → same as Approve; include `--user-input "Accept as-is after N cycles"`.

### Part 1: Announcement (mandatory)
```markdown
# [emoji] [Stage Name] Complete
```

### Part 2: Summary (mandatory)
Structured bullet-point summary of what was produced:
- Keep factual and content-focused
- DO NOT include workflow instructions ("please review", "let me know", "before we proceed")
- Include a brief inline summary table (5-10 lines) showing key artifacts produced and their top-level contents. This lets users make a quick approval decision without navigating to the file. Example:
  ```
  | Artifact | Contents |
  |----------|----------|
  | requirements.md | 6 FR groups (18 sub-requirements), 4 NFRs |
  | requirements-analysis-questions.md | 5 questions, all answered |
  ```
- For the FIRST completion message of a session (typically Requirements Analysis or Workspace Detection), include:
  "**Project depth**: [Minimal/Standard/Comprehensive] — depth adapts artifact detail.
  **Test strategy**: [Minimal/Standard/Comprehensive] — test strategy controls test volume.
  You can request different depth or test strategy at any approval gate."

### Part 3: Review + Approval (mandatory)
```markdown
**Review:** `<record>/[path to artifacts]`
```
Then present the structured approval question as defined above.

### Part 4: Progress update (mandatory — after user approves)
After the user selects "Approve", display a progress line before proceeding.

**For enterprise and feature scopes** (all 32 stages active):
```
Progress: [N]/32 overall | [phase-N]/[phase-total] [Phase] stages complete. Next: [Next Stage Name]
```

**For all other scopes** (fewer stages in scope), show in-scope progress with overall shown parenthetically:
```
Progress: [X]/[S] in-scope stages complete ([N]/32 overall) | [phase-N]/[phase-total] [Phase]. Next: [Next Stage Name]
```
Where `S` = total stages for the current scope. Reference scope stage counts:
| Scope | In-scope stages (S) |
|-------|---------------------|
| mvp | ~18 |
| poc | ~8 |
| fix | 7 |
| chore | ~5 |
| refactor | ~9 |
| infra | ~13 |
| security-patch | ~10 |

Example (enterprise): "Progress: 13/32 overall | 3/7 IDEATION stages complete. Next: Approval & Handoff"
Example (fix): "Progress: 5/8 in-scope stages complete (7/32 overall) | 2/3 CONSTRUCTION. Next: Build & Test"

Count only stages in the current phase (INITIALIZATION, IDEATION, INCEPTION, CONSTRUCTION, or OPERATION). Include both completed and skipped stages in the numerator.

---

## 3. Question Format

When a stage needs to ask the user questions:

### Question flow (all question counts)

**The questions file is always the source of truth.** Regardless of how many questions a stage has, the flow is:

**Step 1: Offer the user a choice of interaction mode — BEFORE authoring any questions.** The chosen mode decides whether a questions file is pre-authored at all, so the choice comes first: do NOT create a pre-built questions file while the mode is still undecided.

```question
prompt: "This stage has a total budget of up to [N] questions, including any follow-ups. How would you like to answer them?"
header: Questions
multiSelect: false
options:
  - label: Guide me
    description: Walk through each question interactively here
  - label: Grill me
    description: Round-by-round interview over the design tree admitted by the active materiality threshold — recommended answers included, until every admitted branch is settled (deferred nodes remain listed in the agreement summary). Depth acts as a pruning threshold here, not a question budget; the circuit breaker (3x the guideline) is the only ceiling
  - label: I'll edit the file
    description: I'll fill in the answers in the file directly
  - label: Chat
    description: Discuss freely — I'll extract decisions from our conversation
```

Estimate `[N]` as the total interaction budget from the depth guidance below (the actual primary questions are authored in Step 2, per the chosen mode). Primary and follow-up questions draw from the same budget. The `[N]` budget governs Guide me, file-edit, and Chat; Grill me does not consume `[N]` as a budget — it consumes depth as a materiality pruning threshold, with the §8 numeric ceiling crossing recorded via the standing justification line and the circuit breaker as the upper bound (see `grilling-protocol.md` §2). When the current stage's phase is Construction or Operation, append " (exceptional use in this phase)" to the Grill me description — questions in those phases are exceptional, not routine.

While `semi` or `full` Intent autonomy is in force, do NOT include Grill me among the offered options — grilling is a human-in-the-loop discipline whose every round waits on a person, and unattended question resolution runs through `amadeus-bolt decide-question` (§1) instead.

Log the user's mode choice to `<record>/audit/<host>-<clone>.jsonl` using the Question interaction log format.

### Depth-aware question generation

Stage files list **topic areas and example questions** — they are guidance, not a script. The agent determines what to actually ask based on three factors:

1. **Depth level** (from `amadeus-state.md` → `**Depth**`) — sets the expected question volume
2. **Project context** — what's already known from prior stages, codebase analysis, and the user's description
3. **Phase progression** — Questions naturally decrease as the lifecycle advances:
   - **Ideation**: Most questions. Business/strategic focus ("why?", "for whom?", "what market?")
   - **Inception**: Moderate questions. Design/architectural focus ("what requirements?", "which patterns?")
   - **Construction**: Minimal questions. By this point, decisions should be made. Questions are **exceptional, not routine** — only when the agent detects genuine gaps that prior stages didn't cover (e.g., a unit-specific edge case not addressed in Application Design). Not a full Q&A session.
   - **Operation**: Occasional targeted questions only where operational parameters weren't established earlier

| Depth | Total question budget | Guidance |
|-------|-------------------------|----------|
| Minimal | at most 4 per stage | Ask only what's essential to proceed. Skip questions where the answer can be reasonably inferred from context, prior stages, or codebase analysis. |
| Standard | at most 8 per stage | Cover the material decisions in the stage's topic areas without padding the set. |
| Comprehensive | at most 12 per stage | Cover material edge cases, compliance, scale, failure modes, and cross-cutting concerns without generating questions merely to reach the ceiling. |

**These are finite ceilings, not targets.** The agent MUST use judgment below the
ceiling:
- A vague Minimal request still gets at most 4 primary questions; combine related decisions and adopt a documented recommendation for reversible, low-risk details.
- A Comprehensive enterprise feature with crystal-clear requirements warrants fewer than 12 — don't pad with noise.
- Prior stage outputs reduce what needs asking. If requirements-analysis already captured NFR targets, construction stages shouldn't re-ask.
- Primary and follow-up questions share this single total budget. A follow-up is allowed only for material ambiguity, in at most one consolidated round per stage, and may use only the slots left after primary questions. If no slots remain, record the unresolved item for the existing approval boundary instead of asking again.
- Contradiction detection and resolution remains MANDATORY at all depth levels.

**How to apply**: When authoring the questions file in Step 2, use the stage file's topic areas and examples as a starting point. Generate the fewest context-appropriate primary questions needed for material decisions without exceeding the total ceiling; leave room for likely clarification only when the context warrants it, never as a quota.

**Step 2: Author the questions file according to the chosen mode.** The questions file is always the decision record and the Stop-hook human-wait signal, but WHETHER it is pre-authored depends on the mode:

- **Guide me / I'll edit the file** → pre-author the full question set now. Create the file in the appropriate `<record>/` directory with full `[Answer]:` tag format: include options A-E as appropriate for each question, EVERY question ends with `X. Other (please specify)` as the final option (no exceptions), and leave all `[Answer]:` tags blank. Use the depth-aware generation guidance above.
- **Chat** → create the file with only its header; write each `[Answer]:` as decisions are extracted from the conversation (Step 3c).
- **Grill me** → do NOT pre-author. Create the file with only its header; grilling appends each dynamically-formulated question (blank `[Answer]:`) immediately before presenting it (Step 3d / `grilling-protocol.md` §2). Grilling never works from a pre-authored list.

For multi-select questions (where user may choose more than one option), add "(select all that apply)" to the question text. The user writes multiple letters: `[Answer]: A, B, E`

**Step 3a: If "Guide me" (interactive mode):**
- Present questions as structured questions in batches (batching limits are harness-specific — see the question-rendering annex)
- For questions with 5+ options (single-select or multi-select): present ALL answer options, splitting across multiple structured questions if the harness's per-question option limit requires it (e.g., options A-D first, then options E+ in a follow-up). The user must see every option to make an informed choice. The file retains the full option set as the authoritative record.
- Every structured question offers an "Other" escape (built into the harness UI or rendered as an explicit option per the annex). In interactive mode, if the user selects "Other" for any question, treat it as a request to discuss that question further — engage in conversation, then ask for their final answer before continuing the batch. Explicitly tell the user this before the first batch: "Select 'Other' on any question to discuss it before answering."
- After each batch of answers, IMMEDIATELY write the answers back to the questions file (update each `[Answer]:` tag)
- Log each batch to `<record>/audit/<host>-<clone>.jsonl` using the Question interaction log format. Generate a fresh ISO timestamp for each batch entry.
  CRITICAL: Each batch entry requires its own `date -u` Bash call. Do NOT reuse the timestamp from the mode choice or prior batch.
- Continue until all questions are answered
- **Consolidated summary before generation**: After all questions have been answered, present a consolidated summary of all answers in a clear list and ask: "Does this all look correct before I generate the artifact?" Wait for user confirmation. If the user requests changes, update the relevant `[Answer]:` tags in the questions file and re-present the summary. Only proceed to artifact generation after the user confirms.

**Step 3b: If "I'll edit the file" (self-guided mode):**
- Tell the user: "Edit the file at `[file path]`. When you're done, send **done** or **ready** and I'll continue."
- WAIT for the user to send a completion signal (any message like "done", "ready", "finished", "continue", etc.)
- Do NOT read the file or proceed until the user sends a completion signal

**Step 3c: If "Chat" (freeform mode):**
- Engage in open-ended conversation about the stage's topic
- Ask questions naturally and let the user elaborate at their own pace
- Extract decisions and answers from the conversation as they emerge
- To end the conversation, tell the user: "When you're ready to proceed, say **done** and I'll summarize our decisions."
- After the conversation reaches natural resolution, write all extracted answers back to the questions file (update each `[Answer]:` tag with the decided value, timestamp, and `**Mode:** chat`)
- Present a summary of extracted decisions for the user to confirm before proceeding
- Best for: exploratory stages, brainstorming, when questions need discussion before answering

**Step 3d: If "Grill me" (grilling mode):**
- Follow `grilling-protocol.md` (same directory) — the single source for the grilling discipline (the design tree worked in rounds, the whole pruned frontier asked per round with recommended answers and rationale, depth consumed as the pruning threshold rather than a question budget, facts self-researched and only decisions asked, termination when the pruned frontier is empty or the user says `done`, the circuit breaker as the disclosed upper bound, confirmed agreement summary listing deferred nodes). Do not re-define the discipline here.
- Workflow-specific obligations on top of the protocol:
  - Append every dynamically generated question to the questions file with a blank `[Answer]:` tag **before presenting it** — one entry per question even when the round is presented at once, the same Stop-hook human-wait convention as the other modes.
  - Write each answer back to its own `[Answer]:` tag immediately after it is received. Do not present the next round before the write-back.
  - Append the deferred-node section (`grilling-protocol.md` §2.3) to the questions file, opened by `<!-- amadeus-grilling:deferred -->` on its own line — once per session, including when nothing was pruned. The heading follows the record's language; the marker is matched verbatim and is never translated.
  - Audit per question, existing contract only: `bun {{HARNESS_DIR}}/tools/amadeus-log.ts decision ...` before presenting, `bun {{HARNESS_DIR}}/tools/amadeus-log.ts answer ...` after the response — one `decision`/`answer` pair per question, with the same write-back, audit, and fresh-timestamp discipline as Step 3a. No new event types.
- After the agreement summary is explicitly confirmed, continue with Step 4 as usual — grilling replaces only the Step 3 dialogue; verification, contradiction analysis, artifact generation, §13, and the approval gate are unchanged.

Users can switch modes mid-stage. For example, start with "Guide Me" for the first few questions, then say "let me just chat about the rest."

**Step 4: Verify completeness** — Read the file and confirm ALL `[Answer]:` tags are filled in. If any are blank, present the unanswered questions as structured questions and write answers back. Do NOT proceed with partial answers.

The file is the authoritative record for all decision traceability and audit purposes.

### Answer analysis (MANDATORY)
After collecting answers, analyze ALL responses for:
- Vague answers: "mix of", "not sure", "depends", "probably"
- Contradictions between answers
- Missing details needed for the next step

An ambiguity is **material** only when its answer would substantially change an
artifact, an external contract, or data safety and choosing a default would be
irreversible or high risk. Reversible or low-risk uncertainty is not material:
adopt the recommended value and record the assumption in `memory.md`.

If material ambiguities remain, ask at most one consolidated follow-up round for
the stage. Its items consume only the slots remaining in the active depth's
total question budget. When no slots remain, or after that round, do not
generate another question. Record any unresolved material ambiguity and carry
it to the existing approval boundary; never create a new gate or silently claim
it was resolved.

**Write every pending question into the questions file before you end the turn —
including follow-ups and chat-mode questions.** The questions file (with blank
`[Answer]:` tags for anything still open) is not just the audit record: the
forwarding-loop **Stop hook** reads it to tell a genuine human-wait (a question
you asked and are waiting on) apart from a stage you abandoned mid-work. If you
ask the user something but leave no blank `[Answer]:` tag in `<slug>-questions.md`,
the hook cannot see the question is pending and will nudge you to keep going
(and on a non-interactive run the loop is only bounded by the block cap). So:
add the open question to the file with a blank tag *before* you stop to wait,
in every mode (guided, self-guided, chat). This does not apply in autonomous
Construction, where the loop is meant to keep running without you.

### Error handling for invalid/missing answers
When processing user answers from question files:
- **Missing answers**: If any [Answer]: tag is still blank or contains only underscores, list the unanswered questions and ask the user to complete them before proceeding.
- **Invalid answers**: If an answer does not match any provided option (A-E, X) and is not a clear free-text response for "Other", ask the user to clarify which option they intended.
- **Ambiguous answers**: If an answer like "maybe B" or "either A or C" is given, resolve it within the stage's one material follow-up round and remaining total question budget. If that round is spent or no slots remain, record the ambiguity for the existing approval boundary instead of asking again.

### Contradiction detection (MANDATORY)
After all answers are collected, cross-check the full answer set for:
- **Scope mismatch**: e.g., user says "keep it simple" but also requests enterprise-grade features
- **Risk mismatch**: e.g., user says "security is not a concern" but describes handling sensitive data
- **Technology conflicts**: e.g., user requests offline-first but also requires real-time collaboration
- **Timeline vs. scope conflicts**: e.g., user wants MVP timeline but full-feature scope

When contradictions are detected:
1. Present the specific contradictory answers side by side
2. Explain why they conflict
3. Treat the contradiction as material ambiguity: ask within the same one
   consolidated follow-up round and only while the total question budget has a
   remaining slot
4. If it remains unresolved when the round or budget is exhausted, record it in
   the artifact and carry it to the existing approval boundary. Do not ask
   again, create a new gate, or claim the contradiction was resolved.

### Overconfidence prevention
- Research facts first; ask only when the remaining uncertainty is material and
  the total question budget has a slot.
- If an answer seems incomplete, use the single follow-up round rather than an
  open-ended probing loop.
- Red flags to evaluate for a budgeted material follow-up:
  - Single-word answers to open-ended questions
  - "Whatever you think is best" or "up to you" — ask what outcome they care about most
  - Contradictory signals between different answers
  - Answers that dodge the question or change the subject
- When a user defers to AI judgment, ask one targeted priority question only if
  it is material and budget remains; otherwise record the recommended reversible
  default or carry the unresolved high-risk decision to approval.

### Plan and question file location
Plan files and question files are co-located with their stage artifacts, not in a centralized `plans/` directory. For example, user story plan questions live at `<record>/inception/user-stories/user-stories-questions.md` alongside the user story artifacts. This co-location improves discoverability — all inputs, questions, and outputs for a stage are found in the same directory.

### Within-Bolt Question Collection (Construction)

Construction runs **Bolt by Bolt** (see SKILL.md §CONSTRUCTION Flow for orchestrator behaviour). Within each Bolt, questions across the Bolt's Units are collected upfront before any artifacts or code are produced. This keeps the human's interactive work concentrated at the start of each Bolt.

When the orchestrator runs a Bolt in phased mode:

1. **Questions**: For each applicable design stage (3.1–3.4), for each Unit in the Bolt (in build order), execute the stage file in QUESTION-ONLY mode. Questions are grouped by stage — all functional design questions for the Bolt's Units together, then all NFR questions, etc.
2. **Within each stage group**, questions are labeled by Unit name so cross-Unit concerns in the Bolt are visible together.
3. **The standard question protocol** (interaction mode choice, answer collection, ambiguity analysis) applies once per stage group within the Bolt, not per Unit.
4. **A single Bolt-level answers gate** confirms the Bolt's answers across all stages before design artifacts begin.
5. **Design artifacts**: Stage files execute in ARTIFACT-ONLY mode — reading the approved answers and generating artifacts. No human interaction during generation.
6. **Code generation (3.5)**: Per-Unit Task delegation to the amadeus-developer-agent. The stage file's per-Unit approval gate is **suppressed by the orchestrator** — a single Bolt-level gate (or batch-level gate for parallel batches) replaces it.
7. **Bolt gate**: Every gate follows `none/semi/full`, including the Walking Skeleton. Quality failure enters repair rather than approval; nonproductive repair parks with a typed reason. See SKILL.md §CONSTRUCTION Flow for the Intent autonomy and halt/repair details.

**Engine-driven per-unit iteration.** The orchestration engine now drives the per-Unit loop for the inline per-Unit design stages (functional-design, nfr-requirements, nfr-design, infrastructure-design) the same way it always has for code-generation: on a `next` that lands on an in-flight per-Unit stage (off the swarm path), the engine emits ONE `run-stage` directive per Unit, in Bolt build order, carrying the resolved Unit name in `directive.unit` and its artifact paths. `directive.produces` contains every output candidate; `directive.optional_produces` identifies the subset to write only when the matching `CONDITIONAL` stage instruction applies. The per-Unit ARTIFACTS on disk are the coverage ledger (a Unit is done for a stage once all required frontmatter `produces` exist under `construction/<unit>/<stage>/`; `optional_produces` may be absent); the engine substitutes the next uncovered Unit on each `next`. The stage's per-Unit gate is **suppressed** (`gate: false`) on every not-yet-covered Unit, and the stage's real gate is presented exactly once, on the re-entry after the LAST Unit's artifacts land on disk, so a single stage-level approval covers all Units and cannot be reached until every Unit is built (the same "per-Unit gate suppressed, single gate replaces it" rule point 6 already states for code-generation, now applied across all five per-Unit stages, and enforced deterministically: `report --result approved` on a not-yet-completed per-Unit stage is refused while any Unit is uncovered). A scope with no compiled Unit list degrades to one single-iteration directive (unchanged behaviour).

Each construction stage file (3.1–3.4) documents its execution modes (QUESTION-ONLY, ARTIFACT-ONLY, Full) and the step split points. See the individual stage files for details.

---

## 4. State Tracking

After completing a stage:
1. Advance state atomically via CLI tool (see "Silent bookkeeping writes" below):
   `bun {{HARNESS_DIR}}/tools/amadeus-state.ts advance "<completed-slug>" "<next-slug>"`
   This marks `[x]`, updates Active Agent, increments Completed, updates all status fields.
2. Hooks handle audit logging for file writes automatically

### MANDATORY: Task transitions before every stage
Before beginning ANY stage, transition stage-level tasks:

1. If there is a previous stage task that is `in_progress`, mark it completed:
   TaskUpdate({ taskId: "[previous stage task ID]", status: "completed" })

2. Activate the current stage task:
   TaskUpdate({ taskId: "[current stage task ID]", status: "in_progress", activeForm: "Running [Stage Name] [slug]" })

Rules:
- The `[slug]` suffix in `activeForm` is required. A PostToolUse hook parses it to automatically sync the state file (Lifecycle Phase, Current Stage, Active Agent, checkbox `[-]`).
- The task MUST be `in_progress` for the activeForm spinner to display — `pending` tasks show nothing.
- Update BEFORE reading the stage file or doing any stage work.
- This applies to all 32 stages. No exceptions.
- If task IDs are not in context (e.g., after compaction), use `TaskList` to find by subject.
- For skipped stages, mark completed with skip note: TaskUpdate({ taskId: [ID], status: "completed", description: "[original] — Skipped: [reason]" })

### MANDATORY: Conversation event logging checklist
The PostToolUse hook auto-logs file writes as `ARTIFACT_CREATED` / `ARTIFACT_UPDATED`. Conversation events (questions, approvals, user responses) are NOT hook-logged and MUST be recorded via the thin `amadeus-log` / `amadeus-state` tools. Those tools own audit emission — do NOT call `amadeus-audit.ts append` by hand for these events.

At each approval gate — see §2 Part 0 for the full flow. Summary:
1. BEFORE presenting the approval question: optionally `bun {{HARNESS_DIR}}/tools/amadeus-state.ts gate-start <slug>` (emits `STAGE_AWAITING_APPROVAL` and makes status truthful while the prompt is open).
2. AFTER user response: `bun {{HARNESS_DIR}}/tools/amadeus-orchestrate.ts report --stage <slug> --result approved --user-input "<choice>"` or `bun {{HARNESS_DIR}}/tools/amadeus-state.ts reject <slug> --feedback "<text>"`. `report` emits any missing gate row, then `GATE_APPROVED` + `STAGE_COMPLETED`, and auto-advances to the next in-scope stage (or completes the workflow if this was the final stage). `reject` likewise emits any missing gate row, then `GATE_REJECTED` + `STAGE_REVISING`, and leaves the stage in `[R]`.

At each question interaction:
1. BEFORE presenting the question: `bun {{HARNESS_DIR}}/tools/amadeus-log.ts decision --stage <slug> --decision "<summary>" --options "<A,B,C>"` (emits `DECISION_RECORDED`).
2. AFTER response: `bun {{HARNESS_DIR}}/tools/amadeus-log.ts answer --stage <slug> --details "<summary of answers>"` (emits `QUESTION_ANSWERED`).

The engine's `select-intent` directive is outside this stage interaction
contract: it occurs before an active intent or stage can be resolved. Do not call
`amadeus-log.ts` for its question or answer. Follow the harness's
`select-intent` directive arm, which passes only the engine-issued opaque token
and the untouched human response to `intent-select-response`.

### Stage progress notation
- `[ ]` — Not started
- `[-]` — In progress (current stage, not yet approved)
- `[x]` — Completed (approved by user)
- `[S]` — Skipped via `--stage` or `--phase` jump (not executed, excluded from progress counts)

**Enforcement:** State file updates happen automatically via the PostToolUse hook when `TaskUpdate` sets a stage task to `in_progress` with a `[slug]` suffix in `activeForm`. At stage END, `bun {{HARNESS_DIR}}/tools/amadeus-orchestrate.ts report --stage <slug> --result approved` marks the completed stage `[x]`, auto-advances to the next in-scope stage, and handles completion bookkeeping. Do not skip the intermediate `[-]` state by going directly from `[ ]` to `[x]`.

**`[S]` behavior:**
- Set by the Stage/Phase Jump handler (`amadeus-jump.ts execute`) for all in-scope stages before the jump target
- Excluded from statusline progress counts (not counted in total or done)
- Not modified by normal stage advancement (`amadeus-state.ts advance` only changes the completed and next stages)
- On resume, treated as completed for task tracking (task created and immediately marked completed)
- Never set during normal workflow execution — only by explicit `--stage`/`--phase` jumps

### Silent bookkeeping writes

State and audit updates use the CLI tools in `{{HARNESS_DIR}}/tools/`. These tools handle atomic read-modify-write, timestamp generation, and audit formatting internally. Do NOT use Edit or Write for these updates — those tools show diffs that create visual noise.

**CWD drift warning**: If a stage runs `cd` in Bash (e.g., `cd todo-app/server && npm install`), subsequent `bun {{HARNESS_DIR}}/tools/...` calls using relative paths will fail with "Module not found". Always use absolute paths to the tools directory for tool calls (on Claude Code, `$CLAUDE_PROJECT_DIR/.claude/tools/`), or run `cd` commands in subshells: `(cd subdir && npm install)`.

**Checkpoint updates** (amadeus-state.md):
```bash
# Stage-start state sync is automatic — the PostToolUse hook on TaskUpdate
# parses [slug] from activeForm and calls set-status internally.
# No manual state update needed at stage start.

# Mark stage complete
bun {{HARNESS_DIR}}/tools/amadeus-state.ts checkbox "SLUG=completed"
```

**Field updates** (amadeus-state.md) — the tool writes fields in `- **Field Name**: value` format:
```bash
bun {{HARNESS_DIR}}/tools/amadeus-state.ts set "Current Stage=STAGE_NAME" "Lifecycle Phase=PHASE" "Status=In Progress" "Last Updated=NOW" "Active Agent=AGENT_NAME" "In Progress=STAGE_NAME"
```
Special values: `NOW` auto-generates ISO timestamp, `+1`/`-1` increment/decrement numeric fields.

Fields managed by the tools (matching state template format `- **Field**: value`):
- **Current Stage**: current stage slug
- **Lifecycle Phase**: UPPERCASE phase name
- **Status**: In Progress / Completed / Paused
- **Last Updated**: ISO timestamp
- **Active Agent**: lead agent name from Stage Graph
- **In Progress**: current stage slug
- **Completed**: all state-writing paths (`checkbox`, `advance`, `finalize`, workflow completion, approval, stage jump, scope change, recompose, initialization, and state re-sync) auto-sync this through the shared derived-plan writer; it counts only `[x]` stages whose effective plan action is `EXECUTE` (`SKIP`-effective historical completions do not count)

**Stage advancement** (the most common operation — replaces all sed + cat for normal stage transitions):
```bash
bun {{HARNESS_DIR}}/tools/amadeus-state.ts advance "completed-slug" "next-slug"
```
Atomically: marks completed `[x]`, increments Completed count, updates completion fields (Last Completed Stage, Next Stage, Last Updated). Also sets up the next stage (`[-]`, Current Stage, Lifecycle Phase, Active Agent) as part of the atomic transition — the PostToolUse hook reinforces these fields when the next TaskUpdate fires.

**Stage finalize** (complete-and-pause — used by jump handler when stopping after target stage):
```bash
bun {{HARNESS_DIR}}/tools/amadeus-state.ts finalize "completed-slug"
```
Like `advance` but does NOT mark next stage `[-]` or set `In Progress`. Marks completed `[x]`, syncs Completed counter, updates Current Stage to next, sets Last Completed Stage, Last Updated, Active Agent, Next Action. If there is no next stage, it delegates to `complete-workflow` — Status=Completed, In Progress=none, Next Stage=none, while Current Stage stays on the final stage slug so the record keeps where the workflow ended.

**Workflow complete** (final stage done — no next stage exists):
```bash
bun {{HARNESS_DIR}}/tools/amadeus-state.ts complete-workflow "completed-slug"
```
Atomically: marks `[x]`, sets Status=Completed, updates Last Updated, sets Last Completed Stage, clears In Progress, sets Next Stage=none, sets Next Action=Workflow complete, AND emits `PHASE_COMPLETED` + `PHASE_VERIFIED` + `WORKFLOW_COMPLETED` to the audit. No separate `amadeus-audit.ts append` needed.

**Event emission is tool-owned.** State transitions (`advance`, `approve`, `reject`, `skip`, `complete-workflow`, etc.) emit the correct audit events internally. Config changes (`scope-change`, `config-change`, `detect-scope`) likewise. Construction bolts use `amadeus-bolt.ts`. Questions and decisions use `amadeus-log.ts`. The `amadeus-audit.ts append` CLI is still available but should not be used by the orchestrator for canonical state transitions — direct use of that CLI is reserved for hooks and for edge cases (e.g., logging an `ERROR_LOGGED` event where no specific tool owns it yet).

**Stage graph lookups** (no state file needed):
```bash
bun {{HARNESS_DIR}}/tools/amadeus-state.ts lookup phase-of SLUG          # → phase name
bun {{HARNESS_DIR}}/tools/amadeus-state.ts lookup next-stage SLUG SCOPE   # → next in-scope slug
bun {{HARNESS_DIR}}/tools/amadeus-state.ts lookup agent-for SLUG          # → lead agent name
bun {{HARNESS_DIR}}/tools/amadeus-state.ts lookup validate-stage SLUG     # → JSON with slug, phase, number, valid
```

### MANDATORY: Plan-Level Checkbox Enforcement
NEVER complete any work without updating plan checkboxes. Update IMMEDIATELY after completing each step. Two-level tracking:
- **Plan-level checkboxes**: Track individual work items within a stage (e.g., each user story, each component design)
- **amadeus-state.md stage checkboxes**: Track stage-level completion

Both levels MUST stay in sync. NO EXCEPTIONS. If a step is done, its checkbox is checked. If a checkbox is checked, the step MUST be done.

### Generating ISO timestamps
CLI tools (`amadeus-state.ts`, `amadeus-audit.ts`, `amadeus-jump.ts`) auto-generate fresh ISO timestamps for each call. You do NOT need to run `date -u` separately for tool-based operations.

For manual audit entries (rare — conversation event logging via `cat >>`), generate timestamps via:
```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```
NEVER use date-only format (e.g. `2026-02-17`). Always include the time component and Z suffix.

### Audit log format for conversation events:
```markdown
## [Stage Name]
**Timestamp**: [YYYY-MM-DDTHH:MM:SSZ — e.g. 2026-02-17T14:30:00Z]
**User Input**: "[Complete raw input — never summarize]"
**AI Response**: "[Action taken]"
**Context**: [Stage, decision made]

---
```

### Specialized audit log formats

Use these templates for non-standard events. Each provides structured fields for post-hoc analysis.

#### Error log format
```markdown
## Error: [Brief Description]
**Timestamp**: [ISO timestamp from Bash]
**Severity**: [Critical/High/Medium/Low]
**Type**: [Parse error/Missing artifact/State corruption/Validation failure]
**Description**: [What went wrong]
**Cause**: [Root cause or best assessment]
**Resolution**: [Action taken to resolve]
**Impact**: [Artifacts affected, stages delayed, data lost]

---
```

#### Recovery log format
```markdown
## Recovery: [Brief Description]
**Timestamp**: [ISO timestamp from Bash]
**Issue**: [What triggered recovery — corrupted state, missing artifacts, etc.]
**Recovery Steps**: [Numbered list of actions taken]
**Outcome**: [Successful/Partial/Failed — and current state after recovery]
**Artifacts Affected**: [List of files created, restored, or rebuilt]

---
```

#### Change Request log format
```markdown
## Change Request: [Brief Description]
**Timestamp**: [ISO timestamp from Bash]
**Request**: [User's exact change request — complete raw input]
**Current State**: [Which stage, what exists, what would change]
**Impact Assessment**: [Stages affected, artifacts to regenerate, scope change]
**User Confirmation**: [User's approval response]
**Action Taken**: [What was done — re-run stage, modify artifact, etc.]
**Artifacts Affected**: [List of files changed]

---
```

#### Question interaction log format
```markdown
## Questions: [Stage Name] — [Mode choice / Batch N of M]
**Timestamp**: [ISO timestamp from Bash]
**User Input**: "[Exact user selection — option label(s) as displayed in the structured question]"
**AI Response**: "[Wrote answer [X] to questions file / Presented next batch / Proceeded to analysis]"
**Context**: [Stage name, question file path, question numbers covered]

---
```

### Audit log rules
- ALWAYS append to this clone's audit shard `<record>/audit/<host>-<clone>.jsonl` — NEVER overwrite or truncate existing content.
- CRITICAL: The "User Input" field in audit entries MUST contain the user's COMPLETE, UNMODIFIED input. NEVER summarize, paraphrase, or truncate user responses. This is a compliance and traceability requirement — the exact wording may carry nuance that summaries lose.
- Log all approval prompts BEFORE showing them to the user. This ensures the audit trail captures what was presented, not just what was answered.
- Log all user responses with ISO timestamps immediately after receiving them.
- If this clone's audit shard does not exist, the audit tool creates it as an empty JSONL file (no header line) on first append.
- If this clone's audit shard appears corrupted (a line that is not a JSON record), create a backup (`<record>/audit/<host>-<clone>.jsonl.bak`) and start a new shard noting the corruption.
- `ERROR_LOGGED` and `RECOVERY_COMPLETED` are declared in the taxonomy but reserved for the recovery workflow (not yet implemented). Do not hand-write them via `amadeus-audit.ts append` — the recovery flow will ship its own emitter. Canonical state transitions go through the state/log/bolt tools (see §4 "Silent bookkeeping writes").

---

## 5. Agent Persona Loading

Each stage specifies its lead and supporting agents. To load a persona:

### Knowledge loading order (for all stage types):
1. `{{HARNESS_DIR}}/rules/` — organization and project guardrails (always)
2. `{{HARNESS_DIR}}/knowledge/amadeus-shared/` — shared methodology principles
3. `{{HARNESS_DIR}}/knowledge/[agent-name]/` — agent-specific methodology
4. `amadeus/knowledge/amadeus-shared/` — team shared knowledge (if exists)
5. `amadeus/knowledge/[agent-name]/` — team agent-specific knowledge (if exists)
6. Prior stage artifacts as required by the current stage

### For inline stages:
1. Read the lead agent's flat file (e.g., `agents/amadeus-architect-agent.md`) for role framing
2. Load knowledge per the order above
3. Apply the agent's perspective when executing the stage

### For subagent stages:
1. Call `Task` with the `subagent_type` named in the stage metadata — the named agent's persona and knowledge load automatically. Do NOT inject the persona text into the prompt.
2. Pass relevant prior artifacts and workspace state as context in the prompt (subagents cannot see the conversation history).

### Multi-agent stages:
Some stages use multiple agents (e.g., Feasibility uses amadeus-architect-agent + amadeus-aws-platform-agent + amadeus-compliance-agent). Every multi-agent stage in the shipped graph is `mode: inline`, so the support agents are perspectives the orchestrator adopts in its own context — load each support agent's file + knowledge the same way you loaded the lead (see "For inline stages" above), produce the lead's output first, then layer in each support perspective, then synthesise. Do NOT call `Task` for a support agent on an inline stage; `Task` is reserved for `mode: subagent` stages. Agents do NOT invoke each other — only the orchestrator delegates.

### 11 Agents (v2):
amadeus-product-agent, amadeus-design-agent, amadeus-delivery-agent, amadeus-architect-agent, amadeus-aws-platform-agent, amadeus-compliance-agent, amadeus-devsecops-agent, amadeus-developer-agent, amadeus-quality-agent, amadeus-pipeline-deploy-agent, amadeus-operations-agent

---

## 6. Error Recovery

> See `stage-protocol-recovery.md` §6 / §7 — load on session resume or when a change event is detected mid-stage.

---

## 8. Depth Guidance

See [Depth Control Architecture](../../../../../docs/reference/25-depth-control-architecture.md) for how this contract fits into the full L0–L5 control-point map and its blocking-conversion governance.

Create exactly the detail needed — no more, no less. Depth adapts to scope and problem complexity:

### Scope-to-depth mapping
| Scope | Default Depth | Typical Stages |
|-------|--------------|----------------|
| enterprise | Comprehensive | All 32 |
| feature | Standard | All 32 |
| mvp | Standard | ~25 (skip late Operation) |
| poc | Minimal | ~8 (Ideation + core Inception) |
| fix | Minimal | 7 (targeted) |
| chore | Minimal | ~5 (tweak-sized: init + code-gen + build) |
| refactor | Minimal | ~9 (targeted) |
| infra | Standard | ~13 (infra-focused) |
| security-patch | Minimal | ~10 (security-focused) |

### Depth levels

- **Minimal** (poc, fix, chore, refactor, security-patch): at most 4 primary questions per stage, minimal artifacts, brief analysis
- **Standard** (feature, mvp, infra): at most 8 primary questions per stage, full artifacts at moderate detail
- **Comprehensive** (enterprise): at most 12 primary questions per stage, comprehensive artifacts with deep analysis, all stages execute

Depth is resolved by the engine — the scope's default, recorded in `amadeus-state.md` → `**Depth**` at intent birth — and delivered to every stage on the run-stage directive's `depth` field. Stage agents read `directive.depth` (falling back to `amadeus-state.md` → `**Depth**` when running outside the engine loop); they never re-derive depth from complexity. Users can override at three points:
1. Via the `--depth` flag: `/amadeus --scope fix --depth comprehensive` or `/amadeus --depth minimal`
2. At scope confirmation — choose "Change depth"
3. At any approval gate — request a different depth level

### Depth-Level Contract

The numeric ceilings below are **contract, not illustration**. A stage running at a
given depth MUST hold to its row; exceeding a ceiling requires a recorded
justification at the stage's approval gate. Only counted quantities live here —
every qualitative shape belongs to the guidance subsection that follows, so no
line in this table is unenforceable.

| Depth | Primary questions per stage | Requirements Analysis: functional requirements |
|-------|-----------------------------|------------------------------------------------|
| Minimal | at most 4 | 5-10 |
| Standard | at most 8 | 15-30 |
| Comprehensive | at most 12 | 30+ |

Stages that scale artifact volume by depth MUST read `directive.depth` and state what changes at each level:
Requirements Analysis, Application Design, Functional Design, NFR Requirements, NFR Design, Code Generation, Build and Test.
The `depth-budget` sensor measures the Requirements Analysis row against the produced
`requirements.md` and reports overruns as advisory findings; the question ceiling
is enforced by the stage agent at question-drafting time (§3). NFR Requirements
and NFR Design volume is measured separately by the advisory `nfr-budget` sensor
— neither stage gets a numeric row in the Depth-Level Contract table above, which
holds only counted quantities common to every scope.

**Grill me mode consumes depth as a pruning threshold, not as a question
budget** (`grilling-protocol.md` §2.2). Its sessions terminate on frontier
coverage, so the question total is an emergent value and may exceed the row
above. When it does, the recorded justification required by this contract takes
a standing machine-readable form: grilling appends the fixed justification line
(`grilling-protocol.md` §2.5) to the questions file at the crossing, recording
the depth, the total, and `frontier-driven` as the reason. Alongside it the same
file carries the deferred-node section carrying the
`<!-- amadeus-grilling:deferred -->` marker (`grilling-protocol.md` §2.3), so
the overrun is readable next to the pruning it was traded against. The circuit breaker
(three times the row's ceiling — Minimal 12 / Standard 24 / Comprehensive 36)
is the disclosed upper bound on that overrun. The ceilings above are unchanged
and continue to bind every other interaction mode.

### Depth-Level Guidance

The rest of each level is guidance — shape rather than ceiling. Follow it unless
the problem demands otherwise, and say so at the gate when it does. No sensor
measures these lines.

**Minimal project** (e.g., fix, single-page internal tool):
- Questions: essentials only, skip what's inferable from code/context
- Requirements Analysis: brief descriptions, minimal NFR coverage
- Application Design: Single component diagram, basic data model, no ADRs needed
- Functional Design: Brief business rules, simple domain entities, skip frontend-components.md

**Standard project** (e.g., multi-page web application):
- Questions: cover material topic areas
- Requirements Analysis: acceptance criteria per requirement, moderate NFR coverage
- Application Design: Component diagrams with interactions, data model with relationships, 2-3 ADRs
- Functional Design: Detailed business logic models, comprehensive business rules, domain entity lifecycle

**Comprehensive project** (e.g., distributed system with integrations):
- Questions: cover material risk and contract decisions
- Requirements Analysis: detailed acceptance criteria, comprehensive NFR coverage across all categories
- Application Design: Multi-layer component diagrams, detailed data flow, integration sequence diagrams, 5+ ADRs with alternatives analysis
- Functional Design: Decision trees, state machines, concurrency handling, error recovery flows, cross-unit interaction patterns

### Test Strategy

Test volume scales with the active test strategy. The test strategy defaults to the current depth level unless the scope declares its own default (e.g., workshop defaults to Minimal). It can be overridden independently via `--test-strategy`. This allows combinations like Standard depth (full artifacts) with Minimal testing (workshop/training scenarios).

**Minimal — Nyquist model** (inspired by GSD's Nyquist validation layer):

Just as the Nyquist rate is the minimum sampling frequency to reconstruct a signal, Minimal test strategy generates the minimum tests needed to verify every requirement — no more, no less.
- 1 verifiable test per identified requirement (requirement-driven, not component-driven)
- Happy-path floor: every component gets at least 1 happy-path unit test regardless of requirement mapping
- Unit tests ONLY — skip integration, E2E, performance, security
- Soft guideline — LLM can exceed when safety-critical context demands it (e.g., security-critical fix)

**Standard — requirement and risk model:**
- Select tests from requirements, changed behavior, boundary risk, and regression history; use 8 tests per component only as a planning ceiling, not a quota or coverage substitute
- Unit tests + integration tests (key boundaries)
- E2E, performance, security tests skipped unless NFR requirements exist
- When unit, integration, and E2E layers all apply, 75/20/5 is default guidance
  within that three-layer subset only. Requirements, risk, and NFR evidence take
  precedence; never create a layer merely to satisfy the ratio.
- Soft guideline

**Comprehensive — requirement and risk model:**
- Select tests from requirements, changed behavior, boundary risk, and NFR evidence; use 15 tests per component only as a planning ceiling, not a quota or coverage substitute
- All test types: unit + integration + E2E + performance (if NFRs) + security (if NFRs)
- The same conditional three-layer pyramid guidance applies; performance,
  security, and other NFR-driven tests sit outside that ratio.
- Soft guideline

**Override syntax:**
```
/amadeus --test-strategy minimal                          Minimal testing for active workflow
/amadeus --depth standard --test-strategy minimal         Full artifacts, minimal tests
/amadeus --scope fix --test-strategy comprehensive     Bugfix with thorough testing
```

---

## 9. Terminology

Key terms used throughout AI-DLC documentation:

<!-- glossary:projection:begin protocol -->
| Term | Definition |
|------|-----------|
| **AIDLC** | AI-Driven Development Life Cycle — the methodology this system implements. See **Lifecycle**. |
| **Bolt** | The unit of Construction execution: one pass through stages 3.1–3.5 for a Unit (or small group of dependency-linked Units). Stages 3.6 (Build and Test) and 3.7 (CI Pipeline) run once after all Bolts complete, not per-Bolt. The first Bolt in Construction is the walking skeleton. See also: [parallel batch], [walking skeleton], [autonomy mode]. Note: this deviates intentionally from AI-DLC v1, where a Bolt is a sprint-like time-box (a Unit of Work spans multiple Bolts). This implementation repurposes "Bolt" to mean a deployable slice that wraps one or more Units of Work. |
| **Artifact** | A versioned markdown document produced by a stage and stored in the intent's record dir (`amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`). Examples: `requirements.md`, `code-summary.md`, `initiative-brief.md`. |
| **Component** | A logical building block within a module (class, function group, UI component). |
| **Control loop** | The feedforward/feedback pairing of **Rules** (standing decisions applied before work) and **Sensors** (deterministic checks fired on outputs) that steers and verifies a stage. (Distinct from a **Harness**, the CLI distribution sense.) |
| **Core** | The hand-authored, harness-neutral source of truth at `packages/framework/core/` — the engine, stages, agents, rules, scopes, sensors, knowledge, hooks, and session skills. Every harness distribution is generated from it; you edit here, never in `dist/`. |
| **Depth** | One of three detail levels (Minimal, Standard, Comprehensive) that controls how much detail each stage produces. Scopes have default depths; you can override at any approval gate. See [Scopes, Depth, and Test Strategy](docs/guide/05-scopes-and-depth.md). |
| **Generation** | Stages that produce executable code (Code Generation, Build and Test). Contrast **Planning**. |
| **Guardrail** | The body sections inside a Rule file in the space memory layer (`amadeus/spaces/<space>/memory/`) — `## Forbidden`, `## Mandated`, and the phase-rule guardrail headings — that express prescriptive behavioural constraints. The container is a Rule; "guardrail" names the prescriptive content within it. See **Rule**. |
| **Harness** | A CLI distribution of the AI-DLC core — one capable command-line agent that the harness-neutral **Core** is rendered onto. The set is open and growable (today: Claude Code, Codex CLI, Cursor, Kimi Code, Kiro CLI, Kiro IDE, OpenCode). *Note — "harness" carries four senses in this repo, by context:* (1) **this canonical CLI-distribution sense**; (2) the rule+sensor **control loop** (older usage, now renamed — see **Control loop**); (3) the `packages/framework/harness/<name>/` source-surface directory; (4) the `tests/harness/` test-helper directory. Only sense 1 is "a harness" in user docs. |
| **Ladder prompt (legacy)** | The retired post-walking-skeleton `autonomous|gated` choice. New work selects Intent autonomy as `none|semi|full`; legacy records are diagnostic only. |
| **Lifecycle** | The AI-DLC methodology as a whole: the AI-Driven Development Life Cycle. A single execution of the methodology is a workflow. |
| **Module** | A code-level organizational boundary within a service (package, namespace). |
| **Parallel batch** | A group of Bolts whose dependencies are satisfied and that don't depend on each other, run concurrently by the orchestrator. A single approval gate at the end of the batch covers every Bolt in it. |
| **Phase** | One of the 5 major divisions of the lifecycle: Initialization (0), Ideation (1), Inception (2), Construction (3), Operation (4). Each phase contains 3-8 stages (Initialization 3, Ideation 7, Inception 8, Construction 7, Operation 7). |
| **Planning** | Stages that analyze, question, and design, producing markdown artifacts. Contrast **Generation**. |
| **Rule** | A persistent behavioural rule authored once in the space memory layer (`amadeus/spaces/<space>/memory/`) at the workspace root and pulled into context by each harness's native include (Claude `@`-import stub, Kiro resources glob, Codex `AMADEUS_RULES_DIR`), applied to every stage it covers. Rules resolve through a strict-additive five-layer chain — org → team → project → phase → stage — where every applicable rule appears in context; broader layers are never overridden, only added to. Rules are the feedforward half of the **control loop** and may pair with a Sensor for deterministic verification. See [Rules and the Learning Loop](docs/guide/09-rules-and-the-learning-loop.md). |
| **Scope** | A named configuration that determines which stages execute and at what depth, one file per scope under `{{HARNESS_DIR}}/scopes/amadeus-<name>.md`: enterprise, feature, mvp, poc, fix, chore, refactor, infra, security-patch, workshop. Custom scopes can be added without editing the framework, and a scope can also be auto-detected from a freeform intent. |
| **Sensor** | A deterministic verification check defined by a manifest in `{{HARNESS_DIR}}/sensors/` (e.g., `amadeus-linter.md`, `amadeus-type-check.md`). Sensors fire on Write/Edit to a stage's outputs via the PostToolUse hook and record advisory `SENSOR_*` audit rows — they never block your workflow. A stage declares which Sensors fire via its `sensors:` frontmatter list. Sensors are the feedback half of the **control loop**; Rules are the feedforward half. See [Rules and the Learning Loop](docs/guide/09-rules-and-the-learning-loop.md). |
| **Service** | A deployable process or container (API server, worker, frontend app). |
| **Stage** | One of the 32 discrete steps in the lifecycle. Each stage has a lead agent, defined inputs/outputs, and follows the stage protocol. Stages are numbered by phase (e.g., 1.1, 2.4, 3.5). |
| **Unit of work** | An independently implementable piece of the solution, decomposed during stage 2.7 (Units Generation). One or more Units are bundled into a Bolt for Construction. |
| **Walking skeleton** | The first Bolt in Construction — the thinnest end-to-end slice that exercises every integration point. Its ceremony fires only where the Skeleton Stance resolves `on` (greenfield scopes); where the stance is `off` the first Construction stage carries an ordinary gate instead. When it does fire, the gate follows the Intent autonomy table: `full` may decide it within the confirmed grant; `none` and `semi` wait for a human. |
<!-- glossary:projection:end -->

---

## 10. Content Validation

### Mermaid diagram validation
Before writing any Mermaid diagram to a file:
1. Verify syntax is valid (balanced braces, valid node/edge declarations, no unescaped special characters)
2. Ensure all referenced nodes are declared
3. Include a text-based fallback description below the diagram block for accessibility and in case rendering fails:
```markdown
<!-- Text fallback: [plain-text description of the diagram] -->
```

### Pre-creation checklist
Before creating any artifact file, validate:
- All entities referenced in the artifact (components, stories, APIs, data models) exist in prior artifacts
- No naming conflicts with existing artifacts (e.g., two components with the same name)
- File path matches the expected convention for the stage

### Template overrides
Before writing artifact `X` (keyed by the output filename stem — artifact `X` writes to `X.md`), resolve its template in this order, override-before-default, first hit wins:
1. **team template** — `amadeus/spaces/<space>/memory/templates/X.md` (the active space's hand-authored override);
2. **framework default** — the engine-shipped default `X.md` *if one ships* (none ship at GA, so this normally misses);
3. **else** — no template: follow the stage's existing prose.

If a template resolves (tier 1 or 2), follow its structure: use its `##` headings as the skeleton to fill. A resolved template is used whole-doc (verbatim structure, no section merge). The `required-sections` sensor verifies the output against the SAME resolution order and the SAME file, so the produced shape and the checked shape cannot drift.

### ASCII Diagram Standards

When creating text-based diagrams (outside of Mermaid blocks), use only basic ASCII characters:

**Allowed characters:** `+` `-` `|` `^` `v` `<` `>` `/` `\` and alphanumeric characters + spaces.

**Prohibited:** Unicode box-drawing characters (U+2500 through U+257F). These render inconsistently across terminals, editors, and markdown viewers.

**Character-width rule:** Every line within a box must have the same character count. Pad with spaces to ensure alignment.

**Reference patterns:**

Simple box:
```
+------------------+
| Component Name   |
+------------------+
```

Nested boxes:
```
+---------------------------+
| Outer                     |
|  +-----+  +-----+        |
|  | A   |  | B   |        |
|  +-----+  +-----+        |
+---------------------------+
```

Directional arrows:
```
[Source] -----> [Target]
[Source] <----> [Target]
[Top]
  |
  v
[Bottom]
```

### Character escaping
When generating content that will be written to markdown files:
- Escape pipe characters (`|`) inside markdown table cells
- Escape angle brackets (`<`, `>`) that are not part of HTML tags
- Ensure code blocks use the correct fence syntax (triple backtick with language identifier)
- In Mermaid diagrams, wrap labels containing special characters in quotes

---

## 11. Subagent Return Summary

When a subagent completes its work, it MUST return a structured summary to the orchestrator. This ensures no context is lost between subagent execution and orchestrator continuation.

### Required return format:
```markdown
## Subagent Summary: [Stage Name]

### Produced
- [file path 1]: [brief description of content]
- [file path 2]: [brief description of content]

### Key Decisions
- [Decision 1]: [rationale]
- [Decision 2]: [rationale]

### Issues / Concerns
- [Any problems encountered, edge cases found, or risks identified]
- "None" if no issues

### Next Steps
- [What the orchestrator should do next based on this output]
```

### Rules:
- The orchestrator MUST read this summary before proceeding to the next stage
- Prefix each issue or concern with exactly `BLOCKER |`, `FOLLOW-UP |`, or `NIT |` using the closed severity contract in §12a
- Present `BLOCKER` entries immediately and halt the affected work for human direction; aggregate `FOLLOW-UP` entries in the normal completion message; omit `NIT` entries from user-facing status
- If the "Produced" section lists fewer files than expected for the stage, the orchestrator MUST investigate before marking the stage complete

### Context budget for subagent prompts
To prevent context overflow in subagent calls:
- **Current-unit only**: Pass only the design artifacts for the unit being implemented, not all units
- **Summarize inception artifacts**: For CONSTRUCTION subagents, provide a 1-2 line summary of each inception artifact with its file path, rather than embedding full content. The subagent can Read specific files if needed.
- **Always include**: amadeus-state.md and the specific task instructions. The agent persona and knowledge files load automatically via the named `subagent_type` — do NOT inject them into the prompt.

### Subagent failure recovery
If a Task tool call fails (timeout, error, or returns truncated/incomplete output):
1. **Retry once** with a reduced context prompt — summarize inception-phase artifacts instead of including full content, pass only the current unit's design artifacts
2. If the retry also fails, **inform the user** and offer two options via a structured question:
   - "Run inline" — execute the stage work directly in the orchestrator conversation (slower but avoids subagent issues)
   - "Skip and revisit" — mark the stage as incomplete and continue; return to it later
3. Log the failure and resolution in `<record>/audit/<host>-<clone>.jsonl` using the Error log format

---

## 11a. Directive Advisories

An `await-advisory-choice` directive is a **fail-closed checkpoint**. **Surface every entry**
in the `advisories` array, including each
`advisories[].message` verbatim,
then present exactly the directive's two
choices: `今すぐ実行する` and `リスクを承知して延期する`. Do not start the
stage body, dispatch a worker, or report the stage while this directive is
active. A general approval, delegated approval, Intent autonomy decision, or
uncorrelated human turn does not resolve it.

The canonical user-visible `question` is rendered by
`tools/amadeus-directive.ts#renderAdvisoryChoiceQuestion` from every advisory
message in array order. Present that `question` verbatim; do not substitute a
summary or reconstruct it in a harness adapter.

Immediately before presenting the question, record its protected presentation
through `amadeus-log.ts advisory-decision --stage <stage> --instances <csv>`.
The tool validates the exact open advisory identities and emits the existing
`DECISION_RECORDED` event with a digest of the canonical question. An ordinal or
label is accepted only from the next grounded `HUMAN_TURN` in the same audit
shard. Any intervening human turn expires the presentation. Pending advisory
state alone is never proof that this question was shown.

The engine persists one identity per pending advisory and accepts a choice only
from the trusted human-prompt hook after that protected presentation. Re-run
`next` after the human answers. A risk defer releases only that checkpoint.

An advisory whose declaration names a destination carries
`advisories[].handoff_stage`. A run-now answer on that advisory opens that stage
— run `/amadeus --stage <handoff_stage> --single`. Opening the stage
does **not** release the hold: the hold lifts only when the declaring plugin's
own evaluator returns no-hold on a later `next`. A directive without advisories
is unchanged.

### The settled hold: `execute-advisory-handoff`

Once an advisory carries a `run-now` receipt, the question is answered but the
hold stands. The engine stops asking: the next `next` emits
`execute-advisory-handoff` instead of `await-advisory-choice`. This holds for
both provenance kinds — a human's answer and an autonomy-ladder decision settle
the question identically — so an unattended run never stalls on a question it
has already answered.

The directive is **work, not a question**. Do not present it, and do not offer
the two choices again.

1. Run `/amadeus --stage <slug> --single` once for each slug in
   `handoff_stages`, in array order. That array is the deduplicated projection
   of the advisories' own `handoff_stage` values — the destinations their
   declarations name, and nothing else.
2. Re-run `next`. Do **not** call `report`.
3. If `handoff_stages` is **empty**, no advisory names a destination and there
   is nothing to open. Report the standing hold to the user from each
   `advisories[].message` and `advisories[].result`, and stop — re-running
   `next` would only re-emit this directive.

BR-U2-05 is unchanged throughout: opening a handoff stage is an entry point into
the work the advisory is holding for, never a release. The hold lifts only when
the declaring plugin's own evaluator returns no-hold.

## 11b. Error Directive Receipt

An `error` directive is the engine reporting a condition it has already ruled
on. The receipt clause is fixed here once, and every harness conductor surface
carries this sentence verbatim:

Print `directive.message` verbatim and STOP. Do not recover, retry, or smooth it over, and do not invent a new question or a new gate — the message is the user-facing error.

The last clause is the one most easily lost. The engine has already decided; the
receipt is to relay that decision, not to re-open it. Substituting a question of
the conductor's own devising — even a well-meant "how would you like to
proceed?" — replaces the engine's ruling with an invented gate, and the user
never sees the error that was actually raised. There is no autonomy mode in
which this is allowed: an Intent grant authorizes decisions the engine routes to
it, never decisions the conductor invents.

## 11c. Approval boundary for remote writes

A remote write changes a surface other people share: a push, opening a PR,
replying to or resolving a review thread, and filing an Issue. Stages defer
these to "the workspace's approval boundary"; the boundary is defined in
`docs/reference/24-intent-autonomy.md`, and this is how a stage reaches it.

Under `none`, ask the human. Under `semi` and `full`, do **not** put the remote
write to the human directly, and do not take it on the strength of the grant
either: put the occurrence through `amadeus-bolt decide-question` exactly as
for any other stage question, take `decided.effect.optionId` as the answer, and
send it to a person only when the result is `human-required` — which, in a
non-interactive session, means relaying the engine's waiting terminal rather
than asking. The ruling and its basis are recorded in the audit as
`AUTO_DECIDED`.

Routing through the ladder never widens a grant. A remote write the occurrence
classifies as one of the five effects a grant can never authorize returns
`human-required` rather than being decided. A merge is not on this route at all:
the merge question goes to a human on that specific PR, every time, and no
verdict, grant, or ruling authorizes it. Where the workspace's own norms carry a
standing merge delegation, the delegation is exercised by the human under those
norms and the engine's part is to RECORD it — `amadeus-merge-provenance record`
writes the evidence the delegation rested on. That recording is not an autonomy
mode arm, and no Intent mode makes a merge automatic.

## 11d. Waiting Directive Receipt

A `waiting` directive is the terminal a NON-INTERACTIVE run emits when it
reached a ruling it may not make. It is not an error and not a park: `parked`
says a human chose to stop and says nothing about why, while `waiting` names the
exact ruling that is outstanding and carries the identifiers (`occurrence_id`,
`basis_fingerprint`, `transaction_id`) of the Intent autonomy transaction
holding the full cause.

Print `directive.reason` verbatim, tell the user the run is waiting on their
ruling and that `/amadeus --resume` re-presents it, and STOP the loop.

Do not re-derive the ruling, do not answer it on the user's behalf, and do not
paraphrase the candidates: `--resume` re-presents the SAME candidates from the
recorded transaction, which is the whole point of recording them. Re-running
`next` without a ruling only re-emits this directive.

## 12. Phase Boundary Verification

> See `stage-protocol-governance.md` §13 — load at phase transitions to run traceability verification. Capturing corrections as durable rules is the §13 Learnings Ritual below, not a separate guardrail flow.

## 12a. Reviewer Invocation

If the `run-stage` directive includes a `reviewer` field (non-null), the orchestrator MUST invoke the reviewer as a **separate sub-agent** after the stage body produces its artifacts and before the §13 learnings ritual.

For a per-unit directive, `gate:false` suppresses only the human approval gate
and §13; it never suppresses this reviewer invocation. If the engine detects
that all required unit artifacts exist without the durable verdict, it emits
the same `run-stage` with `review_only:true`, `unit`, `reviewer`, and
`gate:false`. Skip the stage body for that recovery directive, execute only this
§12a flow for the named unit, and re-run `next` without reporting. The later
per-unit `gate:true` re-entry means all bodies and reviewer verdicts already
exist; do not regenerate either before completion verification and §13.

### Closed finding severity and verdict contract

Every reviewer and worker finding uses exactly one of these prefixes:

| Severity | Evidence contract | Effect |
|---|---|---|
| `BLOCKER` | Reproducible failure, explicit requirement or contract violation, security/data-safety defect, or demonstrated regression | Blocks `READY`. A reviewer finding goes to the builder while a bounded review iteration remains, then halts incomplete if still unresolved. A worker finding outside §12a halts immediately for human direction. |
| `FOLLOW-UP` | Concrete improvement, maintainability opportunity, or deferred risk without evidence of present failure or requirement violation | Does not block `READY`; aggregate at the completion gate and do not re-review for it |
| `NIT` | Cosmetic or optional local preference | Does not block `READY`, does not trigger builder handoff, and is omitted from user-facing status |

`READY` means zero unresolved `BLOCKER` findings. `NOT-READY` requires at least
one unresolved `BLOCKER`; finding count never changes severity. A possible
simplification, code-judo move, or unspecified opportunity is `FOLLOW-UP`
unless the reviewer supplies the `BLOCKER` evidence above.

### Flow

1. **Build the authoritative declared pass-list.** Before spawning the reviewer, pass the unchanged current `run-stage` directive JSON on stdin to:

   ```bash
   bun {{HARNESS_DIR}}/tools/amadeus-reviewer-runtime.ts scope
   ```

   The command validates the existing directive, returns a fresh transient `invocationId`, and derives its complete read scope only from `directive.stage_file`, the current Unit's required and existing optional `directive.produces`, and present `directive.consumes`. A Q&A file is included only when it is one of those explicit consumes. Missing required outputs fail the review; missing optional outputs and absent consumes are omitted. The command never discovers a Q&A file or scans the record, sibling units, `memory.md`, plan, or reasoning files.

2. **Invoke the reviewer sub-agent.** Delegate to the exact checker named in `directive.reviewer`. Pass the stage definition, validation tools named by that definition, and only the authoritative paths returned by `scope`, together with its `invocationId`, the current positive iteration, and an empty transient Scope decision transcript. Preserve this `invocationId + iteration` exactly through prompt, request, decision, and result. The reviewer result starts with `Reviewer: <directive.reviewer>` and carries invocation ID, verdict, iteration, summary, findings, transcript, and requested-read paths. The reviewer does not write the artifact.

   A reviewer that needs an integration spot-check must declare, before reading it, a concrete integration ID found in a current artifact, the single owner path from the passed contracts, a non-empty reason, and one literal file path. The conductor sends the same directive, `invocationId`, positive iteration, current transcript, and declared request to internal `check-read`. Its canonical decision and digest are bound to that `invocationId + iteration`; only an approved stdout decision permits that one read in this invocation. Missing ID, zero/multiple owners, path mismatch, directory/two-file, open/grep/glob/shell wildcard/browse/search, a second request, or replay across invocation/iteration is rejected. The transcript exists only in the prompt/result carrier; it is not a directive field, audit event, ledger, or store.

   ```bash
   bun {{HARNESS_DIR}}/tools/amadeus-reviewer-runtime.ts check-read
   ```

3. **Validate and append the Review.** Pass `{ directive, invocationId, result }` on stdin to internal `complete-review`; result and every transcript entry carry the same invocation ID and iteration. The iteration cap is re-derived from `directive.stage_file`'s `reviewer_max_iterations` frontmatter (default 2) — the same declaration the graph node is compiled from — so a carrier that raises it or drops the field is refused as tampered rather than admitted. A repair-funded iteration (step 4) adds `repair: { evidenceFingerprint }` to that carrier, naming the `observe-quality` result's `evidenceFingerprint`; it is admitted only when the intent record's audit shards carry that fingerprint as a quality-repair observation with unresolved obligations for this stage instance (`<stage>` or `<stage>:<unit>`), it funds only the iteration immediately after the spent budget, and it funds it once. A fingerprint offered while the budget still has room, or re-offered at another iteration, is refused. A repair-funded projection carries one extra durable field, **Repair evidence**. It rebuilds the scope and every canonical Scope decision from the directive, current artifacts, and passed consumes. Bypass, tampering, invocation/iteration replay, rejected/outside/second requests, invalid scope/persona/result fields, or an exhausted iteration fail non-zero without Review or READY evidence. Otherwise it runs `date -u +%Y-%m-%dT%H:%M:%SZ` exactly once immediately before a new write, validates that output with the runtime identity seam, and appends a non-growing `## Review — Iteration N` projection to the primary artifact. Re-accepting an existing projection extracts only that iteration's block, requires exactly one Verdict/Reviewer/Date/Iteration/Scope decision field in it, and validates its existing Date without minting a replacement. The durable projection includes **Verdict**, **Reviewer**, **Date**, **Iteration**, and the revalidated **Scope decision** (`none` when there was no request).

   ```bash
   bun {{HARNESS_DIR}}/tools/amadeus-reviewer-runtime.ts complete-review
   ```

   A non-zero `complete-review` result establishes no trustworthy verdict or
   findings. Report the validation failure only, keep the stage incomplete,
   and halt for human direction; never present the unvalidated reviewer output
   as findings and never continue to completion verification, §13, approval,
   or a stage result.

   These three modes are §12a-only internal conductor adapters. They are not public CLI/help/utility commands and add no directive, event, or audit shape.

4. **Read verdict.** Only after `complete-review` succeeds, read the final Review section from the primary artifact:
   - **READY** → proceed to §13 learnings ritual then the approval gate
   - **NOT-READY** and `reviewIterations < reviewer_max_iterations` (default 2):
     - Increment review iteration counter
     - Re-invoke the stage's lead agent (inline or subagent per `directive.mode`) with the artifact + unresolved `BLOCKER` findings only. The builder addresses those blockers and updates the artifact. Keep `FOLLOW-UP` for the completion message; never spend another review iteration on `FOLLOW-UP` or `NIT` alone.
     - Return to step 1 (re-invoke reviewer)
   - **NOT-READY** and iterations exhausted, with no quality-repair ruling:
     - Keep the stage incomplete. Present the unresolved `BLOCKER` findings and
       halt for human direction. Do not run §13, completion verification, or the
       approval gate, and do not report a completed/approved stage result.
   - **NOT-READY** and iterations exhausted, under an active quality-repair
     grant (§1): `observe-quality` owns the halt-or-repair decision. `parked` is
     the hard stop; a `repair` / `replanned` ruling orders the same closed checks
     re-run, and its receipt funds **exactly one** further review iteration —
     repair, then return to step 1 with the incremented iteration and that
     receipt. Each receipt funds one iteration once; when it is spent and the
     verdict is still `NOT-READY`, observe again or halt as above.

### Parallelism (per-unit stages)

Reviewer runs are **read-only and side-effect-free** (the conductor's validated
`complete-review` adapter performs the only write to that unit's own primary artifact), so reviews of DIFFERENT units
never contend. On a per-unit Construction stage (`for_each: unit-of-work`), do
not serialize draft→review→fix per unit. Instead:

1. Draft each unit's artifacts (drafting may stay serial — units often build on
   each other's contracts).
2. Once multiple units have artifacts awaiting review, dispatch their reviewer
   sub-agents **concurrently** (one message, multiple Task calls — the same
   parallel-batch pattern as practices-discovery Step 2).
3. Apply fixes per verdict as each returns; re-reviews (iteration 2) may again
   run in parallel across units.

Only the builder's fix step is inherently serial per unit (it mutates that
unit's artifacts). Reviews of the same unit's successive iterations remain
sequential by definition.

### What the reviewer does NOT do

- Does not modify the artifact; only the conductor's validated `complete-review` adapter appends the Review
- Does not communicate with the builder directly (all mediated by orchestrator)
- Does not access the builder's plan.md or memory.md
- Does not discover or request files outside the declared scope except one pre-approved `check-read` integration spot-check
- Does not block the workflow — the human always gets final say at the gate
- Does not fire for stages without a `reviewer` field in the directive

## 13. Learnings Ritual

MANDATORY: Every stage runs the learnings-capture step **between the completion message (§2) and the approval gate (§1)**. Per Fowler's harness model: "when issues recur, feedforward and feedback controls should be improved." This ritual is the human learning loop — surface what's worth remembering, write it into the harness where the next runner will pick it up automatically.

The ritual is **tool-as-actor**: a deterministic tool (`amadeus-learnings.ts`) detects, surfaces, routes, and writes; the orchestrator-LLM renders the structured question and runs the admission conflict-check; the user decides keep / heading / scope. Detection, surfacing, routing, and writing are all deterministic; judgement is the user's.

### What changes vs what doesn't

**Stage files are immutable framework artefacts.** The ritual NEVER edits a stage file's `## Steps`, `## Sensors`, or `## Learn` content. Stage files ship with framework releases; user-tier customisation lives in the harness. The one carve-out is the frontmatter `sensors:` import list — a sensor-binding addition appends a new id there (the pull-authoring two-write install). That is the import list, not body content; the stage's immutable shape is unchanged. Stage files are framework-and-loop-edited, not framework-only — but only that one frontmatter list grows.

**The harness IS mutable.** A confirmed learning IS a practice — it writes to one of two surfaces:

- `amadeus/spaces/<space>/memory/project.md` (default) or `amadeus/spaces/<space>/memory/team.md` — appended as a practice line under the fitting topical heading (e.g. `## Corrections`, `## Testing Posture`, `## Forbidden`), one click to widen a candidate from project to team. These are the SAME method files the resolver reads; there is no parallel `*-learnings.md` surface, no fractional override tier, and no org tier (no widen-to-org path). History of what was learned lives in the audit shards + the per-stage diary, not a rolling dated file.
- `{{HARNESS_DIR}}/sensors/amadeus-<id>.md` — for verification checks. A project-tier manifest with a `matches:` capability glob, bound to the originating stage by appending its id to that stage's `sensors:` frontmatter list.

Next time the stage runs, the resolved rules and the bound sensor load automatically at compile — the stage runs better without anyone having edited the stage file's body.

### When to run

Trigger after Step N-1 (completion message rendered) and before Step N (approval gate).

### The ritual

1. **Maintain a per-stage memory file as you work.** Append entries to `<record>/<phase>/<stage>/memory.md` (created at stage start if absent). Use four standard H2 headings:
   - **Interpretations** — choices made where the stage prose was ambiguous
   - **Deviations** — places where you intentionally departed from the stage prose, and why
   - **Tradeoffs** — alternatives considered and why you picked what you did
   - **Open questions** — anything to confirm before next run, or uncertain context worth flagging

   Each entry is a bullet under the appropriate heading with an ISO 8601 timestamp prefix:
   ```markdown
   - 2026-05-20T10:14:32Z — <one-line summary>; <2-3 sentences of context>
   ```

   The memory file persists across sessions — a stage that halts and resumes keeps its log intact. On stage approval, the memory file stays in the artefact directory as part of the stage's permanent record (committed alongside other artefacts).

2. **Surface candidates (the tool reads memory.md).** Run:
   ```bash
   bun {{HARNESS_DIR}}/tools/amadeus-learnings.ts surface --slug <stage-slug>
   ```
   The tool parses memory.md and emits structured JSON: one candidate per non-blank entry under **Interpretations / Deviations / Tradeoffs** (surfaced verbatim — no paraphrase, no "interesting" filtering), plus a read-only `parked_open_questions[]` list. Open questions are research items, not learnings to install — they never become candidates. Most runs surface nothing worth keeping; that's the most common outcome.

3. **Render the structured question + free-text channel.** For each candidate, render one option whose `label` is the candidate `summary` (verbatim) and whose `description` names the routed destination (e.g. `→ project.md ## Corrections`) plus a "promote to team?" affordance. Never label an option with only the candidate id — `❌ "Persist c5 only (Recommended)"` is a protocol violation: the human cannot judge what `c5` is from the label, so the `summary` (not the id) must be the visible `label`. After `multiSelect` returns, correlate each kept label back to its candidate `id` + `source_heading`. Then **always** ask "Anything to add for next time?"; for any non-empty response, ask the user to pick one of the four diary headings (Interpretation / Deviation / Tradeoff / Open question). **The diary-heading pick is the only classification asked of the user.** From it, the orchestrator routes the learning to the fitting practice heading in the method file (KNOWLEDGE): a testing learning → `## Testing Posture`, a prohibition → `## Forbidden`, anything general → `## Corrections` (the default). The user never picks the destination heading directly — the orchestrator routes by fit, and the tool ensure-exists the heading before it writes.

   **Zero candidates.** When `surface` reports no candidates at all, the ritual
   does not open — but "no candidates" is a measurement, not a self-report. Run
   `bun {{HARNESS_DIR}}/tools/amadeus-learnings.ts confirm-zero --surface-json <path>`:
   it mints a receipt (and emits `LEARNING_ZERO_CONFIRMED`) only when the
   candidate list is empty AND the surface JSON's own digest recomputes from its
   own candidates and parked questions, so a stale or edited surface cannot
   retire the ritual. Anything else prints `not-zero` and emits nothing, and the
   selection below runs. A candidate the conductor wants to ADD goes through
   `add-candidate`, which is additive-only and refuses a candidate whose
   evidence path is not on disk.

   **Solo auto-election hook.** In solo mode, when the Intent Autonomy Mode
   derives an `auto` solo-election trigger (`semi` / `full`; `none` derives
   `manual`),
   do not settle the kept set alone — put the selection (including a zero-candidate
   proposal that `confirm-zero` did NOT certify) to an election. Write a definition JSON carrying `schemaVersion: 2`,
   `electionId`, `kind`, `voters` and a one-element `questions[]` whose entry sets `questionId` to the fixed id
   `q-learnings-selection`, `text` to the selection question, and `choices`
   mapped deterministically (`internalNo` = 1-based position, `label` = the
   candidate, or the single "0 件で可" choice for a zero-candidate proposal), then run
   `bun {{HARNESS_DIR}}/tools/amadeus-election.ts open --trigger auto --file <definition.json>`.
   `--file` is REQUIRED: without it the CLI exits 2 on usage and no trigger is
   evaluated. If the CLI answers `{"opened":null,"reason":"solo-election-manual-trigger-required"}`,
   no election is created: fall back to the user's ruling on the same selection.

4. **Admission conflict-check (before any write).** For each kept learning candidate, compare the proposed practice line against `org.md`'s matching `## <section>` (matched by the routed heading — the single-line variant of the §5 admission gate). This comparison is a section-level LLM check (knowledge → orchestrator-LLM). If the practice contradicts an org guardrail, surface the conflicting org sentence inline; the user **revises, skips this candidate, or escalates** (judgement → user; there is no user-override path). Only conflict-clear or user-escalated selections proceed to the write. Sensor manifests have no org-section analogue and skip this check.

5. **Persist (the tool writes + emits audit).** Build the selections file and call:
   ```bash
   bun {{HARNESS_DIR}}/tools/amadeus-learnings.ts persist --slug <stage-slug> --selections-json <path>
   ```
   The tool, inside one `withAuditLock` transaction (decide-inside-lock, content-presence idempotency via a `<!-- cid:<slug>:<id> -->` marker so a crashed run recovers without double-appending):
   - **Learning** → appends a practice line under the orchestrator-routed heading in `<scope>.md` (scope ∈ {project, team}): `- <text> (learned YYYY-MM-DD) <!-- cid:... -->`. Ensure-exists the heading first, so a routed heading the file doesn't yet carry is created rather than throwing. Emits `RULE_LEARNED` (with `Source: orchestrator | user_addition`, `Heading: <routed>`).
   - **Sensor** → scaffolds a project-tier `<project>/{{HARNESS_DIR}}/sensors/amadeus-<id>.md` manifest (with the user-supplied `matches:` glob) AND appends the new id to the originating stage's `sensors:` frontmatter list — both writes inside the same lock. Emits `SENSOR_PROPOSED`. The sensor binds and fires from the next workflow's compile.

   The orchestrator never `Edit`s a rule or sensor file directly — every learning write goes through the tool under the lock, so the `RULE_LEARNED` / `SENSOR_PROPOSED` audit row is the replayable source of truth for what was learned. The selections file is the replay artefact: a crashed persist replays the same selections-json without re-prompting the human.

6. **Proceed to approval gate.** The ritual is advisory and additive — it never blocks the gate. If the user skipped or no candidates surfaced, proceed directly.

### Routing decision tree

```
Is the entry an Interpretation / Deviation / Tradeoff?
└── Learning → a practice line under the routed heading in <scope>.md
    Heading routed by fit (testing → ## Testing Posture, prohibition →
      ## Forbidden, general → ## Corrections); ensure-exists before write.
    Scope derived from the user's keep + optional promote:
    ├── default                       — project.md
    └── promote scope (project→team)  — team.md   (no org tier)

Is the entry an Open question?
└── Parked — research item, never installed.

Is the improvement a verification check?
└── Sensor (two-write install): scaffold a project-tier manifest at
    {{HARNESS_DIR}}/sensors/amadeus-<id>.md with a matches: glob, AND append its id to
    the originating stage's sensors: frontmatter list (one locked transaction).
    The matches: glob is a capability filter — stages: [<id>] is the binding.
```

### What goes where — quick reference

| Entry shape | Destination |
|---|---|
| Interpretation: "Reused the auth module rather than rewriting it" | `project.md ## Corrections` (practice line, `(learned YYYY-MM-DD)`) |
| Deviation: "Used Given/When/Then for AC despite freeform prose" | `project.md ## Testing Posture` (practice line); promote to `team.md` if team-wide |
| Tradeoff: "Picked TDD over BDD for the new generators this run" | `project.md ## Testing Posture` (practice line) |
| Open question: "Confirm whether story splitting is by persona or journey" | Parked — never installed |
| Check: "ADRs should carry Security and Compliance headings" | Sensor manifest `amadeus-<id>.md` (`matches:` glob) bound to the stage via its `sensors:` frontmatter |

### Why stage files stay immutable

Two reasons: (1) framework upgrades to a stage file would conflict with workflow-time edits; (2) the same stage runs in many projects, so stage-file body mutations would mean every workflow drifts the framework's methodology in incompatible directions. The harness layer (rules, learnings, sensors) is designed to compose — many small additions accumulate without conflicts. Stage-file bodies are not. The sensor-binding frontmatter edit is the one sanctioned exception: it grows the `sensors:` import list (immutable in shape, not in contents), never the `## Steps` / `## Sensors` / `## Learn` body.

---

## 14. Automatic Amadeus Finding Issue Creation

When stage work exposes a confirmed defect or actionable engineering concern
owned by Amadeus itself, route it through the deterministic GitHub Issue creator. The
layered setting is `finding.github.issue.creation.consent` with values
`off | prompt | auto`; its default is `prompt`. The fixed remote target is
`amadeus-dlc/amadeus`; this setting never files application-project issues. The
setting is a **consent axis, not an autonomy axis**: it is read the same way in
`none`, `semi` and `full`, and Intent autonomy neither raises nor lowers it.
Its resolved value is shown on `--status` so what the config says and what the
run will do can be compared without reading either.
The upstream target is deliberate: an Amadeus-owned defect observed in ANY
workspace — including forks and end-user projects — belongs to the framework's
own tracker, exactly like a crash reporter. That is why the admission rules
below insist the public body carries no workspace-private information.

### Admission

File only when all of these are true:

- evidence demonstrates an Amadeus-owned defect or a concrete, actionable risk;
- the work is not already in the active intent's scope;
- the finding is not a speculative idea, transient environment failure, or
  configuration mistake;
- the public body contains no secrets or private workspace information.

Security-sensitive findings, private repository details, and uncertain
ownership are never auto-filed. Surface them to the human instead. Work already
in scope is fixed and tested in the active intent rather than duplicated as a
new Issue.

### Deterministic creation

Create a concise public body file under the current stage's artifact directory.
It must include summary, evidence or reproduction, expected-versus-actual
behaviour (or the concrete risk), affected revision, and acceptance criteria.
Choose a stable fingerprint from the finding's kind, owning module, and failure
signature; never include timestamps, worktree paths, or secrets.

Run:

```bash
bun {{HARNESS_DIR}}/tools/amadeus-finding.ts create-github-issue \
  --project-dir <workspace-root> \
  --kind <defect|concern> \
  --title "<concise title>" \
  --body-file <stage-artifact-path> \
  --fingerprint "<kind>:<module>:<failure-signature>"
```

The coordinator resolves all three config layers fail-closed, checks GitHub
readiness, searches every open or closed Issue for its SHA-256 marker, and
creates only when there is no existing Issue. One match returns that Issue;
multiple matches stop safely without another mutation. The GitHub Gateway
accepts a create only with a coordinator-minted permit bound to the exact body
marker.

When the single match is a CLOSED Issue (`issueState: "CLOSED"` in the
outcome), do not treat the finding as settled: the same fingerprint was fixed
once before, so a fresh observation is a possible regression. Surface the
closed Issue link and the new evidence to the human instead of recording it as
an existing filing.

- `"auto"` — run the command immediately.
- `"prompt"` — present the candidate to the human. On approval, rerun the same
  command with `--approved`.
- `"off"` — do not file automatically. An explicit human filing request may run
  the command with `--approved`.

A filing failure does not invent a fallback mutation. Surface the typed failure
and the retained body artifact at the stage gate. Record the created or existing
Issue link in the stage artifact and completion message.

---

### Artifact Re-use (backward jump / redo)

When a stage detects existing output artifacts in its artifact directory:

1. List the existing artifacts found
2. Present a 3-option structured question:
   - **Keep** — Accept existing artifacts as-is, skip this stage's generation steps, proceed to approval gate
   - **Modify** — Display existing artifacts as starting context, then walk through the stage's question flow to identify what should change. Update artifacts in-place.
   - **Redo from scratch** — Ignore existing artifacts entirely and execute the stage fresh. Existing files are overwritten.

**Audit logging**: After the user's choice, call the state tool (maps the "Redo from scratch" option to `--decision redo`):

```bash
bun {{HARNESS_DIR}}/tools/amadeus-state.ts reuse-artifact <stage-slug> \
  --decision <keep|modify|redo> \
  --artifacts "<comma-separated list of existing artifacts found>"
```

The tool emits `ARTIFACT_REUSED` with the `Stage` / `Decision` / `Artifacts` fields — never hand-write `**Event**:` markdown blocks. See `docs/reference/12-state-machine.md` for the canonical emitter registry.

This applies to ALL stages, not just jump targets — when the workflow replays forward after a backward jump, each subsequent stage will also encounter existing artifacts and offer the same choice.
