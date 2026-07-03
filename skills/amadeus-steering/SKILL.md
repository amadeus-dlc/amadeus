---
name: amadeus-steering
description: >-
  Initialize, inspect, or repair the Amadeus workspace Space
  (`aidlc/spaces/<space>/`) in greenfield or brownfield mode. Use when there is
  a new project with no `aidlc/`, when adding Amadeus to an existing project,
  or when the memory, knowledge, glossary, and intents index foundation must
  be established before creating an Intent. Do not use this to advance an
  individual Intent's lifecycle (Ideation, Inception, Construction).
---

# amadeus-steering

## Purpose

Create the Amadeus DLC Space.

The Space is `aidlc/spaces/<space>/`, holding a way shared across Intents
(`memory/`), domain knowledge (`knowledge/`), codebase knowledge (`codekb/`),
and Intent records (`intents/`). The default Space name is `default`. Do not
handle an individual Intent's requirements, use cases, Units, Bolts, or Tasks.

Place the team's ways of working in `memory/` (`org.md`, `team.md`,
`project.md`). Place domain knowledge (terminology, actors, external systems,
background, Domain Map, Context Map) in `knowledge/`.

The Domain Map and Context Map are shared artifacts updated from approved
stage artifacts in Inception and Construction. This skill creates only an
empty Domain Map and Context Map. Do not create Subdomains, Bounded Contexts,
inter-context dependencies, a detailed Domain Model, or contracts.

## Inputs

- The working directory to inspect.
- Whether it is greenfield or brownfield.
  - greenfield: `aidlc/` does not exist, or Amadeus artifacts are created from
    scratch.
  - brownfield: `aidlc/`, or existing requirements, design, README, or
    business documents, exist.
- The execution mode. Default to `guided` if not specified.
- The product purpose, key actors, external systems, known terminology, and
  known constraints, if known.

Write unknown inputs into artifacts as 未確認. Do not treat a guess as
confirmed.

Treat Amadeus itself as brownfield when it is the target workspace. Do not
create a self-development-only mode; instead inspect or repair the Space
using existing materials, the existing `aidlc/`, GitHub Issues, docs,
validator results, example verification, and CI results as reference
sources.

## How to Write 未確認

Do not leave blanks. Write an unknown value as `未確認`, and leave the
question that needs confirmation in the state or the body text.

However, do not guess an identifier and create an entry for something whose
existence itself is unconfirmed.

- For purpose or key actors, it is acceptable to place at least one `未確認`
  line as an entry point for the Space.
- For external systems and Intents, if existence is unconfirmed, do not
  create a row; instead write below the table that it is unconfirmed.

This distinction keeps the necessary entry points while not treating an
external boundary or Intent of unknown existence as something that was
created.

## Templates

Use a template when creating an artifact for the first time.

Priority order:

1. `aidlc/spaces/<space>/memory/templates/space/`
2. `templates/space/` bundled with this skill.

Treat `memory/templates/` as a project-specific override. If it does not
exist, use the standard templates in `templates/space/`. If neither exists,
stop before creation, treating it as a missing template.

Replace a template's `<...>` placeholder with a confirmed value or `未確認`.
Do not guess a row for an external system or Intent whose existence itself is
unconfirmed.

## Execution Modes

### `guided`

The default mode. Before creation, ask the minimum necessary questions and
fill in the Space's initial values.

Ask questions using `/amadeus-grilling`. Even when multiple open points
remain, ask one question at a time rather than listing them all at once.
Target about 5 questions. Continue asking beyond that target if a judgment
necessary for Space creation is still undecided. When continuing beyond the
target, briefly state why further confirmation is needed. Ask only questions
necessary to create the artifacts. Do not ask about anything already known
from existing materials or the conversation.

Candidate first questions for greenfield:

- What is the main purpose this product should achieve?
- Who are the main users or stakeholders?
- Are there external system integrations?
- Are there constraints or prohibitions that must be observed?
- What are the 1 to 3 main business domains, stated briefly?

If you asked questions, do not create artifacts on the spot; wait for the
user's response. Create `aidlc/` only after receiving the response. Create an
unanswered item as `未確認` only when the user explicitly directs you to
continue without answering. In that case, leave the question that needs
confirmation among the unconfirmed items.

### `discovery`

The mode for brownfield. Extract the range that can be drafted from the
existing README, design documents, business documents, and `aidlc/`. Then ask
questions only about contradictions or gaps.

Target about 5 questions. Continue asking beyond that target if a judgment
necessary for Space creation is still undecided. When continuing beyond the
target, briefly state why further confirmation is needed. Write content with
weak grounding in existing materials as `未確認` rather than treating it as
confirmed.

When questions are needed, present the following and wait for a response:

- Items that could be drafted from existing materials.
- The files used as the basis for the draft.
- Items that are contradictory or missing.
- About 5 questions.

If you asked questions, do not add artifacts on the spot. Add only the
missing Space artifacts after receiving the response.

### `scaffold-only`

Use only when the user explicitly directs it. Create the minimal Space
artifacts without asking questions.

Do not leave blanks. Write `未確認` for an unknown value. Leave a question
that a human should answer later among the unconfirmed items.

## Artifacts

For greenfield, create at least the following (`<space>` defaults to
`default`):

- `aidlc/spaces/<space>/memory/org.md`
- `aidlc/spaces/<space>/memory/team.md`
- `aidlc/spaces/<space>/memory/project.md`
- `aidlc/spaces/<space>/knowledge/glossary.md`
- `aidlc/spaces/<space>/knowledge/actors.md`
- `aidlc/spaces/<space>/knowledge/external-systems.md`
- `aidlc/spaces/<space>/knowledge/background.md`
- `aidlc/spaces/<space>/knowledge/domain-map.md`
- `aidlc/spaces/<space>/knowledge/context-map.md`
- `aidlc/spaces/<space>/intents/intents.json` (an empty registry `[]`)
- `aidlc/spaces/<space>/intents/intents.md`

`aidlc/active-space` and `intents/active-intent` are cursors; this skill does
not create them. Record scaffolding is created by Initialization (the
`amadeus` entrypoint).

For brownfield, read existing artifacts and add only the missing ones. Do not
overwrite existing body text, decisions, terminology, or identifiers.

## Self-Development Bootstrap and Regeneration Comparison

When treating Amadeus itself as brownfield, assume, regardless of execution
mode, that the first `aidlc/` may serve as a bootstrap.

When rebuilding the Space with a promoted skill, evacuate the pre-rebuild
Space to `.aidlc-snapshots/previous/`; the evacuated copy stays outside git
management and only the most recent generation is kept. If
`.aidlc-snapshots/previous/` already exists before regeneration, delete the
old evacuated copy before evacuating the current Space.

Do not make the evacuated copy itself a permanent artifact. Summarize only
the adoption decision from the diff review into the existing artifacts of the
adopted Space. Record it in `knowledge/background.md` for a decision about
the whole self-development cycle, or in the target phase's `decisions.md` or
`decisions/**` for a regeneration of a specific Intent.

The diff review summary must include the comparison source, the comparison
target, the reason for comparison, the main differences, the adoption
decision, and any necessary unconfirmed items.

## Procedure

1. Confirm the working directory.
2. Confirm whether `aidlc/` and the target Space exist. Resolve the Space
   from `aidlc/active-space` (or `default` if absent).
3. Decide the execution mode. Default to `guided` if not specified.
4. For brownfield or `discovery`, read the existing README, design documents,
   business documents, and `aidlc/`, and respect existing reference sources.
5. When Amadeus itself is the target workspace and a promoted skill is
   rebuilding the Space, apply the Self-Development Bootstrap and
   Regeneration Comparison procedure before regenerating.
6. For `guided` or `discovery`, ask about only the missing information,
   targeting about 5 questions. If you asked questions, wait for the
   response before proceeding.
7. If `aidlc/spaces/<space>/` does not exist, create `memory/`, `knowledge/`,
   and `intents/`.
8. Create the Space's required artifacts.
9. Create the Domain Map and Context Map as empty tables with no adopted
   information.
10. Write unconfirmed information as `未確認`; do not leave it blank.
11. Do not create Intents. When an individual Intent becomes necessary, hand
    off to `amadeus`.
12. If the promoted `amadeus-validator` is available, validate only the
    overall artifacts.

## Minimum Structure per File

### `memory/org.md`

Write the Amadeus DLC's organizational defaults.

- `方針`
- `禁止事項`
- `判断基準`

### `memory/team.md`

Write the team's ways of working. This overrides org.md's defaults.

- `方針`
- `禁止事項`
- `判断基準`

### `memory/project.md`

Write project-specific decision material. This overrides the content of
team.md.

- `目的` (table columns: `識別子`, `目的`, `期待価値`, `成功指標`, `状態`)
- `コア能力`
- `主要ユースケース`
- `価値仮説`
- `アーキテクチャ`
- `主要技術`
- `開発標準`
- `開発環境`
- `主要技術判断`
- `編成方針`
- `ディレクトリパターン`
- `命名規約`
- `依存関係の整理`
- `コード構成原則`

Write the product's capabilities, technology, and structure as patterns to
use in later decisions, not as an exhaustive inventory.

### `knowledge/glossary.md`

- `用語`
- `避ける語`
- `禁止ワード`

Do not mix an unconfirmed term with confirmed terms. If it is not yet
confirmed, write the grounds as `未確認` in the term table. If an avoided
term or prohibited word is not yet confirmed, do not register `未確認` itself
as an avoided term or prohibited word. Either leave that table as a header
only, or write "現時点ではなし。" below the table.

### `knowledge/actors.md`

- `一覧`

Table columns:

- `識別子`
- `名前`
- `役割`
- `関心`
- `状態`

### `knowledge/external-systems.md`

- `一覧`

Table columns:

- `識別子`
- `名前`
- `役割`
- `接点`
- `状態`

Even when there are no external systems, do not guess and create `EXT001`.
The list table may be left empty.

### `knowledge/background.md`

- `背景`
- `前提`
- `未確認事項`

### `intents/intents.json`

This is the Intent registry. Initialize it as an empty array `[]`.
Initialization (the `amadeus` entrypoint) adds rows.

### `intents/intents.md`

This is a generated file. Place a generation marker at the top, and
regenerate it from the `<dirName>.md` files under the same `intents/`
directory using
`bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts
<workspace>`.

- `一覧`
- `依存関係`

`一覧` table columns:

- `識別子`
- `概要`
- `依存`
- `詳細`

`依存関係` table columns:

- `インテント`
- `依存`
- `理由`

If there are no Intents yet, do not create a row in the table.

## Prohibitions

- Do not create an individual Intent record directory.
- Do not create stage artifacts such as `requirements.md`, `unit-of-work.md`,
  or `bolt-plan.md`.
- Do not add unconfirmed domain vocabulary as a confirmed term.
- Do not replace an existing brownfield artifact without grounds.
- Do not renumber an existing identifier.
- Do not decide the installer, distribution method, or backward-compatibility
  policy.
- Do not write the repo's development documents or development scripts as
  runtime references.
- Do not create a self-development-only steering mode or dedicated
  artifacts.

## Next Skill

- To start a new Intent, or to advance an existing Intent: `amadeus`
- To validate artifact structure: `amadeus-validator`
