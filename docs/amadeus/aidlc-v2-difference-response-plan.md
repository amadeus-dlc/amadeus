# AI-DLC v2 Difference Response Plan

This document defines, as the judgment for Issue #401, the response order and PR boundaries for #391, #392, #393, and #394, which handle differences from AI-DLC v2.

It builds on Issue #395's [Skill Language Policy](skill-language-policy.md) and Issue #400's English conversion of representative skills.

## Policy

Response to differences from AI-DLC v2 splits English-conversion PRs from semantic-change PRs.

Contracts specific to Amadeus DLC are not dropped merely to confirm correspondence with AI-DLC v2.

Each PR states the following in its description:

- The target Issue.
- Whether it is an English-only conversion, or includes a semantic change.
- The items adopted from AI-DLC v2.
- The items retained as Amadeus DLC's intentional differences.
- How the source skill and its promoted counterpart are synchronized.
- The verification that was run.

## Response Order

| Order | Issue | Category | Reason to handle it first | PR boundary |
|---:|---|---|---|---|
| 1 | #391 Handling the reviewer designation | Semantic-change judgment | How reviewer is handled affects the vocabulary of a stage skill's approval, confirmation, and rejection. | List the AI-DLC v2 stages that designate a reviewer, and decide per stage whether Amadeus DLC runs the reviewer or maps it to an existing artifact confirmation. Does not include implementing any reviewer agent. |
| 2 | #393 Mapping sensor and Learn | Semantic-change judgment | Sensor and Learn, like the reviewer judgment in #391, concern confirmation before and after stage completion and the recording of insights. | Map each sensor's verification target to `amadeus-validator`, build and test, or stage-specific artifacts. Specify where Learn is recorded — `memory.md`, `decisions.md`, `traceability.md`, or `grillings`. Does not include adding a mechanism equivalent to `.amadeus-sensors/`. |
| 3 | #392 Build and Test failure handling | Semantic-change judgment | Build and Test's failure handling inherits the confirmation and insight-recording boundaries decided in #391 and #393. | Decide whether to keep the current halt-and-ask and Code Generation separation of responsibilities, or align with AI-DLC v2. If kept, record the reason in the lifecycle docs and the skill. Does not include implementing automatic retry of fixes. |
| 4 | #394 Reason Operation phase is out of scope | Boundary clarification | Operation phase is currently out of Amadeus DLC's scope, and it is natural to document the boundary after the Construction-level judgments in #391, #392, and #393. | Explain the reason Operation phase is out of scope, from the viewpoints of the artifact contract, gate, validator, and PR boundary. Does not include adding or adopting any Operation skill. |

## PR Description Requirements per Issue

| Issue | Must state in the PR description |
|---|---|
| #391 | The list of AI-DLC v2 stages that designate a reviewer. How each stage is handled on the Amadeus DLC side. The reason for not adopting the reviewer and the verification means used instead. |
| #393 | The verification target for each sensor. Where Learn is recorded. The reason for not adopting a given sensor or Learn item. |
| #392 | The contract that Build and Test's failure handling follows. What is retained in `build-test-results.md` (upstream: `test-results.md`). The relationship to the Bolt gate. |
| #394 | The reason Operation phase is currently out of scope. The list of AI-DLC v2 Operation skills and how Amadeus handles them. A separate Issue or roadmap for handling it in the future. |

## Verification Commands

Each PR runs the following, according to its change scope.

```sh
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
```

A PR that changes an Amadeus skill also runs the following.

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run test:it:promote-skill
```

When multiple skills are changed, synchronize every changed source skill through the promotion flow.

## Avoiding Conflicts

Do not mix #391, #392, #393, and #394 with #402, which handles the phased englishization of the remaining skills.

However, when a PR for #391 through #394 updates a target skill, that PR may also bring only the `SKILL.md` files it touches into the already-converted English style.

Even then, the PR description explains the English-conversion part and the semantic-change part separately.

## Completion Condition for #401

Issue #401 is complete once the PR containing this document is merged and the response order and PR boundaries for #391, #392, #393, and #394 become traceable.

The individual closing of #391, #392, #393, and #394 is not included in #401's completion condition.
