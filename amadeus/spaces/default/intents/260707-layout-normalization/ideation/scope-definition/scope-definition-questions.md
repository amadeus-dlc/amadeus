# Scope Definition Questions

## Interaction Mode

[Answer]: Chat (Recommended)

Answers are extracted from GitHub issue #610, the approved custom workflow plan, the Intent Capture artifacts, the Feasibility artifacts, and the user's clarification that `packages/setup` is a separate parallel intent.

## Q1. What is the minimum viable scope that delivers value?

A. Produce a decision-ready design record and path-impact inventory; migration remains conditional.
B. Move every root-level directory into `packages/` immediately.
C. Implement `packages/setup`.
D. Rewrite CI.
E. Replace the current build system.
X. Other.

[Answer]: A

The minimum viable scope is a documented repository-layout decision with enough evidence to either migrate safely later or explicitly keep root-level framework directories.

## Q2. What capabilities are must-have?

A. Layout candidate comparison, tradeoff record, path impact inventory, and a release-safe migration plan or no-migration rationale.
B. A new UI.
C. AWS provisioning.
D. Runtime feature changes.
E. External market research.
X. Other.

[Answer]: A

These map directly to the Issue 610 acceptance criteria.

## Q3. What are the dependencies between capabilities?

A. Path-impact inventory must precede migration recommendation; migration planning must precede any code move.
B. Code move must happen before analysis.
C. `packages/setup` must be implemented inside this workflow.
D. CI replacement must precede all work.
E. No dependencies.
X. Other.

[Answer]: A

This workflow should first understand the current packaging, self-promotion, dist, harness, docs, and test assumptions before selecting a layout or migration plan. `packages/setup` is a separate parallel dependency, not a subtask.

## Q4. What sequencing preference should guide the work?

A. Risk-first: inventory and decide before migration.
B. Value-first: move the most visible docs first.
C. Dependency-last: migrate first and fix breakage later.
D. Deadline-first: skip ADR and implement.
E. Random order.
X. Other.

[Answer]: A

Risk-first sequencing matches the issue origin: the installer staged layout intentionally reduced blast radius, and this follow-up exists to make the broader structure decision explicit.

## Q5. Are there hard deadlines?

A. No hard date is specified; safety and traceability outweigh speed.
B. Complete today regardless of risk.
C. Block all other intents until complete.
D. Release-bound date exists but is not recorded.
E. Unknown and blocking.
X. Other.

[Answer]: A

The user explicitly wants this workflow to proceed in parallel with the separate `packages/setup` intent, not block on it.
