---
name: amadeus-validator
description: >-
  Validate Amadeus's runtime structure in the distributed user environment.
  Use this to check Amadeus artifacts, Intent, Event Storming, any Grilling
  Decision Trail, Domain Map, Context Map, Upstream/Downstream, Organization
  Pattern, Integration Pattern, and Construction artifacts without depending
  on repo root development scripts, or after creating or updating artifacts
  under `aidlc/`.
---

# amadeus-validator

## Purpose

Confirm, in the distributed user environment, that Amadeus artifacts satisfy
the minimum structural conditions referenceable at runtime.

This skill is the entry point for the Amadeus Validator.
It is not the repo root's package scripts or `scripts/**`, which serve as the
Development Validator.

## Invocation Contract

This skill has no mechanism to auto-start by detecting file updates under
`aidlc/`.
Do not assume file watching, Git hooks, editor extensions, or external
automation.

When an agent creates or updates artifacts under `aidlc/`, use this skill
explicitly after the work to validate. If the target Intent directory name is
known, also specify the target Intent when validating.

## Internal References

The Validator's artifact contract and domain model are described in the
following references.

- [artifacts validation](references/artifacts.md)
- [Domain Map and Context Map validation](references/domain-map.md)
- [Validator Domain Model](references/domain-model.md)

## Runtime Dependencies

- Bun.
- Leave TypeScript execution to Bun.

Report `blocked` if Bun is unavailable.
Do not install dependency packages for validation.

## Bundled Scripts

This skill bundles a script that regenerates the shared index `intents.md`
from its underlying modules.
`aidlc/spaces/<space>/intents/intents.md` is a generated artifact; regenerate
it with this script instead of hand-editing it.

```sh
bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts <workspace>
```

Adding `--check` confirms an exact match between the expected generated
content and the actual file, and exits with 1 on a mismatch.
The validator's "Index generation consistency" check reuses this generation
logic to judge.

## Inputs

- The working directory to validate.
- The target Intent directory name, when needed.

If the target Intent directory name is not specified, validate the overall
artifacts only.
If the target Intent directory name is specified, validate
`aidlc/spaces/<space>/intents/<dirName>/` (the record) in addition to the
overall artifacts.

## Reference Sources to Read

Read in the following order.

1. `CONTEXT.md`
2. `aidlc/spaces/<space>/memory/org.md`
3. `aidlc/spaces/<space>/memory/team.md`
4. `aidlc/spaces/<space>/memory/project.md`
5. `aidlc/spaces/<space>/knowledge/*.md` (`glossary.md`, `actors.md`,
   `external-systems.md`, `background.md`, etc.)
6. `aidlc/spaces/<space>/intents/intents.json`
7. `aidlc/spaces/<space>/intents/intents.md`
8. `aidlc/spaces/<space>/intents/active-intent`. Read only if it exists.
9. `aidlc/spaces/<space>/knowledge/event-storming/*.md` and
   `aidlc/spaces/<space>/knowledge/event-storming/*/state.json`. Read only if
   they exist.
10. `aidlc/spaces/<space>/knowledge/event-storming/*/grillings.md` and
    `aidlc/spaces/<space>/knowledge/event-storming/*/grillings/*.md`. Read
    only if they exist.
11. `aidlc/spaces/<space>/knowledge/domain-map.md`
12. `aidlc/spaces/<space>/knowledge/context-map.md`
13. `aidlc/spaces/<space>/intents/<dirName>.md`. Read only if the target
    Intent directory name is specified.
14. `aidlc/spaces/<space>/intents/<dirName>/aidlc-state.md`. Read only if the
    target Intent directory name is specified.
15. `aidlc/spaces/<space>/intents/<dirName>/audit/audit.md`. Read only if it
    exists.
16. `aidlc/spaces/<space>/intents/<dirName>/{ideation,inception,construction}/grillings.md`
    and
    `aidlc/spaces/<space>/intents/<dirName>/{ideation,inception,construction}/grillings/*.md`.
    Read only if they exist.
17. `aidlc/spaces/<space>/intents/<dirName>/event-storming/*/grillings.md` and
    `aidlc/spaces/<space>/intents/<dirName>/event-storming/*/grillings/*.md`.
    Read only if they exist.
18. The mandatory artifacts under the phase directory required by the target
    Intent's `aidlc-state.md` Stage Progress. Read only if they exist.

If a reference source does not exist, include that fact in the result.
Do not fill in a missing reference source by guessing.

## Validation Scope

Confirm at least the following.

- The Amadeus artifact root is `aidlc/`, and the target Space exists under
  `aidlc/spaces/`.
- `aidlc/spaces/<space>/memory/org.md`, `aidlc/spaces/<space>/memory/team.md`,
  and `aidlc/spaces/<space>/memory/project.md` exist.
- `aidlc/spaces/<space>/knowledge/` exists.
- `aidlc/spaces/<space>/intents/` exists.
- `aidlc/spaces/<space>/intents/intents.json` exists and can be interpreted
  as the Intent registry.
- `aidlc/spaces/<space>/intents/intents.md` exists and satisfies the
  conditions in [artifacts validation](references/artifacts.md) and Index
  generation consistency (an exact match with the content derived by
  IndexGenerate).
- If `aidlc/spaces/<space>/intents/active-intent` exists, it points to a
  record in the registry.
- `aidlc/spaces/<space>/knowledge/domain-map.md` exists, and its Subdomain
  and Bounded Context `adopted`, `retired`, and evidence links can be
  validated.
- `aidlc/spaces/<space>/knowledge/context-map.md` exists, and its Upstream
  Context, Downstream Context, Organization Pattern, Integration Pattern,
  `adopted`, `retired`, and evidence links can be validated.
- The Context Map's `Downstream` and `Upstream` reference Bounded Contexts in
  the Domain Map.
- The target Intent's module file exists and has the `概要`, `依存`, and
  `目標プロファイル` headings plus the target profile table.
- The target Intent's record has no retired legacy-placement artifacts
  (such as `state.json`) directly under it that should instead be placed
  under a phase directory.
- The target Intent's `aidlc-state.md` exists, and its Project Information,
  Scope Configuration, Phase Progress, Stage Progress, and Current Status
  content are validated as a v2-compatible lifecycle contract, together with
  consistency between the scope's execution targets, the stage checkbox
  states, the event consistency of `audit/audit.md`, Bolt records, and the
  mandatory artifacts of completed stages.
- Event Storming artifacts, level, and `nextRecommendedSkill` (`amadeus` or
  `amadeus-domain-modeling`) are validated.
- When `grillings.md` or `grillings/` exists in an Event Storming or Intent
  phase directory, both are present together.
- When a Grilling Decision Trail exists in an Event Storming or Intent phase
  directory, validate the `grillings.md` listing, the session file names,
  the session's recorded questions, `確認したいこと`, `確認が必要な理由`,
  `推奨回答`, `推奨理由`, `ユーザー回答`, the confirmed decision, the
  reflection target, that the reflection target stays inside the target
  root, that an active entry has no replacement, and that a superseded entry
  has a replacement.

## Validation Procedure

Validate in the following order.

1. Confirm that Bun is available.
2. Determine the target Intent directory name.
   - If the user specified an Intent directory name, treat only that
     directory name as the target Intent.
   - If no Intent directory name was specified, validate only the overall
     artifacts.
   - Do not expand the validation target to all Intents on your own based on
     `aidlc/spaces/<space>/intents/intents.md`.
3. Run the bundled `validator/AmadeusValidator.ts`.

When validating only the overall artifacts:

```sh
bun run <skill-dir>/validator/AmadeusValidator.ts <workdir>
```

When also validating a target Intent directory name:

```sh
bun run <skill-dir>/validator/AmadeusValidator.ts <workdir> <dirName>
```

`AmadeusValidator.ts` internally builds an inspection ledger and outputs the
`pass`, `fail`, or `blocked` judgment and any gaps as Japanese Markdown.
Base the final report on this output.

## Judgment

Give the judgment as one of `pass`, `fail`, or `blocked`.

`pass` means the validation target satisfies the minimum structural
conditions referenceable at runtime.
`fail` means the artifacts contain a contradiction or a missing required
item.
`blocked` means the validation target or the material needed for judgment is
insufficient.

Do not treat `pass` alone as passing the gate.
Do not output `waived` as a validation result.

## Validation Results and Learning Candidates

The validator's result is structural detection.
Treat `pass`, `fail`, and `blocked` as the result of detecting artifact
structure, required items, gaps, and contradictions that are referenceable
at runtime.
The validator's `pass` is not content approval.
Do not decide decision review's question necessity or adoption decisions from the validator's result alone.

The evaluator's result is quality evaluation; keep it separate from the validator's judgment.
Even when the validator's or evaluator's result shows a learning reusable
across multiple Intents, do not auto-promote it into Steering knowledge,
Domain Map, or Context Map.
Classify it, by phase skill or human judgment, as one of
`current_phase_update_required`, `upstream_feedback_required`,
`steering_knowledge_candidate`, `domain_map_candidate`,
`context_map_candidate`, `follow_up_issue_candidate`,
`follow_up_intent_candidate`, or `no_learning_action`.

## Output

Compile the result in Japanese, in the following form.

```md
# Amadeus Validator 結果

## 判定

pass | fail | blocked

## 検査サマリ

| 検査カテゴリ | pass | fail | blocked |
|---|---:|---:|---:|
| <カテゴリ> | <件数> | <件数> | <件数> |

## 確認対象

| 対象カテゴリ | 件数 |
|---|---:|
| <カテゴリ> | <件数> |

### <対象カテゴリ>

- <確認したファイル>

## 満たしている条件

- <条件>

## 検査対象外

- <機械検査の対象外にした項目。なければ「なし」>

## 不足または矛盾

- <不足または矛盾。なければ「なし」>

## 次に使う Amadeus skill

- <推奨する次の skill。なければ「なし」>
```

## Prohibitions

- Do not treat repo root's `scripts/**` as the storage location or
  execution entry point for the Amadeus Validator.
- Do not treat repo root's package scripts as the validation entry point in
  the distributed user environment.
- Do not use anything other than the bundled `validator/AmadeusValidator.ts`
  as the runtime validation entry point.
- Do not install dependency packages for validation.
- Do not decide the Installer's connections, distribution unit, or
  post-install execution order.
- Do not change Intent state or artifact state.
- Do not fill in parent references or missing files by guessing.
