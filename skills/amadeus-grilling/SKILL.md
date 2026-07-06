---
name: amadeus-grilling
description: >-
  Interview one question at a time about Amadeus's Intent, steering, domain,
  design boundaries, and execution policy. Always use this when the user
  wants to grill, press through questions, hammer out a design, or confirm an
  ambiguous point, or when an Amadeus skill needs to confirm an insufficient
  point in guided mode. Do not line up multiple questions at once. Attach a
  recommended answer to each question and wait for the response.
---

# amadeus-grilling

## Purpose

Resolve ambiguity in a plan or design one question at a time.

Trace the branches of the design tree in order until reaching shared
understanding. For decisions that depend on each other, unravel the
dependencies and resolve them one at a time.

## Basic Stance

Ask questions rigorously. However, do not make increasing the number of
questions an end in itself.

Ask only about points that cannot proceed without the user's judgment.
Confirm anything answerable from the codebase, artifacts under `aidlc/`,
existing documents, or the existing conversation yourself, without asking.

## How to Ask Questions

Ask questions one at a time. Lining up multiple questions at once makes it
unclear which decision to resolve first.

Include the following in each question:

- What you want to decide.
- Why that decision is needed now.
- A recommended answer.
- The reason for the recommendation.

After asking a question, wait for the user's answer. Do not move on to the
next question before receiving the answer.

## Recommended Answers

Always attach a recommended answer to each question.

Base the recommended answer on the current artifacts, design boundaries,
implementation risk, and impact on subsequent work. If you cannot recommend
an answer, state the reason and the missing information needed for the
decision.

## Research First

If a question can be answered by investigating the codebase or artifacts,
investigate first.

Examples of investigation targets:

- `aidlc/`
- `README.md`
- `AGENTS.md`
- `AMADEUS.md`
- Existing skills
- Existing Intent artifacts
- Existing domain, glossary, decision, and traceability

Ask only when, after investigating, human judgment is still required.

## Grilling Decision Trail

When a question and answer arising in `guided` or `refine` affects the
meaning of an artifact or a subsequent decision, record the confirmed
decision process as a Grilling Decision Trail.

A Grilling Decision Trail is not a raw log. Do not record unconfirmed
remarks, proposals later rejected, mere execution permissions, light
confirmations of work order, confirmations of command execution, or
temporary work convenience.

The decisions to record are ones such as:

- Scope.
- Success criteria.
- Out of scope.
- Dependencies.
- Terminology.
- Bounded Context.
- Decomposition policy.
- State decisions.
- Reflection target.
- Supersede decisions.

`amadeus-grilling` is the standard for what to record, the record structure,
states, and numbering. Creating or updating the actual `grillings.md` and
`grillings/Gxxx-*.md` is done by the phase skill that called grill.

Do not update artifacts in the turn where you asked the question. In the next
turn, after receiving the user's answer, the phase skill interprets the
answer within its own artifact boundary and updates the Grilling Decision
Trail in the same change as the reflection into the phase artifacts.

Place it directly under the root of the target artifact set.

```text
<target root>/
  grillings.md
  grillings/
    G001-<topic>.md
```

The target roots are:

```text
amadeus/spaces/<space>/knowledge/event-storming/<event-storming-id>/
amadeus/spaces/<space>/intents/<dirName>/
amadeus/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>/
```

Exclude the Space's `memory/` and `knowledge/` from this recording target,
because the structure directly under `amadeus/spaces/<space>/` is mixed.

For decisions that only affect the overall domain or shared terminology, do
not create a dedicated Grilling Decision Trail under the current structure.
If needed, record the rationale in
`amadeus/spaces/<space>/knowledge/domain-map.md`,
`amadeus/spaces/<space>/knowledge/context-map.md`,
`amadeus/spaces/<space>/knowledge/glossary.md`, or in the target Intent's
decision.

`grillings.md` handles only the index. Place session details in
`grillings/Gxxx-*.md`.

The exact format — the `grillings.md` columns, the session file's required
headings and fields, and a copy-paste template — is defined in exactly one
place: `references/grilling-trail-contract.md`. Follow it when creating or
updating either file; do not restate or re-derive the structure here. In
Event Storming, that contract's `反映先` link rule additionally allows
`../<id>.md`, which points from `<id>/grillings` to the parent Markdown with
the same ID. Do not reflect shared terminology through a relative link from
the Grilling Decision Trail — record it in the rationale for the term in
`amadeus/spaces/<space>/knowledge/glossary.md`, or in the target Intent's
decision.

`scaffold-only` does not ask questions, so it creates no Grilling Decision
Trail. `repair` does not, in principle, update the Grilling Decision Trail.
However, if the existing `grillings.md` or `grillings/Gxxx-*.md` itself is
broken, you may fix it as a structural repair.

## Handing Off Prolonged Discussions

When grilling becomes prolonged and it is safer to continue in a separate
conversation unit, use `handoff` as an operational aid.

`handoff` is not an Amadeus DLC artifact. Place the handoff document you
create in the OS temporary directory, not under `aidlc/`.

Keep confirmed decisions in the Grilling Decision Trail. Write in `handoff`
only the references needed to resume in the next conversation unit.

Include at least the following in `handoff`:

- The target workspace and the target artifact set.
- The `grillings.md` and `grillings/Gxxx-*.md` to reference.
- A summary of decisions already confirmed.
- Unanswered questions and the single next question to confirm.
- The recommended skill to use in the next conversation unit.

Do not duplicate content already written in existing artifacts into
`handoff`. When artifacts, PRs, Issues, diffs, or validation results exist,
reference them by path or URL.

## Where to Use in Amadeus

Use it in scenes such as:

- Confirming the Space's `memory/` (purpose, constraints) and `knowledge/`
  (actors, domain areas).
- Confirming the Intent's purpose, dependencies, success criteria, and scope.
- Confirming Ideation's target, out-of-scope, feasibility, team formation,
  rough mockups, and handoff to Inception.
- Confirming the meaning of terminology, concepts, Bounded Context, DDD
  models, and contracts.
- Confirming the granularity of Unit, Bolt, and Spec, and reasons for
  exceptions.

## Prohibitions

- Do not line up multiple questions at once.
- Do not ask about anything answerable by reading existing artifacts.
- Do not ask a question without a recommended answer.
- Do not update artifacts in the turn where you asked, without waiting for
  the answer.
- Do not finalize the user's answer in a way that contradicts existing
  artifacts. If there is a contradiction, explain the contradiction first and
  confirm.
