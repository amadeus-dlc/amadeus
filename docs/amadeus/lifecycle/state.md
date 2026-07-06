# State Reference

## AI-DLC v2 reference

- [AI-DLC v2 State Machine](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/12-state-machine.md)
- [AI-DLC v2 State Template](https://github.com/awslabs/aidlc-workflows/blob/v2/core/knowledge/amadeus-shared/state-template.md)
- [AI-DLC v2 Audit Format](https://github.com/awslabs/aidlc-workflows/blob/v2/core/knowledge/amadeus-shared/audit-format.md)

The vendored copy lives at `skills/amadeus/references/aidlc-v2/`.
Compliance is judged by structural match against the vendored copy.

## Inputs

This document is not a per-stage document, so the stage contract's Inputs table ([overview.md](overview.md)'s "Stage contract I/O notation") does not apply.
The contracts this document references as input are the record's top-level `amadeus-state.md` (the sole owner of state), the record's `audit/` (append-only events), and the Space's `intents/intents.json` (the canonical ledger).

## Responsibilities

The Intent's execution state has exactly one owner: the record's top-level `amadeus-state.md`.
Its structure and labels are the v2 state template, used as-is.

Approval and transition history belongs to the record's `audit/` shards (per-clone `audit/<host>-<clone>.md`), as append-only events.
The Intent's canonical ID and its listing belong to the Space's `intents/intents.json` (the registry).

The single entry point reads `amadeus-state.md` to resolve which stage runs next.
`amadeus-validator` verifies consistency between `amadeus-state.md`, `audit/`, `intents.json`, and the artifacts.

Skills make the judgment calls behind a state update; this contract fixes only the recording format.

## `amadeus-state.md` structure

The section structure follows the v2 state template as-is.

| Section | Holds |
|---|---|
| `Project Information` | Project, Project Type (Greenfield / Brownfield), Scope, Start Date, State Version (7), Active Agent, Worktree Path, Bolt Refs, Practices Affirmed Timestamp |
| `Scope Configuration` | Stages to Execute, Stages to Skip, Depth (Minimal / Standard / Comprehensive) |
| `Workspace State` | Project Root, Languages, Frameworks, Build System (the result of 0.2 Workspace Detection) |
| `Execution Plan Summary` | Total Stages, Completed, In Progress |
| `Runtime State` | Revision Count |
| `Phase Progress` | The state of the 5 phases (Pending / Active / Verified / Skipped) |
| `Stage Progress` | Checkboxes for all 32 stages, divided by a `### <PHASE> PHASE` subheading per phase |
| `Current Status` | Lifecycle Phase, Current Stage, Next Stage, Status (Running / Completed), Construction Autonomy Mode (unset / autonomous / gated), Last Updated |
| `Session Resume Point` | Last Completed Stage, Next Action, Pending Artifacts |

Reading and writing are scoped to section headings, checklist lines (the `- [x] <stage-slug>` form), and field lines (the `**Key**: value` form) only.
A write replaces only the target line; it preserves the section order and any unknown lines.
The parse contract is implemented in `skills/amadeus-validator/validator/aidlc-state-contract.ts`, shared by the single entry point and the validator.

## Stage state

Stage state is expressed by the Stage Progress checkbox. The vocabulary is the v2 set of 6.

| checkbox | State name | Meaning |
|---|---|---|
| `[ ]` | Pending | Not started. |
| `[-]` | Active | In progress. |
| `[?]` | AwaitingApproval | Work complete, waiting at the gate. A human response is the only blocker. |
| `[R]` | Revising | Sent back at the gate; under revision. |
| `[x]` | Completed | Approved and complete. |
| `[S]` | Skipped | Out of execution scope per scope or a Condition. |

The checkbox line's annotation (after the ` — ` separator) reads `EXECUTE` when the stage is in scope, or `SKIP: <reason>` when it is not.
Operation's 7 stages are out of Amadeus's execution scope and are always `[S]` (`SKIP: out of Amadeus scope`).

State transitions are limited to the following.

- `[ ]` to `[-]`. Stage starts.
- `[-]` to `[?]`. Artifacts are produced and the gate is presented.
- `[?]` to `[x]`. A human approves.
- `[?]` to `[R]`. A human sends it back.
- `[R]` to `[?]`. Re-presented after revision.
- `[ ]`, `[-]`, or `[R]` to `[S]`. A Condition evaluation or human instruction.

Separating `[?]` from `[R]` distinguishes resume behavior.
When resuming from `[R]`, the stage does not restart from scratch — it presents the prior artifact and the reason it was sent back before entering revision.

Unit-scoped stages (Construction 3.1-3.5) repeat, under the CONSTRUCTION PHASE subheading, one `Per unit: <unit>` block per Unit.

## Approval and history (audit)

Approval records are not held in `amadeus-state.md`; they belong to events in the `audit/` shards.
Entry format and event names follow the v2 audit format, and only appends are made.

| Record | Event |
|---|---|
| Stage gate presented | `STAGE_AWAITING_APPROVAL` |
| Human approval (in-conversation gate) | `GATE_APPROVED` (records the User Input verbatim) and `STAGE_COMPLETED` |
| Human rejection | `GATE_REJECTED` (records the Feedback verbatim) and `STAGE_REVISING` |
| Skip by Condition or scope | `STAGE_SKIPPED` |
| Phase boundary (phase PR merge) | `PHASE_VERIFIED` (Details holds the PR URL) |
| Passage of a phase with all stages skipped | `PHASE_SKIPPED` |
| Bolt start and completion | `BOLT_STARTED`, `BOLT_COMPLETED` (Details holds the Bolt PR URL) |
| Response to a ladder proposal | `AUTONOMY_MODE_SET` |
| Intent start and completion | `WORKFLOW_STARTED`, `WORKFLOW_COMPLETED` |

Stage gates default to in-conversation; phase gate and Bolt gate confirmation default to a PR and its human merge.
Completion via Accept-as-is after 3 consecutive rounds of Request Changes is recorded in `GATE_APPROVED` by noting that it is an Accept-as-is, with the judgment recorded in the phase's `decisions.md`.

## Ledger and PR snapshots

`amadeus-state.md` and the `audit/` shards are a live, append-only ledger; they do not roll state back to match each phase PR's or Bolt PR's snapshot.
The ledger here refers to the Intent's progress record — a distinct object from the canonical ledger (`intents.json`) in the "Cursor and registry" section below.
This treatment is consistent with org.md's prohibition against rewriting recorded audit events.

Each phase PR / Bolt PR includes only that phase's / Bolt's artifact directory; the ledger files (`amadeus-state.md`, `audit/`) always carry the latest snapshot.
So it is normal for the ledger, in a PR's diff, to include "future or past state not part of that PR."

Resume and verification read the whole ledger, not a specific PR's snapshot.
This includes referencing audit events such as `BOLT_COMPLETED`.

If a review raises "the ledger doesn't match the PR snapshot," you may respond with a single link to this section or to [Issue #477](https://github.com/amadeus-dlc/amadeus/issues/477) and resolve the thread.
A stock line you can paste into a PR description:

```
The ledger files (amadeus-state.md / audit) are a live ledger and do not match the PR snapshot. See "Ledger and PR snapshots" in docs/amadeus/lifecycle/state.md.
```

Phase Progress's automatic update was already implemented in the engine by [PR #479](https://github.com/amadeus-dlc/amadeus/pull/479), which resolved [Issue #464](https://github.com/amadeus-dlc/amadeus/issues/464); its behavior is authoritative per the "Phase transitions" section below.
The same PR also made the presence of `verification/phase-check-<phase>.md` a requirement at phase boundaries (documenting it as a requirement item under the "Verification" section's checklist is follow-up work for #464).

## Phase transitions

Phases proceed in the order Initialization, Ideation, Inception, Construction.
Operation holds only the record's scaffold and is out of execution scope.

A phase with one or more executed stages records `PHASE_VERIFIED`, sets Phase Progress to `Verified`, and transitions to the next phase once all in-scope stages are `[x]` or `[S]` and the phase PR is merged.

When scope skips every stage within a phase, that phase passes through without producing artifacts or a phase PR: it records `PHASE_SKIPPED` and sets Phase Progress to `Skipped`.
For example, bugfix skips every Ideation stage; on the strength of Intake's Birth approval, it sets Ideation to `Skipped` and proceeds directly to Inception's stages.

After the Construction phase PR merges, Current Status's `Status` is set to `Completed`, `WORKFLOW_COMPLETED` is recorded, and the registry's `status` is set to `completed`.

A parked Intent records `WORKFLOW_PARKED`; on resume, it records `WORKFLOW_UNPARKED` and resumes from the Session Resume Point.

## Cursor and registry

**Cursor**: `amadeus/active-space` points to the current Space, and `amadeus/spaces/<space>/intents/active-intent` points to the dirName of the record currently being worked on.
The cursor is worker-local state and is gitignored.
Intake's continuation judgment first matches the cursor's Intent against the input.

**Registry**: `amadeus/spaces/<space>/intents/intents.json` is the canonical ledger of all Intents.
Each entry holds `{uuid, slug, dirName, scope, repos, status}`.
`uuid` is a UUIDv7, a collision-free canonical ID.
`dirName` is the record directory name (the `<YYMMDD>-<label>` form); same-day, same-name collisions are distinguished by a trailing sequence number (`-2`, `-3`).

**Index**: the `intents.md` index was retired (GD009).
When a human-facing Intent listing is needed, generate it on demand from the canonical ledger `intents.json` (see [overview.md](overview.md)).

Note: #369's confirmed decision 3 (making state.json the owner of state) and confirmed decision 4 (not adopting UUIDv7) were superseded by this contract under full v2 compliance (Issue #387, GD001-GD003).

## Verification

`amadeus-validator` verifies at least the following.

- `amadeus-state.md` has every section of the v2 state template and State Version 7.
- Stage Progress has a row for all 32 stages, and each checkbox is a known vocabulary item.
- Stages out of scope's execution scope, and all of Operation's stages, are `[S]`.
- A `[x]` stage has the artifacts the contract requires, and a `STAGE_COMPLETED` event exists.
- When a required input's supplying stage is `[S]`, downstream stages follow the input substitution on reduction in [scopes.md](scopes.md).
- The preceding phase's Phase Progress is `Verified` or `Skipped`, and the corresponding `PHASE_VERIFIED` / `PHASE_SKIPPED` event exists.
- Each entry in `intents.json` has a UUIDv7 and a dirName in the `<YYMMDD>-<label>` form, corresponding 1:1 with a record directory.
