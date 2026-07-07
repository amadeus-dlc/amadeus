# Stakeholder Map

## Key Stakeholders

| Stakeholder | Interest |
| --- | --- |
| Repository maintainers | Need a defensible layout decision that keeps source-of-truth boundaries clear and avoids unnecessary churn. |
| Release owners | Need `dist` generation, drift guards, self-promotion, and package release steps to remain deterministic through any migration. |
| Future contributors | Need a layout that is easy to navigate and explains where to edit source, harness-specific surfaces, generated output, and package-specific code. |
| Harness maintainers | Need Claude, Codex, Kiro IDE, and Kiro CLI distribution assumptions to remain explicit and verifiable. |
| Framework users | Benefit indirectly from safer releases and clearer install/package behavior. |

## Decision-Makers And Influencers

| Role | Decision Relationship |
| --- | --- |
| Maintainer / repository owner | Final decision on whether to migrate, continue staged layout, or keep root-level framework directories. |
| Product / delivery owner | Validates that the issue remains scoped to layout normalization and does not reopen unrelated installer implementation work. |
| Architect | Owns the layout alternatives, tradeoff analysis, and migration safety model. |
| Developer | Validates concrete path assumptions in scripts, tests, generated distribution, and self-install trees. |
| Quality / CI owner | Validates that `dist:check`, `promote:self:check`, typecheck, lint, and relevant test profiles still guard the repo after the decision. |

## Communication Requirements

- Link all downstream design artifacts back to [GitHub issue #610](https://github.com/amadeus-dlc/amadeus/issues/610).
- Keep the decision record explicit about whether the result is migration or no migration.
- If migration is recommended, include a staged plan that identifies release/drift guard checkpoints before any directory move.
- If no migration is recommended, state the durable reason root-level `core/` and `harness/` remain the source-of-truth layout.
