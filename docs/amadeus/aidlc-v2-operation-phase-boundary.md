# AI-DLC v2 Operation Phase Boundary

This document defines, as the judgment for Issue #394, the reason and the boundary for treating AI-DLC v2's Operation phase skills as out of scope in Amadeus DLC.

**Positioning note**: This document is a record of the judgment made at the time of #394. The current state of Operation is described by three layers: the scope-grid declares Operation stages per scope (CONDITIONAL adoption per AMADEUS.md); the current `amadeus-validator` requires `[S]` for every Operation stage in every workspace regardless of scope — executing Operation is a future adoption (see "Entry Point for Future Adoption" below); and the default space additionally treats Operation as out of scope via workspace steering (`memory/phases/operation.md`). The reasoning sections below (artifact contract, gate, validator, PR boundary) remain valid as the basis for that steering judgment.

References:

- Repository: https://github.com/awslabs/aidlc-workflows/tree/v2
- Reference commit: `d341522e1491db4884e9127004c3882365229218`
- Operation stage definitions: `core/amadeus-common/stages/operation/**` (7 stages)

## Decision

At the time of Issue #394, Amadeus DLC kept Operation phase out of scope.

At that time, it carried only the record's scaffold (the `operation/` directory) and the 7 lines of Stage Progress. At the time of #394, Amadeus kept every Operation stage out of its execution scope, recording each as `[S]` (`SKIP: out of Amadeus scope`).

At that time, Amadeus had not added or adopted any Operation skill.

The current basis for the default space's out-of-scope treatment is described in the positioning note above and in [Lifecycle Contract Overview](lifecycle/overview.md).

## Reasons for Being Out of Scope

### Artifact contract viewpoint

Amadeus DLC's artifacts are Japanese Markdown under `amadeus/` (design, plans, decisions, traceability), and they stay self-contained within the repository.

Operation stage's artifacts presuppose acting on a real environment (deployment, provisioning, monitoring configuration) and observing it (incidents, measured performance, feedback). These cannot preserve their truthfulness through repository-internal records alone, so they fall outside the artifact contract.

### Gate viewpoint

Amadeus DLC's approval is made up of stage gates and the human merge of phase PRs and Bolt PRs, and its approval target is the repository diff.

Approving a deployment execution or an incident response cannot be expressed through a PR merge; it requires a separate approval mechanism such as environment permissions or an operational procedure. Loading Operation onto the existing gate contract breaks the correspondence between the approval target and the approval means.

### Validator viewpoint

`amadeus-validator` is a contract that mechanically verifies `amadeus/`'s structure in the distributed user's environment, and its `pass` means "the minimum structural conditions referenceable at execution time are satisfied."

The validator has no means to verify real-environment state such as deployment results or monitoring configuration. Including Operation in its scope would change the meaning of `pass` from structural-condition satisfaction. Accordingly, the current implementation requires `[S]` for every Operation stage in every workspace regardless of scope; lifting this is part of the future adoption below.

### PR boundary viewpoint

Amadeus DLC's lifecycle is self-contained within phase PRs and Bolt PRs.

Operation's execution unit is a release or an operational event, and it does not align with a PR boundary. Including work that never becomes a PR in the lifecycle breaks the current tracking model, which fixes completion evidence at merge.

## Upstream Operation Skill List and How Amadeus Handles Them

| Upstream Operation stage | How Amadeus handles it |
|---|---|
| Deployment Pipeline | Out of scope. Pipeline design up to Stage 3.4 Infrastructure Design's `cicd-pipeline.md` and Stage 3.7 CI Pipeline's `ci-config.md` and `quality-gates.md` is handled. Building and running the actual pipeline is not handled. |
| Environment Provisioning | Out of scope. Deployment architecture design up to Stage 3.4's `deployment-architecture.md` is handled. Actual provisioning is not handled. |
| Deployment Execution | Out of scope. It is the execution act itself and has no corresponding design artifact. |
| Observability Setup | Out of scope. Design of monitoring items and notifications up to Stage 3.4's `monitoring-design.md` is handled. Actual configuration is not handled. |
| Incident Response | Out of scope. Learnings from an incident can be captured through the §13 learnings ritual (`amadeus-learnings.ts`), taking Issues, PRs, and CI results as input. The response work itself is not handled. |
| Performance Validation | Out of scope. Performance requirements and design are handled by Stage 3.2 NFR Requirements and 3.3 NFR Design; test-execution records are handled by Build and Test's `performance-test-instructions.md` and `build-test-results.md`. Verification in a real environment is not handled. |
| Feedback & Optimization | Out of scope. The intake for feedback is the `amadeus` Intake's merge judgment and the scope backlog, plus the §13 learnings ritual. Improvement work is filed as a new Intent. |

## Entry Point for Future Adoption

Adopting Operation phase is not done merely by updating this document.

It is handled separately, through the following steps.

1. Consideration of adoption starts by filing a dedicated GitHub Issue (treated as a roadmap item).
2. Once adoption is confirmed, it is carried out as a new Intent with human approval, through the `amadeus` Intake.
3. At that point, re-evaluate this document's reasoning from each of the 4 viewpoints — artifact contract, gate, validator, and PR boundary — and also judge whether `docs/backward-compatibility.md` needs an entry.

## Related Documents

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [Lifecycle Contract Overview](lifecycle/overview.md)
- [Skill Language Policy](skill-language-policy.md) (its retained contract includes Operation phase's out-of-scope boundary)
