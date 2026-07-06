# AI-DLC v2 Reviewer Mapping

This document defines, as the judgment for Issue #391, how Amadeus DLC handles the `reviewer` and `reviewer_max_iterations` fields found in AI-DLC v2's stage definitions.

References:

- Repository: https://github.com/awslabs/aidlc-workflows/tree/v2
- Reference commit: `d341522e1491db4884e9127004c3882365229218`
- Stage definitions: `core/amadeus-common/stages/**`; reviewer execution procedure: `core/amadeus-common/protocols/stage-protocol.md` §12a

## Decision

Amadeus DLC does not adopt the reviewer sub-agent.

The independent confirmation the reviewer carries out is mapped to existing artifact confirmations.

It maps to the following 3 destinations.

1. **Stage gate.** Each stage's human approval (Approve / Request Changes). In Construction's autonomous mode, the human review and merge of the Bolt PR serves as the approval evidence.
2. **PR review.** Human review of phase PRs and Bolt PRs, plus CI (`npm run test:all`).
3. **`amadeus-validator`.** Structural verification of the artifacts.

## Upstream Reviewer Behavior and Its Correspondence

Upstream's reviewer starts as an independent sub-agent after the stage body produces its artifacts, before the approval gate, and appends `## Review` (READY / NOT-READY) to the artifact. On NOT-READY, the builder addresses the findings and the reviewer re-reviews, up to `reviewer_max_iterations` (default 2). Once the limit is reached, it proceeds to the human gate with the unresolved findings attached. The final judgment is always made by a human.

Amadeus DLC maps this behavior as follows.

| Upstream element | Amadeus DLC's correspondence |
|---|---|
| The reviewer sub-agent's independent confirmation | The stage gate's human approval. In autonomous mode, the Bolt PR review. The structural aspect is covered by `amadeus-validator`. |
| NOT-READY → builder fix → re-review | The loop of Request Changes → checkbox `[R]` → `STAGE_REVISING` → fix → re-presentation at the gate. |
| The `reviewer_max_iterations` limit, and proceeding to the gate with unresolved findings once the limit is reached | The rule that adds Accept as-is as an option once Request Changes has occurred 3 times in a row. |
| The final judgment is always made by a human | The existing gate contract, where the human merge of phase PRs and Bolt PRs serves as the approval evidence. |

## List of Stages That Designate a Reviewer, and Their Mapping

As of the reference commit, the following 11 upstream stages carry `reviewer`. All of them have `reviewer_max_iterations: 2`.

| Upstream stage | Reviewer | Amadeus skill | Mapping destination |
|---|---|---|---|
| ideation/rough-mockups | amadeus-product-lead-agent | `amadeus-ideation-rough-mockups` | Stage gate's human approval, Ideation phase PR review, `amadeus-validator`. |
| inception/requirements-analysis | amadeus-product-lead-agent | `amadeus-inception-requirements-analysis` | Stage gate's human approval, Inception phase PR review, `amadeus-validator`. |
| inception/user-stories | amadeus-product-lead-agent | `amadeus-inception-user-stories` | Stage gate's human approval, Inception phase PR review, `amadeus-validator`. |
| inception/refined-mockups | amadeus-product-lead-agent | `amadeus-inception-refined-mockups` | Stage gate's human approval, Inception phase PR review, `amadeus-validator`. |
| inception/application-design | amadeus-architecture-reviewer-agent | `amadeus-inception-application-design` | Stage gate's human approval, Inception phase PR review, `amadeus-validator`. |
| inception/units-generation | amadeus-architecture-reviewer-agent | `amadeus-inception-units-generation` | Stage gate's human approval, Inception phase PR review, `amadeus-validator`. |
| construction/functional-design | amadeus-architecture-reviewer-agent | `amadeus-construction-functional-design` | Stage gate's human approval (Bolt PR review in autonomous mode), `amadeus-validator`. |
| construction/nfr-requirements | amadeus-architecture-reviewer-agent | `amadeus-construction-nfr-requirements` | Stage gate's human approval (Bolt PR review in autonomous mode), `amadeus-validator`. |
| construction/nfr-design | amadeus-architecture-reviewer-agent | `amadeus-construction-nfr-design` | Stage gate's human approval (Bolt PR review in autonomous mode), `amadeus-validator`. |
| construction/infrastructure-design | amadeus-architecture-reviewer-agent | `amadeus-construction-infrastructure-design` | Stage gate's human approval (Bolt PR review in autonomous mode), `amadeus-validator`. |
| construction/code-generation | amadeus-architecture-reviewer-agent | `amadeus-construction-code-generation` | Build and Test's (Stage 3.6) verification, the Bolt PR's human review and CI, the stage gate. |

Each Amadeus skill's `SKILL.md` states this mapping in its Gate section.

## Reasons for Not Adopting It

1. **To avoid duplicating the gate.** Even upstream, the reviewer does not replace the human gate; the final judgment stays with a human. Amadeus DLC treats the human gate through phase PRs and Bolt PRs as its primary approval contract, and inserting a reviewer sub-agent would not change the approval boundary.
2. **To keep the distribution contract small.** Amadeus skills run in the distributed user's environment. Adding a runtime dependency equivalent to the reviewer agent set (`core/agents/*`) would widen the current distribution contract of a single public entry point plus a skill set.
3. **Because a bound on iteration and handling of the overrun already exist.** The behavior `reviewer_max_iterations` carries — bounding the iteration and handing off to a human while still unresolved — is already satisfied by the existing rule that presents Accept as-is after 3 consecutive Request Changes.

## Verification Means

The verification means used in place of adopting the reviewer are:

- Structural verification of the artifacts by `amadeus-validator` (its trigger conditions and verification scope follow `skills/amadeus-validator/SKILL.md`).
- CI (`npm run test:all`) and human review on phase PRs and Bolt PRs.
- The build-and-test execution record from Build and Test (Stage 3.6), against Code Generation's artifacts.

## Future Reconsideration Conditions

Reconsider adopting the reviewer in a separate Issue if either of the following occurs:

- Amadeus DLC's operational experience confirms a need for a mechanical review before the gate (e.g., frequent gate rejections).
- A separate decision confirms including an agent-execution runtime in the distribution contract.

## Related Documents

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [Skill Language Policy](skill-language-policy.md)
