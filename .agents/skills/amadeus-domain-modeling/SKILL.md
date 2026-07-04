---
name: amadeus-domain-modeling
description: >-
  Actively refine the target domain model within Amadeus artifacts. Use it whenever you need to pin down terminology,
  the ubiquitous language, concept boundaries, concrete scenarios, the domain model, contracts, or domain decisions,
  and record the confirmed content into `aidlc/spaces/<space>/knowledge/glossary.md`, `aidlc/spaces/<space>/knowledge/domain-map.md`,
  `aidlc/spaces/<space>/knowledge/context-map.md`, `aidlc/spaces/<space>/intents/<dirName>/domain-notes.md`, Construction Functional Design,
  or the minimum necessary decision. Do not use this to update the repo's development `CONTEXT.md` or `docs/adr`.
---

# amadeus-domain-modeling

## Purpose

Actively refine, while designing, the model of the target domain that Amadeus artifacts handle.

This skill is not just for reading `aidlc/spaces/<space>/knowledge/glossary.md`, `domain-map.md`, and `context-map.md`.
It is a skill for pointing out terminology conflicts, sharpening ambiguous words, testing concept relationships with concrete scenarios, and recording the confirmed content into Amadeus artifacts on the spot.

It handles the domain knowledge of the target product recorded under the Space (`aidlc/spaces/<space>/`).
It does not update `CONTEXT.md` or `docs/adr/**`, which hold development terminology for the Amadeus repo itself.

## File Structure

The Amadeus workspace keeps organization-wide domain knowledge and Intent-specific domain knowledge separate.

```text
aidlc/spaces/<space>/
├── knowledge/
│   ├── glossary.md
│   ├── domain-map.md
│   └── context-map.md
└── intents/
    └── <dirName>/
        ├── domain-notes.md
        ├── construction/
        │   └── <unit-id>-<slug>/
        │       └── functional-design/
        └── inception/
            ├── decisions.md
            ├── decisions/
            │   └── <decision-id>.md
            └── traceability.md
```

`aidlc/spaces/<space>/knowledge/glossary.md` handles confirmed terminology shared across all Intents.
`aidlc/spaces/<space>/knowledge/domain-map.md` handles subdomains and Bounded Contexts adopted organization-wide.
`aidlc/spaces/<space>/knowledge/context-map.md` handles dependencies and collaboration relationships between adopted Bounded Contexts.

`aidlc/spaces/<space>/intents/<dirName>/domain-notes.md` handles unresolved terms, candidates, questions, and reflection history found within the Intent.
The detailed domain model, contracts, and models or contracts scoped to a specific Unit's implementation design are handled in Construction Functional Design.

Create files only when they become necessary.
When you find an unresolved term or concept, first record it in the target Intent's `domain-notes.md`.
Promote to `aidlc/spaces/<space>/knowledge/glossary.md` only terms whose meaning is confirmed and that may be used across multiple Intents.

## Checks at Session Start

If the Space (`aidlc/spaces/<space>/`) does not exist, do not record terms or models into a substitute file.
Stop the work and direct the user to first initialize the Space by starting a workflow with the `amadeus` entrypoint (the engine's Initialization phase scaffolds the Space; see `bun .agents/amadeus/tools/amadeus-utility.ts help` for the space verbs).

The Space is unprepared if at least one of the following does not exist.

- `aidlc/spaces/<space>/knowledge/glossary.md`
- `aidlc/spaces/<space>/knowledge/domain-map.md`
- `aidlc/spaces/<space>/knowledge/context-map.md`
- `aidlc/spaces/<space>/intents/intents.md`

When handling Intent-specific terminology, models, contracts, or decisions, confirm the target Intent directory name.
If the target Intent does not exist, stop the work and direct the user to first create the Intent with `amadeus`.
If the target Intent's `domain-notes.md` does not exist, create it once you need to record a candidate or an unresolved item.

## Behavior During a Session

### Cross-Check Against the Glossary

If the user uses a term that conflicts with the existing `aidlc/spaces/<space>/knowledge/glossary.md`, point it out on the spot.

Example:

```text
glossary では「アカウント」は認証・契約・設定の管理単位ですが、
今の文脈では「利用者本人」を指しているように見えます。
ここでは「利用者」と「アカウント」のどちらを意味していますか。
```

Cross-check the same way when Intent-specific candidates exist in `domain-notes.md`.
Do not proceed while it remains ambiguous whether it means the same thing as an existing candidate or a different concept.

### Sharpen Ambiguous Words

When an ambiguous, overly broad, or multi-meaning word comes up, propose a more precise canonical term.

Example:

```text
「ユーザー」は広すぎます。
この Intent では、ログインしてサービスを使う主体なら「利用者」、
認証情報の管理責任に注目するなら「アカウント所有者」と分けた方がよいです。
```

Once the proposed term is confirmed, record it in `aidlc/spaces/<space>/knowledge/glossary.md` if it is a shared term.
Record it in `domain-notes.md` if it is still an Intent-internal candidate.

### Test with Concrete Scenarios

While discussing domain relationships, test boundaries using concrete scenarios.

Example:

```text
再設定トークンを値オブジェクトとする場合、使用済み状態をどこが保持しますか。
使用状態を持つならエンティティ候補であり、値だけなら値オブジェクト候補です。
```

Make the scenario one that reveals the boundary between concepts, lifecycle, identity, contracts, and exception conditions.

### Cross-Check Against Artifacts

When the user states domain behavior, cross-check it against existing Amadeus artifacts.

Examples of what to check:

- `aidlc/spaces/<space>/knowledge/glossary.md`
- `aidlc/spaces/<space>/intents/<dirName>/domain-notes.md`
- `aidlc/spaces/<space>/intents/<dirName>/inception/requirements-analysis/requirements.md`
- `aidlc/spaces/<space>/intents/<dirName>/inception/user-stories/stories.md`
- `aidlc/spaces/<space>/intents/<dirName>/inception/units-generation/unit-of-work.md`
- `aidlc/spaces/<space>/intents/<dirName>/inception/delivery-planning/bolt-plan.md`
- `aidlc/spaces/<space>/intents/<dirName>/inception/traceability.md`
- `aidlc/spaces/<space>/knowledge/domain-map.md`
- `aidlc/spaces/<space>/knowledge/context-map.md`
- `aidlc/spaces/<space>/intents/<dirName>/construction/<unit-id>-<slug>/functional-design/`

In a workspace that has implementation code, also check the code as needed.
If the artifact or code conflicts with what was said, confirm which one to adopt.

Example:

```text
use-cases では再設定トークンが使用状態を持つ前提ですが、
今の説明では単なる値として扱っています。
この Intent ではエンティティと値オブジェクトのどちらに揃えますか。
```

### Record Immediately Once Confirmed

Once terminology, a concept, a model, or a contract is confirmed, update the corresponding Amadeus artifact on the spot.
Do not batch the recording for later.

Guide to where to update:

| Confirmed item | Update target |
|---|---|
| Unresolved terms, candidates, questions within the Intent | `aidlc/spaces/<space>/intents/<dirName>/domain-notes.md` |
| Confirmed terminology shared across all Intents | `aidlc/spaces/<space>/knowledge/glossary.md` |
| Subdomains, BCs adopted organization-wide | `aidlc/spaces/<space>/knowledge/domain-map.md` |
| Dependencies and collaboration relationships between adopted BCs | `aidlc/spaces/<space>/knowledge/context-map.md` |
| Detailed models, contracts, design decisions scoped to a specific Unit's implementation design | Construction Functional Design |
| Tracking of model elements or contract IDs | `aidlc/spaces/<space>/intents/<dirName>/inception/traceability.md` |
| Hard-to-reverse domain decisions | `aidlc/spaces/<space>/intents/<dirName>/inception/decisions.md` and `inception/decisions/<decision-id>-<slug>.md` |

`aidlc/spaces/<space>/knowledge/glossary.md` is a glossary, not a place for specifications, discussion notes, or implementation decisions.
Do not put implementation details or temporary notes into it.

## Criteria for Creating a decision

Do not create a decision needlessly.
Propose one only when all three of the following are satisfied.

1. The cost of changing it later has meaning.
2. Reading it without the background would leave the question of why it was done that way.
3. Multiple options existed, and a trade-off was actually chosen.

If this condition is not met, updating `domain-notes.md`, `glossary.md`, `domain-map.md`, `context-map.md`, or Construction Functional Design is sufficient.

## DDD Model Elements

The confirmed identifiers are as follows.

| Type | Identifier |
|---|---|
| DDD Module | `DMnnn` |
| Aggregate | `DAnnn` |
| Entity | `DEnnn` |
| Value Object | `DVOnnn` |
| Domain Service | `DSnnn` |
| Domain Event | `DEVnnn` |

Do not guess at identifier rules for types whose identifier rules are not yet confirmed, such as Repository or Factory.
When needed, record them as a candidate or unresolved item in `domain-notes.md`, and decide the identifier rule separately.

## Contracts

Handle contracts as preconditions, invariants, and postconditions.

| Type | Identifier |
|---|---|
| Precondition | `PREnnn` |
| Invariant | `INVnnn` |
| Postcondition | `POSTnnn` |

When adding a contract, record at least one of a requirement ID, use case ID, Unit ID, or Bolt ID as its basis.
If there is no basis, do not promote it to a contract; leave it as a candidate in `domain-notes.md`.

## Prohibitions

- Do not update `CONTEXT.md`.
- Do not create or update `docs/adr/**`.
- Do not mix the repo's development terminology with the target domain terminology handled by the Space (`aidlc/spaces/<space>/`).
- Do not add unresolved terms to `aidlc/spaces/<space>/knowledge/glossary.md`.
- Do not use `aidlc/spaces/<space>/knowledge/glossary.md` as a place for specifications, a scratch pad, or implementation decisions.
- Do not guess at identifiers for BCs, DDD Modules, model elements, or contracts.
- Do not invent unresolved identifier rules such as Repository or Factory.
- Do not make an update that requires the target Intent directory name without the Intent directory name.
- Do not add a new Intent to `aidlc/spaces/<space>/intents/intents.md`.
- Do not create stage artifacts such as `requirements.md`, `stories.md`, `unit-of-work.md`, or `bolt-plan.md`.
- Do not assume `/amadeus-grilling` is called internally. This skill itself handles the questions needed to sharpen the domain model.
- Do not write the repo's development documents or development scripts as runtime references.
