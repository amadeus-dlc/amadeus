# Feasibility Questions

## Interaction Mode

[Answer]: Chat (Recommended)

Answers are extracted from Issue 610, the approved custom scope, current repository inspection, and existing project/team practices.

## Q1. What existing systems must this integrate with?

A. The existing root-level packager, self-promotion flow, generated `dist/` trees, harness manifests, tests, docs, and Amadeus runtime state.
B. A production web API.
C. AWS account infrastructure.
D. A payment processor.
E. A mobile application release train.
X. Other.

[Answer]: A

The relevant integration surface is internal to this repository. `scripts/package.ts` uses root-level `core/` and `harness/` as authored inputs and root-level `dist/` as committed generated output. `scripts/promote-self.ts` copies generated Claude/Codex distributions back into root-level `.claude/`, `.codex/`, and `.agents/`.

## Q2. Are there regulatory or compliance requirements?

A. No external regulatory framework is apparent; compliance concerns are repository governance, auditability, and release evidence.
B. PCI-DSS applies.
C. HIPAA applies.
D. GDPR data residency applies.
E. FedRAMP applies.
X. Other.

[Answer]: A

Issue 610 is a repository-layout decision. It does not introduce customer data handling, cloud resources, or regulated data flows. The compliance lens is evidence: preserving deterministic drift checks, audit trail, PR traceability, and documented decision rationale.

## Q3. What is the team's current tech stack and skill profile?

A. TypeScript/ESM, Bun, root-level scripts, generated multi-harness distributions, Biome lint, `tsc --noEmit`, and a Bun-based test runner.
B. Python/Django.
C. Java/Spring.
D. Go microservices.
E. Terraform-only infrastructure.
X. Other.

[Answer]: A

The project-level rules and `package.json` identify Bun and TypeScript as the core toolchain. Existing maintainers are expected to understand `core/`, `harness/<name>/`, `dist/<harness>/`, self-promotion, and the Amadeus workflow artifacts.

## Q4. What are the budget and timeline constraints?

A. Minimize blast radius; design first, migrate only if the record shows enough value and a staged plan protects drift guards.
B. Complete full directory migration immediately.
C. Replace the build pipeline before analysis.
D. Stop all installer work until this is done.
E. No constraints.
X. Other.

[Answer]: A

Issue 610 was split out precisely because the initial installer decision controlled blast radius. The feasibility posture should preserve that caution: compare options, inventory path assumptions, then decide.

## Q5. Are there organizational blockers?

A. Yes: generated `dist/` must not be hand-edited, source/distribution/self-install trees must not drift, and versioned `amadeus/` workflow records should be committed at checkpoints.
B. Yes: a change freeze from operations.
C. Yes: a legal approval gate.
D. No blockers.
E. Unknown because the repository has no practices.
X. Other.

[Answer]: A

Team and project practices explicitly forbid hand-editing `dist/<harness>/` and mandate regeneration plus self-promotion after source changes that affect shipped harness trees. Any layout migration must respect those practices.

## Q6. What AWS services and accounts are currently in use?

A. Not applicable to this repository-layout intent.
B. Lambda and API Gateway.
C. ECS and RDS.
D. S3 and CloudFront.
E. Unknown and blocking.
X. Other.

[Answer]: A

No AWS infrastructure change is in scope. Release/distribution is handled by repository scripts, npm package work from the related installer intent, and GitHub checks.
