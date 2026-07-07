# Intent Capture Questions

## Interaction Mode

[Answer]: Chat (Recommended)

The stage is using the existing GitHub issue, the approved custom scope, and this conversation as the source conversation. No separate questionnaire was required.

## Q1. What business problem are we solving?

A. Repository layout responsibility boundaries are mixed, making the source-of-truth model harder to explain and maintain.
B. Runtime behavior is broken.
C. The npm package cannot be published.
D. The documentation site is missing marketing content.
E. The test suite is too slow.
X. Other.

[Answer]: A

Issue 610 frames the problem as a structural design concern: `packages/setup/` was introduced while `core/`, `harness/`, `dist/`, and `scripts/` remained root-level. That staged layout lowered initial installer risk, but it leaves package-owned and root-owned responsibilities mixed.

## Q2. Who is the customer and what pain are they experiencing?

A. Maintainers and future contributors who must understand, package, test, and evolve the multi-harness framework layout.
B. End users installing Amadeus into their own projects.
C. External buyers evaluating a SaaS feature.
D. Operations teams managing production incidents.
E. Security reviewers auditing runtime permissions.
X. Other.

[Answer]: A

End users may benefit indirectly from clearer packaging and safer releases, but the primary customer is the maintainer/contributor group that owns layout changes, generated `dist/` parity, self-promotion, tests, and docs.

## Q3. What does success look like?

A. A design record compares layout candidates, inventories path impact, and defines either a safe staged migration plan or an explicit no-migration rationale.
B. All root-level directories are moved immediately.
C. `dist/` is deleted from the repository.
D. CI is replaced.
E. The installer scope is reopened and merged into this intent.
X. Other.

[Answer]: A

The acceptance criteria require a comparison of repo layout candidates, tradeoffs among status quo, staged layout, and full workspace normalization, impact inventory for packaging/self-promotion/distribution/harness/tests/docs assumptions, and a release-safe migration plan if migration is selected.

## Q4. What triggered this initiative now?

A. The initial installer package staged layout intentionally deferred the broader workspace/package normalization decision.
B. A production outage occurred.
C. A dependency security advisory was published.
D. A user requested a UI feature.
E. The project changed runtime languages.
X. Other.

[Answer]: A

The issue is explicitly blocked by the `260706-installer-impl` staged layout decision. It was reopened after confirmation that this is a real structural follow-up, not merely a discarded option from a prior question.

## Q5. What is the initial scope signal?

A. Custom design workflow: brownfield repository architecture analysis with ADR-first output and optional migration planning.
B. Stock bugfix.
C. Stock feature.
D. Stock infra.
E. Stock poc.
X. Other.

[Answer]: A

The approved composed scope is `workspace-layout-normalization`: 16 stages, Standard depth, focused on design, impact analysis, implementation planning, and verification while skipping market, UI, infrastructure, and operation stages.
