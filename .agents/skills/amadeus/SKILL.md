---
name: amadeus
description: >-
  The single public entrypoint for the Amadeus v2 lifecycle. Use it whenever
  starting a new work theme, continuing or resuming an existing Intent,
  executing the next stage, or deciding whether to create an Intent. It
  performs only Intake (merge-by-default, acceptance-condition confirmation,
  scope estimation, Birth proposal), Initialization (0.1-0.3), and next-stage
  resolution based on aidlc-state.md, delegating stage-artifact creation to
  stage-internal skills. It is not a substitute for grilling, domain-modeling,
  event-storming, steering, or validator.
---

# amadeus

## Purpose

As the single public entrypoint for the Amadeus lifecycle, perform Intake and
next-stage resolution.

The user does not choose a phase or stage.
From the input, determine whether it continues an existing Intent or proposes
the Birth of a new Intent, resolve the next stage to execute from the target
record's `aidlc-state.md`, and call the corresponding stage-internal skill.

This skill itself does not create stage artifacts.

## Prerequisites

Assume that a Space exists at `aidlc/spaces/<space>/`.
Resolve the Space from `aidlc/active-space` (or `default` if it does not
exist).
If no Space exists, stop and direct the user to use `amadeus-steering` first.

Read at least the following:

- `aidlc/spaces/<space>/intents/active-intent` (if it exists; the dirName of
  the record currently being worked on)
- `aidlc/spaces/<space>/intents/intents.json` (registry)
- `aidlc/spaces/<space>/intents/intents.md`
- The possible target `aidlc/spaces/<space>/intents/<dirName>.md` and
  `<dirName>/aidlc-state.md`
- `aidlc/spaces/<space>/memory/` (org.md, team.md, project.md)

## Intake

Upon receiving input, judge in the following order.

1. **Continuation Judgment**. If the input is the Intent pointed to by
   `active-intent`, or continues an existing Intent (a gate response, a
   correction instruction, or additional work on the same subject), proceed
   to that Intent's routing. When judgment is uncertain, treat it as a
   continuation. Treat it as new only when it names clearly separate work
   unrelated to the existing Intent's subject.
2. **Merge Judgment**. If the input is new work belonging to an existing
   Intent's outcome, do not create a new Intent; propose merging it into that
   Intent instead. The merge target is an addition to the scope backlog if
   the target Intent has `ideation/scope-definition/intent-backlog.md`, or an
   addition to the Intent's requirement artifacts if it does not (when the
   scope does not execute Scope Definition, or has not executed it yet).
3. **Acceptance Condition Confirmation**. For input that looks like a new
   outcome, confirm the following three conditions: (1) it has an observable
   success criterion (technical work has behavior to preserve and an
   observable improvement metric), (2) its completion can be judged
   independently, and (3) it does not belong to an existing Intent's outcome.
   If it does not satisfy them, do not reject it; confirm one question at a
   time using the `amadeus-grilling` protocol, accept it if a success
   criterion can be articulated, and lead it to a merge if it turns out to be
   part of an existing Intent's success condition.
4. **Scope Estimation**. Estimate the scope from the words in the input
   (described below).
5. **Birth Proposal**. Confirm the creation of a new Intent with the human as
   a single question that states the estimated scope explicitly. Do not
   create an Intent without the human's explicit approval.

Intake does not judge Intent size numerically.
Do not use projected Unit or Bolt counts as acceptance criteria.
At most one Intent is created from a single input; the scope backlog receives
the remaining work within the theme.

## Scope Estimation

Estimate the scope using the following keywords as clues.
The estimate is a hypothesis; the human always makes the final decision at
the Birth proposal.

| Scope | Clues |
|---|---|
| bugfix | fix、bug、broken、バグ、不具合、修正したい |
| refactor | refactor、clean up、simplify、リファクタリング、整理したい、簡素化 |
| poc | poc、prototype、proof of concept、spike、試作、プロトタイプ |
| security-patch | security、CVE、vulnerability、patch、脆弱性 |
| infra | infrastructure、deploy、infra、インフラ、デプロイ |
| mvp | mvp、minimum viable |
| workshop | workshop、lab、training、ワークショップ、研修 |
| enterprise | No clue; used only when the human states it explicitly |
| feature | Default value. Input that does not match any of the above, or input that describes the theme in prose |

Match English keywords at word boundaries; do not trigger on substrings (do
not treat debug as a clue for bugfix).
When input matches multiple scopes or judgment is uncertain, hypothesize
`feature` and present the options at the Birth proposal.

## Initialization (Birth)

When the human approves the Birth proposal, execute the Initialization phase
(Stage 0.1-0.3) to create the Intent Record.
The three Initialization stages execute for every scope and have no approval
gate.

### 0.1 Workspace Scaffold

1. Decide the record's dirName in `<YYMMDD>-<label>` format. The date is the
   last 6 digits (YYMMDD) of the local date of the work day; the label uses
   only lowercase alphanumerics and hyphens. For the same date and name,
   append a sequence suffix `-2`, `-3`, and so on.
2. Create `aidlc/spaces/<space>/intents/<dirName>/`, and under it create the
   5 phase directories (`initialization/`, `ideation/`, `inception/`,
   `construction/`, `operation/`) and their stage subdirectories, plus
   `verification/` and `audit/`.
3. If the Space has no `knowledge/`, create it.
4. Create `audit/audit.md`, and append `WORKFLOW_STARTED`, then 0.1's
   `STAGE_STARTED`, `WORKSPACE_SCAFFOLDED`, and `STAGE_COMPLETED`. Follow
   [references/audit-events.md](references/audit-events.md) for the event
   format.

### 0.2 Workspace Detection

1. Scan the target repository read-only and judge greenfield / brownfield,
   language, framework, and build system.
2. Append `STAGE_STARTED`, `WORKSPACE_SCANNED`, and `STAGE_COMPLETED` to the
   audit.

### 0.3 State Initialization

1. Generate `aidlc-state.md` from the state template. Use
   [references/aidlc-v2/state-template.md](references/aidlc-v2/state-template.md)
   as the template, and do not change the section structure or English
   labels.
2. Fill in Project Information (Project, Project Type, Scope, Start Date,
   State Version 7), Scope Configuration (executable stages, Depth), and
   Workspace State (0.2's judgment results).
3. Fill in Stage Progress. Set the three Initialization stages to `[x]`; set
   stages executable under the scope to `[ ]` (with an `EXECUTE` note); set
   stages outside the scope to `[S]` (with a `SKIP: out of <scope> scope`
   note); set the 7 Operation stages to `[S]` (with a `SKIP: out of Amadeus
   scope` note). Follow [references/stage-catalog.md](references/stage-catalog.md)
   for the mapping between scope and stages. For brownfield, make 2.1
   executable; for greenfield, set 2.1 to `[S]` (with a `SKIP: greenfield`
   note).
4. Set the first executable stage to `[-]`, and fill in Phase Progress
   (`Initialization` is `Verified`; the phase of the first executable stage
   is `Active`; a phase with no executable stage is `Skipped`; the rest are
   `Pending`), Current Status, and Session Resume Point. Set `Construction
   Autonomy Mode` to `unset`.
5. Append `STAGE_STARTED`, `WORKSPACE_INITIALISED`, and `STAGE_COMPLETED` to
   the audit. Append `PHASE_SKIPPED` for a phase with no executable stage.
6. Update the registry. Assign a uuid with UUIDv7
   (`bun -e "console.log(Bun.randomUUIDv7())"`), and add a `{uuid, slug,
   dirName, scope, repos, status}` row to `intents.json`. Set `status` to
   `in_progress`.
7. Create the Intent's module file `<dirName>.md` from the template. The
   module file has only `概要`, `依存`, and `目標プロファイル`. Do not leave
   unknown items blank; write `未確認`.
8. Write the dirName to `intents/active-intent`.
9. Regenerate `intents.md` with
   `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>`.

The template priority order is as follows.

1. `aidlc/spaces/<space>/memory/templates/intents/intent-module.md`
2. `templates/intents/intent-module.md` bundled with this skill

## Routing

Once the target Intent is decided, resolve the stage using the following
procedure.

1. Read the record's `aidlc-state.md`. Limit reads and writes to section
   headings, checklist lines (`- [x] <stage-slug>` format), and field lines
   (`**Key**: value` format); perform writes only as replacement of the
   target line.
2. Among Stage Progress, judge only the stages belonging to Current Status's
   `Lifecycle Phase`. Follow the Phase column of
   [references/stage-catalog.md](references/stage-catalog.md) for each
   stage's phase membership. Do not select a stage that does not belong to
   the current phase, regardless of its state.
3. If all judgment targets are `[x]` or `[S]`, proceed to step 7's phase
   boundary processing.
4. Among the judgment targets, if there is a stage whose checkbox is `[R]`,
   `[-]`, or `[?]`, prioritize it and proceed to step 6 without re-judging
   the Condition. If not, select the first `[ ]` in stage order.
5. If the selected `[ ]` stage is `CONDITIONAL`, judge the Condition. If it
   is false, set the checkbox to `[S]`, write the skip reason in the note,
   append a `STAGE_SKIPPED` event to `audit/audit.md`, and return to step 3.
6. Set the selected stage's checkbox to `[-]`, update Current Status's
   `Current Stage`, append `STAGE_STARTED`, and call the internal skill
   corresponding to the stage. Follow
   [references/stage-catalog.md](references/stage-catalog.md) for the
   mapping table. If the corresponding skill is not available, stop without
   executing and report the name of the missing stage skill.
7. Perform phase boundary processing. For a phase with one or more executed
   stages, direct the creation of a phase PR, and after confirming the
   merge, append a `PHASE_VERIFIED` event (with the PR URL in Details), set
   Phase Progress to `Verified`, and advance `Lifecycle Phase` to the next
   one. If the current phase is `CONSTRUCTION`, finalize
   `construction/decisions.md` and `construction/traceability.md` before
   directing the phase PR, and after confirming the merge, set Current
   Status's `Status` to `Completed`, append `WORKFLOW_COMPLETED`, and set the
   registry's `status` to `completed`. For a phase with no executed stages,
   append a `PHASE_SKIPPED` event, set Phase Progress to `Skipped`, and pass
   through. After advancing the phase, return to step 2.

Only this skill performs phase boundary processing (directing the phase PR,
recording `PHASE_VERIFIED`, and transitioning `Lifecycle Phase`).
Do not delegate it to stage-internal skills.

If the current phase is `CONSTRUCTION`, follow the next section,
"Construction Bolt Execution," for the stage selection and execution in
steps 4 through 6.

## Construction Bolt Execution

Construction uses the Bolt as its execution unit.

1. **Bolt Resolution**. Cross-reference
   `inception/delivery-planning/bolt-plan.md`, Project Information's `Bolt
   Refs`, and the audit's `BOLT_STARTED` / `BOLT_COMPLETED`; if there is a
   Bolt that has started and is not yet complete, continue it, otherwise
   select the first unexecuted Bolt in plan order. In a scope that did not
   execute Delivery Planning, treat the entire Intent as a single implicit
   Bolt (identifier `implicit`).
2. **Bolt Start**. Create the branch and worktree following the working
   style (branch strategy) in `memory/`, append the Bolt identifier to
   Project Information's `Bolt Refs`, and append a `BOLT_STARTED` event (Bolt
   name, whether it is a walking skeleton).
3. **Unit-Level Stage Execution**. For each Unit bundled into the Bolt,
   resolve Stage 3.1 through 3.5 in stage order and call the corresponding
   internal skill. Manage Unit-level checkboxes in the CONSTRUCTION PHASE's
   `Per unit: <unit>` block.
4. **Build and Test**. After Code Generation completes for all Units in the
   Bolt, call Stage 3.6 once. On failure, stop and confirm with the human
   regardless of autonomy (halt-and-ask).
5. **Bolt Boundary Processing**. After Build and Test succeeds, direct the
   creation of a Bolt PR. After confirming the merge, append a
   `BOLT_COMPLETED` event (with the PR URL in Details). For a Bolt whose
   `Construction Autonomy Mode` is `autonomous`, this merge finalizes each
   stage's `[?]` in the Bolt to `[x]`, appends `STAGE_COMPLETED` (with the PR
   URL in Details), and reflects into the Domain Map and Context Map the
   entries under `Domain Map と Context Map への反映候補`, recorded by the
   Bolt's Functional Design in `domain-entities.md`, whose adoption decision
   has been finalized.
6. **Walking Skeleton Gate**. Regardless of the autonomy setting, the human
   always approves the first Bolt's design artifacts and generated code
   together (finalized by the Bolt PR's merge).
7. **Ladder Proposal**. Immediately after the walking skeleton's merge, once
   only, confirm how to proceed with the remaining Bolts, record the answer
   in Current Status's `Construction Autonomy Mode` (`autonomous` or
   `gated`), and append an `AUTONOMY_MODE_SET` event. There are two options:
   "autonomous (execute the remaining Bolts without gates; stop and confirm
   on failure)" and "gated (present a gate for each Bolt)".
8. **Iteration**. If there is a next Bolt, return to step 1. After all Bolts
   complete, resolve Stage 3.7 at the Intent level.
9. **Phase Boundary**. After 3.7 completes (or is skipped), finalize
   `construction/decisions.md` and `construction/traceability.md`, and
   direct the phase PR. After confirming the merge, append `PHASE_VERIFIED`,
   set Phase Progress's `Construction` to `Verified`, set `Status` to
   `Completed`, append `WORKFLOW_COMPLETED`, and set the registry's `status`
   to `completed`.

When resuming an Intent stopped at a stage gate, resume from gate
presentation.
Resuming from `[R]` does not restart the stage from the beginning; present
the previous artifacts and the reason for rejection, then begin corrections.

## Gate

Stage-internal skills present stage completion approval.
This skill handles only directing PR creation at phase boundaries and
recording phase-boundary events.

In the turn where a gate is presented, wait for the human's response.
Do not guess the response and proceed.

## Prohibitions

- Do not create an Intent without human approval. Do not create the module
  file or `aidlc-state.md` before approval.
- Do not decide whether to create an Intent based on projected Unit or Bolt
  counts.
- Do not execute a stage that the scope marks as SKIP.
- Do not create stage artifacts directly with this skill.
- Do not hand-write `intents.md`.
- Do not rewrite recorded events under `audit/`. Only append.
- Do not create the record scaffold outside Initialization.

## Next Skill

- To execute a stage: the stage-internal skill in the mapping table at
  [references/stage-catalog.md](references/stage-catalog.md)
- To confirm design points one question at a time: `amadeus-grilling`
- To refine the domain model: `amadeus-domain-modeling`
- To initialize or repair a Space: `amadeus-steering`
- To validate artifact structure: `amadeus-validator`
