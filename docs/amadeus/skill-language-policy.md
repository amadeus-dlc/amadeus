# Skill Language Policy

This document defines the language policy, scope, retained contract, and verification method for Amadeus skill `SKILL.md` files and TypeScript scripts.

It is the basis that the follow-on Issues #400, #401, and #402 reference for Issue #395's decision.

Responsibility split: this document governs the language of skill sources (`SKILL.md`, TypeScript scripts). The language of `docs/amadeus/` documents themselves (canonical text paired with `*.ja.md`) is governed by [Language Policy](language-policy.md).

The staged englishization rollout (#400, #401, #402, B006–B009) is complete.
Per Decision D003 of Intent `260704-v2-parity-completion`, the policy has been revised from a conditional "englishization allowed" stance to "English required."

## Policy

Amadeus skill `SKILL.md` files and TypeScript scripts are English-required.

Under Decision D001 (the adapted-copy strategy from upstream `dist/claude/`), Amadeus skill maintains the upstream English skills with a minimal set of adaptation points (renaming to `amadeus-*`, wiring into `amadeus-grilling`).
Drafting in Japanese and then translating is not adopted, because it would obstruct diffing against the adapted copy.

However, the language of artifacts that Amadeus DLC generates (the body of descriptive artifacts and user-facing gate wording) remains Japanese.

Englishization is not treated as translation work alone.
An englishization pull request states clearly the boundary between translation changes, semantic changes, the promotion flow, and verification results.

## Targets requiring English

| Target | Treatment |
|---|---|
| `core/skills/amadeus*/SKILL.md` | English-required. |
| `.agents/skills/amadeus*/SKILL.md` | Reflected in English when propagated from the source skill through the promotion flow. |
| `core/skills/amadeus*/**/*.ts`, `.agents/skills/amadeus*/**/*.ts` | English-required. Japanese strings emitted as artifacts (gate wording, the condition and rationale text of verification results, and the like) are out of scope. |
| `agents/openai.yaml` | Updated as needed when the `SKILL.md` frontmatter description changes. |

## Targets that stay Japanese

| Target | Reason |
|---|---|
| `amadeus/**/*.md` | Amadeus DLC artifacts are treated as Japanese Markdown. |
| `core/skills/amadeus*/templates/**/*.md` | Keeps the language of generated artifacts Japanese. |
| `.agents/skills/amadeus*/templates/**/*.md` | Keeps the language of generated artifacts Japanese at the promoted destination too. |
| `.kiro/specs/**/*.md` | Workspace rules require Japanese generation. |
| `openspec/**/*.md` | Workspace rules require Japanese generation. |
| User-facing gate wording | Amadeus handles conversation and approval decisions in Japanese. |

## Retained contract

The canonical name and definition in `CONTEXT.md` take priority.

Even in an englishized `SKILL.md`, the meaning of Amadeus DLC, Amadeus, Intent, Unit, Bolt, Gate, Traceability, Domain Map, and Context Map does not change.

Amadeus DLC-specific contracts are not dropped on the grounds of aligning with AI-DLC v2.

The retained contract is as follows.

- The single public entry point `amadeus`
- Artifact placement under `amadeus/`
- State management via `amadeus-state.md`
- Structural verification via `amadeus-validator`
- The question protocol via `amadeus-grilling`
- Human gates via phase PRs and Bolt PRs

## Promotion flow

When a source skill changes, reflect it to the promoted destination using `dev-scripts/promote-skill.ts`.

Do not hand-edit only the promoted `.agents/skills/amadeus*/SKILL.md`.

To update an existing promoted destination, use the following.

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
```

After promotion, run at least the following.

```sh
npm run test:it:promote-skill
```

## Verification

An Amadeus skill englishization pull request runs at least the following.

```sh
npm run test:it:promote-skill
npm run test:all
```

When the `SKILL.md` frontmatter description changes, also check whether `agents/openai.yaml` needs updating.

The pull request description records the following.

- The target Issue
- The target Intent
- Which skills were englishized
- That Japanese-retained targets were not changed
- How the source skill and the promoted skill were synchronized
- Which verifications were run

## Completion evidence

The completion evidence for Issue #395 is the merge of the corresponding pull request or an explicit Issue close.

The follow-on Issues #400, #401, and #402 proceed to englishization work or difference-response ordering decisions on the premise of this policy.

## Related documents

- [Language Policy](language-policy.md)
- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)

The staged englishization plan (the former rollout plan, #402) is complete and was retired in #562. All 42 skills' `SKILL.md` files are englishized; the only Japanese that remains is in 3 legitimately retained spots (user-facing question examples, Japanese output format descriptions, and quoted Japanese template field names). Verification is a cross-repo grep for Japanese characters; see git history (`git log -- docs/amadeus/skill-englishization-rollout-plan.md`) for the retirement record.
