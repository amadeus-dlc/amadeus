---
name: amadeus-domain-grilling
description: >-
  Interview Amadeus's terminology, concepts, bounded contexts, DDD models,
  contracts, and domain decisions one question at a time, and record the
  confirmed content into Amadeus artifacts. Use this whenever the user wants a
  grill-with-docs equivalent, wants to grill the domain, wants to interview
  terms or models while recording them into `aidlc/`, or wants to combine
  `amadeus-grilling` with `amadeus-domain-modeling`. Use `amadeus-grilling`
  alone for general design questions only, and use `amadeus-domain-modeling`
  alone for repairing already recorded content only. When intent is
  ambiguous, such as a bare request to "grill" something, do not proceed as
  this skill; instead list candidate skill names with numbers and confirm.
---

# amadeus-domain-grilling

## Purpose

Resolve ambiguity in Amadeus's target domain through questions, and record
the confirmed knowledge into `aidlc/` artifacts.

This skill is a composite entrypoint of `amadeus-grilling` and
`amadeus-domain-modeling`. Follow `amadeus-grilling` for the question
protocol. Follow `amadeus-domain-modeling` for where to record terms,
models, contracts, and decisions, and for promotion conditions.

## Applicability Judgment

First, judge whether it is appropriate to proceed as this skill.

Apply `amadeus-domain-grilling` only when both of the following can be read
from the user's request and the workspace context.

1. There is intent to work with Amadeus artifacts.
2. There is intent to interview terminology, concepts, bounded contexts, DDD
   models, contracts, or domain decisions through questions, and to record
   the confirmed content into `aidlc/`.

Proceed as this skill for requests such as the following.

- "Grill Amadeus's domain"
- "I want to interview terminology through questions and record it in
  aidlc"
- "I want to grill bounded contexts while recording them in
  domain-notes.md"
- "I want to proceed by combining amadeus-grilling and
  amadeus-domain-modeling"

On the other hand, confirm when intent to record into Amadeus's domain
artifacts cannot be read, as with requests such as a bare "grill it",
a casual "grill-me this", or "hash out this design". In particular, when the
current workspace looks like the repository that develops Amadeus itself,
first suspect that the request may be about skill design, operating policy,
or general design discussion. As judgment inputs, check the current
directory name and whether `README*.md`, `AGENTS.md`, `AMADEUS.md`,
`skills/amadeus-*`, and a root `aidlc/` exist.

When confirmation is needed, present the candidate skill names as a
numbered list and wait for the user's response. Always include the skill
name itself in each candidate, not just an abstract description.

```markdown
どの skill として進めるか確認させてください。

1. 推奨: `amadeus-domain-grilling`
   Amadeus のドメイン知識を質問で詰め、確定内容を `aidlc/` に記録する。

2. `amadeus-grilling`
   Amadeus の設計、計画、方針を質問で詰める。
   Amadeus 成果物は更新しない。

3. `grilling`、`grill-me`、または `grill-with-docs`
   一般的な grill をしながら、ADR や glossary などの通常ドキュメントへ残す。
   これらの skill がインストールされている場合だけ候補に含める。

4. `amadeus-domain-modeling`
   すでに確定した Amadeus の用語、モデル、契約だけを `aidlc/` に記録または補修する。
```

## Skills to Use

When using this skill, also read the following SKILL.md files.

- `amadeus-grilling`
- `amadeus-domain-modeling`

The division of responsibility is as follows.

| skill | Handles | Does not handle |
|---|---|---|
| `amadeus-grilling` | Ask one question at a time, attach a recommended answer and reason, and wait for the response | Updating artifacts |
| `amadeus-domain-modeling` | Record terms, concepts, models, contracts, and decisions into `aidlc/` | Controlling question progression |
| `amadeus-domain-grilling` | Combine the two above, and connect content confirmed through questions to recording | Creating its own terminology rules or artifact structure |

## When to Use

Use this for requests such as the following.

- Doing a `grill-with-docs` equivalent within Amadeus artifacts.
- Interviewing terms or concepts through questions while recording them
  into `aidlc/spaces/<space>/knowledge/glossary.md` or `domain-notes.md`.
- Confirming bounded contexts, DDD modules, aggregates, entities, value
  objects, or contracts through conversation.
- Deciding whether to promote an Intent-specific domain candidate into the
  overall model.
- Confirming whether a domain decision should be recorded in
  `decisions.md` and `decisions/<decision-id>-<slug>.md`.

Use `amadeus-grilling` alone for interviewing only general design
boundaries or approach. Use `amadeus-domain-modeling` alone for only
recording, repairing, or promoting already confirmed terms or models.

## Procedure

1. Read the `amadeus-grilling` and `amadeus-domain-modeling` SKILL.md
   files.
2. Check `aidlc/`, `aidlc/spaces/<space>/knowledge/glossary.md`,
   `aidlc/spaces/<space>/knowledge/domain-map.md`,
   `aidlc/spaces/<space>/knowledge/context-map.md`, and, if needed, the
   target Intent's `domain-notes.md`,
   `inception/requirements-analysis/requirements.md`,
   `inception/units-generation/unit-of-work.md`,
   `inception/delivery-planning/bolt-plan.md`, `inception/traceability.md`,
   `inception/decisions.md`, and Construction Functional Design.
3. Do not ask about anything that reading already makes clear.
4. Choose only one domain topic that still needs human judgment.
5. Ask exactly one question, in the `amadeus-grilling` format.
6. Include in the question what you want to decide, why it is needed now,
   a recommended answer, and the reason for the recommendation.
7. Do not update artifacts in the turn where you ask the question.
8. Once the user answers, update the corresponding `aidlc/` artifacts
   following `amadeus-domain-modeling`.
9. If the answer contains a decision to record, update the target artifact
   set's `grillings.md` and `grillings/Gxxx-*.md` in the same change as the
   artifact update.
10. After updating, if a domain topic still remains, ask one more question
    again.

## Question Output

When a question is needed, use the following format.

```markdown
確認した成果物: <確認した主なファイル>
論点: <今回扱うドメイン論点>
質問: <一問だけ>
推奨回答: <推奨する判断>
理由: <推奨理由>
回答後に更新する候補: <domain-notes.md / glossary.md / domain-map.md / context-map.md / Construction Functional Design / inception/traceability.md / inception/decisions.md など>
```

Do not line up multiple questions at once. Ask the next question only
after receiving the user's response and finishing the necessary artifact
updates.

## Updates After Answers

Once the content is confirmed by the user's answer, follow
`amadeus-domain-modeling`'s rules for where to record it.

- Record unconfirmed terms, candidates, and open questions in the target
  Intent's `domain-notes.md`.
- Record confirmed terms shared across all Intents in
  `aidlc/spaces/<space>/knowledge/glossary.md`.
- Record subdomains and BCs adopted overall in
  `aidlc/spaces/<space>/knowledge/domain-map.md`.
- Record adopted dependencies and collaborations between BCs in
  `aidlc/spaces/<space>/knowledge/context-map.md`.
- Record detailed models, contracts, and design decisions scoped to a
  specific Unit's implementation design in Construction Functional Design.
- If a decision affects model elements or contract IDs, also align
  the target Intent's `inception/traceability.md`.
- Turn a decision into a `decision` only when it is hard to reverse, its
  intent is hard to understand without background, and it involves a real
  trade-off.

Record the Grilling Decision Trail directly under the target artifact
set's root.

- Record Intent-specific decisions in
  `aidlc/spaces/<space>/intents/<dirName>/grillings.md` and
  `aidlc/spaces/<space>/intents/<dirName>/grillings/Gxxx-*.md`.
- Record Event-Storming-specific decisions in
  `aidlc/spaces/<space>/knowledge/event-storming/<event-storming-id>/grillings.md`
  and
  `aidlc/spaces/<space>/knowledge/event-storming/<event-storming-id>/grillings/Gxxx-*.md`.
- Record decisions specific to Event Storming under an Intent in
  `aidlc/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>/grillings.md`
  and
  `aidlc/spaces/<space>/intents/<dirName>/event-storming/<event-storming-id>/grillings/Gxxx-*.md`.
- For decisions that reflect only into the overall domain or shared
  terminology, do not create a dedicated Grilling Decision Trail under the
  current structure. If needed, record the rationale in
  `aidlc/spaces/<space>/knowledge/domain-map.md`,
  `aidlc/spaces/<space>/knowledge/context-map.md`,
  `aidlc/spaces/<space>/knowledge/glossary.md`, or the target Intent's
  decision.
- Exclude the Space's `memory/` and `knowledge/` from this recording
  target, because their structure is mixed directly under
  `aidlc/spaces/<space>/`.

## Prohibitions

- Do not create an artifact structure unique to this skill.
- Do not create identifier rules for terms, models, or contracts that
  differ from `amadeus-domain-modeling`.
- Do not update artifacts in a turn where a question is needed.
- Do not line up multiple questions at once.
- Do not ask about anything that reading already makes clear.
- Do not update `CONTEXT.md` or `docs/adr/**`.
- Do not newly create stage artifacts such as `requirements.md`,
  `stories.md`, `unit-of-work.md`, or `bolt-plan.md`.
