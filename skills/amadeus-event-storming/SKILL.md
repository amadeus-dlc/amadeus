---
name: amadeus-event-storming
description: >-
  Use this whenever a Space exists in the Amadeus workspace and you organize
  the target theme, before Intent creation or within an Intent, as Event
  Storming. Always use it to create or repair Domain Event, Process,
  Aggregate Candidate, Bounded Context Candidate, and Hotspot in
  `aidlc/spaces/<space>/knowledge/event-storming/<event-storming-id>.md` and
  `aidlc/spaces/<space>/knowledge/event-storming/<event-storming-id>/`, or in
  `aidlc/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>.md`
  and
  `aidlc/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>/`.
  This is not a skill for finalizing Requirement, Use Case, Unit, Bolt, Task,
  Aggregate, Bounded Context, or implementation.
---

# amadeus-event-storming

## Purpose

Starting from Domain Events, draw out domain facts, sequence, causes, and
pending decisions from the human.

This skill does not advance the lifecycle phase.
It creates Event Storming analysis artifacts that Intake, Ideation, Inception,
and Domain Modeling can reference.

The only Event that Event Storming handles is the Domain Event.
Do not treat UI events, technical events, integration events, or log events as
Domain Events; leave them, if needed, as supplementary notes in
`hotspots.md` or `flow.md`.

## Prerequisites

Assume the Space at `aidlc/spaces/<space>/` exists.
Resolve the Space from `aidlc/active-space` (default `default` if absent).

If at least the following do not exist, stop the work and direct the user to
`amadeus-steering`.

- `aidlc/spaces/<space>/memory/org.md`
- `aidlc/spaces/<space>/memory/team.md`
- `aidlc/spaces/<space>/memory/project.md`
- `aidlc/spaces/<space>/knowledge/glossary.md`
- `aidlc/spaces/<space>/knowledge/actors.md`
- `aidlc/spaces/<space>/knowledge/external-systems.md`
- `aidlc/spaces/<space>/knowledge/background.md`
- `aidlc/spaces/<space>/knowledge/domain-map.md`
- `aidlc/spaces/<space>/knowledge/context-map.md`
- `aidlc/spaces/<space>/intents/intents.md`

When creating under an Intent, also confirm that the following exist for the
target Intent.

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc/spaces/<space>/intents/<dirName>/aidlc-state.md`

## Inputs

- The working directory to validate.
- The target theme or target scenario.
- scope. If unspecified, use `pre-intent` when no Intent is specified, and
  `intent-scoped` when an Intent is specified.
- level. If unspecified, use `big-picture`.
- Event Storming session ID. If unspecified, propose `ESnnn-<slug>`.
- Execution mode. If unspecified, use `guided`.

scope must be one of the following.

- `pre-intent`
- `intent-scoped`

level must be one of the following.

- `big-picture`
- `process-modeling`
- `system-design`

Make only one level the primary target of a single run.
However, advance through levels within the same Event Storming directory.

## Checking Existing Artifacts

Before creating, check for existing Event Storming.

- `aidlc/spaces/<space>/knowledge/event-storming/*.md`
- `aidlc/spaces/<space>/knowledge/event-storming/*/state.json`
- `aidlc/spaces/<space>/intents/*/event-storming/*.md`
- `aidlc/spaces/<space>/intents/*/event-storming/*/state.json`

If the same target scenario, a similar target scenario, or an incomplete
Event Storming exists, prioritize resuming or repairing the existing Event
Storming over creating a new one.

Only when a potentially related Intent exists, read the following.

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc/spaces/<space>/intents/<dirName>/aidlc-state.md`
- Artifacts under the target Intent's phase directories that relate to the
  target scenario

## Templates

When creating an artifact for the first time, use a template.

The priority order is as follows.

1. `aidlc/spaces/<space>/memory/templates/event-storming/session.md` and
   `aidlc/spaces/<space>/memory/templates/event-storming/session/`
2. `templates/event-storming/session.md` and
   `templates/event-storming/session/` bundled with this skill.

Replace `<...>` in the template with a confirmed value or `未確認`.
Leave `state.json.relatedIntent` as `null` when there is no related target.
When there is a related target, replace it with a JSON quoted string.
Do not leave the Event Storming session ID and scope as `未確認`; confirm
them before creating.
For intent-scoped, replace `state.json.relatedIntent` with the target Intent
directory name.

## Execution Modes

### `guided`

The default mode.
Before creating, ask only about the gaps needed to bring the target level
closer to ready.

Ask questions using `amadeus-grilling`.
Even when multiple points remain open, ask one question at a time rather
than listing them all at once.
Aim for around 7 questions.
Even beyond that guideline, keep asking if the decisions needed to make the
target level ready remain unconfirmed.
When continuing past the guideline, briefly state why additional
confirmation is needed.
Do not ask about things that are already clear from existing artifacts,
existing materials, or the conversation.

If the target scenario is unconfirmed, confirm the target scenario first.
If the target scenario is already clear from an existing Intent, start by
asking about Domain Events.

Base the first Domain Event question on the following.

```text
この対象で、ドメイン上「起きた」と言える重要な事実を、過去形で3つから10個挙げると何ですか？
```

After asking a question, do not create artifacts on the spot; wait for the
user's response.
When the response includes a decision to record, update `grillings.md` and
`grillings/Gxxx-*.md` in the same change that reflects it into the Event
Storming artifacts.
Limit what gets recorded to only the questions and answers that affect the
artifacts' meaning or later decisions.

### `scaffold-only`

Use only when the user explicitly specifies it.
Do not ask questions; create the Event Storming artifacts using only the
given information.

Leave missing Domain Events, relationships, candidates, and unconfirmed
items as `未確認`.
Set `status` to `draft`.

### `repair`

Repair only the headings, table columns, links, and `state.json`
correspondence of existing Event Storming artifacts.
When an existing `grillings.md` or `grillings/Gxxx-*.md` exists and only the
structure is broken, you may repair only the Grilling Decision Trail index,
session file names, required headings, table columns, relative links,
status, reflection targets, decision IDs, replacement targets, and question
record references.

Do not change the meaning of Domain Event, Aggregate Candidate, or Bounded
Context Candidate by guesswork.

### `refine`

Append or update only the content confirmed by user answers into existing
Event Storming artifacts.

When overwriting an existing Domain Event or candidate, leave the reason in
`Supersession` of `hotspots.md` or the `Event Storming module file`.
When reflecting a decision confirmed through a grilling question and answer,
also update `grillings.md` and `grillings/Gxxx-*.md` in the same change.

## Artifacts

The only creation targets for pre-intent are the following.

```text
aidlc/spaces/<space>/knowledge/event-storming/<event-storming-id>.md
aidlc/spaces/<space>/knowledge/event-storming/<event-storming-id>/
```

The only creation targets for intent-scoped are the following.

```text
aidlc/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>.md
aidlc/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>/
```

For intent-scoped, set `state.json.scope` to `intent-scoped` and
`state.json.relatedIntent` to `<dirName>`.

The only files to create or update are the following.

- `Event Storming module file`
- `events.md`
- `flow.md`
- `board.md`
- `aggregate-candidates.md`
- `bounded-context-candidates.md`
- `hotspots.md`
- `state.json`
- `grillings.md`, only when a question and answer to record occurs
- `grillings/Gxxx-*.md`, only when a question and answer to record occurs

`big-picture` uses the `Event Storming module file`, `events.md`,
`board.md`, `hotspots.md`, and `state.json`.
`process-modeling` adds `flow.md`.
`system-design` adds `aggregate-candidates.md` and
`bounded-context-candidates.md`.

Do not create Requirement, Use Case, Unit, Bolt, or Task.
Do not finalize Aggregate, Bounded Context, Contract, or invariants.
Do not create implementation, tests, CI, or PR.
Do not auto-execute `amadeus` or `amadeus-domain-modeling`.

## `state.json`

Give `state.json` the following shape.

```json
{
  "schemaVersion": 1,
  "id": "<event-storming-id>",
  "phase": "event-storming",
  "status": "draft",
  "currentLevel": "big-picture",
  "completedLevels": [],
  "scope": "pre-intent",
  "relatedIntent": null,
  "nextRecommendedSkill": "amadeus"
}
```

`status` must be one of the following.

- `draft`
- `reviewing`
- `ready`
- `superseded`

`ready` means that a downstream skill can reference it; it is not passing a
phase gate.

## `Event Storming module file`

The `Event Storming module file` has the following headings.

- `Purpose`
- `Scope`
- `Related Intent`
- `Level Status`
- `Next Skill`
- `Supersession`

Only when `system-design` is ready does it also have the following heading.

- `Handoff To Domain Modeling`

`Handoff To Domain Modeling` is input for `amadeus-domain-modeling` to decide
on.
Event Storming itself does not decide adoption, modification, splitting,
merging, or rejection.

## ID

Set the Event Storming session ID to `ESnnn-<slug>`.

Set the element IDs within artifacts as follows.

| Element | ID |
|---|---|
| Domain Event | `DEVnnn` |
| Command | `CMDnnn` |
| Actor | `ACTnnn` |
| Policy | `POLnnn` |
| External System | `EXTnnn` |
| Read Model | `RMnnn` |
| Aggregate Candidate | `AGCnnn` |
| Bounded Context Candidate | `BCCnnn` |
| Hotspot | `HOTnnn` |

## File Details

Set the list heading in `events.md` to `一覧`.
Set the table columns to `ID`, `Domain Event`, `Description`, `Source`, and
`Excluded Similar Events`.

Set the table columns in `flow.md` to `ID`, `Type`, `Label`, `Trigger`,
`Produces`, `Related`, and `Note`.
Set `Type` to one of `Actor`, `Command`, `Domain Event`, `Policy`,
`External System`, or `Read Model`.

Set the table columns in `board.md` to `Order`, `Type`, `ID`, `Label`,
`Related`, and `Note`.
Set `Type` to one of `Actor`, `Command`, `Domain Event`, `Policy`,
`External System`, `Read Model`, `Aggregate Candidate`, or
`Bounded Context Candidate`.

Set the table columns in `aggregate-candidates.md` to `ID`, `Candidate`,
`Rationale`, `Related Domain Events`, `Consistency Clues`, and
`Open Questions`.

Set the table columns in `bounded-context-candidates.md` to `ID`,
`Candidate`, `Rationale`, `Related Domain Events`,
`Related Aggregate Candidates`, and `Open Questions`.

Set the table columns in `hotspots.md` to `ID`, `Type`, `Summary`, `Source`,
`Status`, `Related`, and `Next Action`.
Set `Status` to one of `open`, `resolved`, or `accepted`.

In `Handoff To Domain Modeling` of the `Event Storming module file`, write
the `AGCnnn` or `BCCnnn` ID in `Candidate`.
Include the display name in `Evidence` or `Open Questions`.

## ready Conditions

The conditions for `big-picture ready` are as follows.

- The major Domain Events are in `events.md`.
- The Domain Events are arranged chronologically in `board.md`.
- Unconfirmed items are separated out into `hotspots.md`.

The conditions for `process-modeling ready` are as follows.

- `big-picture` is complete.
- The Commands, Actors, and Policies around each Domain Event are in
  `flow.md`.
- Related External Systems and Read Models are in `flow.md` as needed.
- `board.md` has the relationships among Domain Event, Command, Actor, and
  Policy.
- Unconfirmed items are separated out into `hotspots.md`.

The conditions for `system-design ready` are as follows.

- `process-modeling` is complete.
- `board.md` has the relationships among Domain Event, Command, Policy,
  Aggregate Candidate, and Bounded Context Candidate.
- `aggregate-candidates.md` has candidates and rationale.
- `bounded-context-candidates.md` has candidates and rationale.
- Unconfirmed items are separated out into `hotspots.md`.

`system-design ready` does not mean Aggregate, Bounded Context, invariants,
Contract, or implementation design are finalized.

## Next Skill

`nextRecommendedSkill` is chosen according to scope and level.

| scope | level | nextRecommendedSkill |
|---|---|---|
| `pre-intent` | `big-picture` | `amadeus` |
| `pre-intent` | `process-modeling` | `amadeus` |
| `pre-intent` | `system-design` | `amadeus-domain-modeling` |
| `intent-scoped` | `big-picture` | `amadeus` |
| `intent-scoped` | `process-modeling` | `amadeus` |
| `intent-scoped` | `system-design` | `amadeus-domain-modeling` |

## Supersession

Do not overwrite Event Storming artifacts in a way that changes their
meaning.
When the target scenario or understanding changes, add a new Event Storming
and set the old one to `superseded`.

Leave `Supersedes`, `Superseded By`, and `Reason` in `Supersession` of the
`Event Storming module file`.

## Validation

After creating or repairing, run the following.

```bash
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts .
```

If created under an Intent, also specify the target Intent and run the
following.

```bash
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . <dirName>
```

## Prohibitions

- Do not call anything other than a Domain Event an Event.
- Do not create Requirement, Use Case, Unit, Bolt, or Task.
- Do not finalize Aggregate, Bounded Context, Contract, or invariants.
- Do not create implementation, tests, CI, or PR.
- Do not create `.kiro/specs`, `openspec`, or Spec artifacts.
- Do not auto-execute `amadeus` or `amadeus-domain-modeling`.
