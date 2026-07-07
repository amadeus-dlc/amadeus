# Architecture Decisions — インストーラの実装

> Stage: application-design / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `architecture.md`, `component-inventory.md`, `team-practices.md`, refined CLI/DX mockups

## Decision Index

| ADR | Title | Status | Reversibility |
|---|---|---|---|
| ADR-001 | Add an independent `packages/setup` package | Accepted | Medium |
| ADR-002 | Use hexagonal architecture inside the setup package | Accepted | Medium |
| ADR-003 | Resolve distributions from stable SemVer tag archives | Accepted | Low-Medium |
| ADR-004 | Make file operation plan the central safety contract | Accepted | Medium |
| ADR-005 | Keep release publication manual and CI gates blocking | Accepted | Low |

## ADR-001: Add An Independent `packages/setup` Package

### Status

Accepted

### Context

`requirements.md` requires `@amadeus-dlc/setup` with bin `amadeus-setup`, while root `package.json` remains dev-only and full repo workspace normalization is out of scope. `team-practices.md` also requires staged workspace adoption and keeping existing `core/`, `harness/`, `dist/`, and `scripts/` paths in place.

### Options

- Option A — independent package: add `packages/setup/package.json`, setup source, tests, and package-specific scripts; root orchestrates checks.
  - Pros: narrow scope, publishable package metadata isolated, root remains dev-only.
  - Cons: some script orchestration duplication at root/CI.
  - Reversibility: medium; can later normalize to workspaces.
- Option B — full workspace conversion: root becomes workspace root.
  - Pros: standard multi-package ergonomics.
  - Cons: wider blast radius and contradicts current staged-layout scope.
  - Reversibility: medium-high cost.
- Option C — publish root package.
  - Pros: simplest package count.
  - Cons: violates root dev-only boundary and mixes framework dev dependencies with user installer.
  - Reversibility: high migration cost after publish.

### Decision

Use Option A. `@amadeus-dlc/setup` lives under `packages/setup/` with independent package metadata and bin. Root remains private/dev-only and invokes setup package checks through CI/release scripts.

### Consequences

- Positive: publish metadata, dependency policy, and files allowlist are local to setup package.
- Positive: avoids full repository layout normalization in this intent.
- Negative: CI must explicitly wire package-specific validation.
- Neutral: future workspace normalization remains possible as a separate refactor.

### Alternatives Rejected

- Full workspace conversion is deferred to the separate repo-layout issue.
- Root publication is rejected because it breaks `requirements.md` FR-003.

## ADR-002: Use Hexagonal Architecture Inside The Setup Package

### Status

Accepted

### Context

The installer has high-risk policy branches: non-interactive validation, `--force`, shared-file backup, manual/partial target classification, network retry, manifest updates, and verification. A thin script would concentrate these branches in one place.

### Options

- Option A — hexagonal package: CLI shell + application service + pure domain planning + adapters.
  - Pros: plan/policy logic can be unit-tested without filesystem/network; adapters isolate side effects.
  - Cons: more files than a single script.
  - Reversibility: medium.
- Option B — thin imperative script.
  - Pros: fastest first implementation.
  - Cons: safety logic becomes tangled with IO and output; hard to test edge cases.
  - Reversibility: expensive once behavior expands.
- Option C — reuse `scripts/package.ts` directly.
  - Pros: leverages existing build knowledge.
  - Cons: couples installer runtime to repo-local build implementation and duplicates distribution generation concern.
  - Reversibility: high cost if shipped.

### Decision

Use Option A. `packages/setup` has a thin CLI entrypoint, application service, domain modules for version/target/planning/manifest/verification, and ports/adapters for filesystem, GitHub/archive, prompts, and reporter output.

### Consequences

- Positive: backup and no-write invariants are testable as pure planning tests.
- Positive: network and filesystem failure tests can use fake adapters.
- Negative: functional design must define module paths and type names carefully to avoid over-abstraction.
- Neutral: the package remains a modular monolith, not multiple runtime services.

### Alternatives Rejected

- Thin script is rejected for safety and testability.
- `scripts/package.ts` reuse is rejected because packager remains a source artifact producer, not installer runtime logic.

## ADR-003: Resolve Distributions From Stable SemVer Tag Archives

### Status

Accepted

### Context

`requirements.md` FR-007 requires stable SemVer tag first from `https://github.com/amadeus-dlc/amadeus`, with GitHub Release metadata supplemental only. `architecture.md` says installer should consume release/tag archives and not reimplement packaging.

### Options

- Option A — stable SemVer tag archive resolver.
  - Pros: deterministic default, independent of Release metadata completeness, aligns with requirements.
  - Cons: archive layout must contain committed `dist/<harness>/`.
  - Reversibility: low-medium because user-visible version semantics become contractual.
- Option B — latest GitHub Release first.
  - Pros: common release UX.
  - Cons: conflicts with requirement that Release metadata is supplemental.
  - Reversibility: medium.
- Option C — npm package embeds all distributions.
  - Pros: fewer network calls to GitHub at install time.
  - Cons: offline/bundled dist is out of scope and package size grows.
  - Reversibility: medium.

### Decision

Use Option A. The setup package resolves latest stable SemVer tag by default, allows explicit tags/versions, downloads the selected archive, and extracts `dist/<harness>/`.

### Consequences

- Positive: install/upgrade target distribution is traceable to source tag.
- Positive: prereleases are excluded by default but explicit prerelease requests are possible.
- Negative: archive availability and layout become installer dependencies.
- Neutral: Release metadata can enrich docs but cannot change ordering.

### Alternatives Rejected

- GitHub Release first is rejected because it conflicts with FR-007.
- Bundled dist in npm package is rejected as out of scope.

## ADR-004: Make File Operation Plan The Central Safety Contract

### Status

Accepted

### Context

The refined mockups and requirements require pre-apply reporting, non-destructive shared-file policy, `--yes` prompt suppression, `--force` collision bypass, and mandatory backups for changed/unknown shared files.

### Options

- Option A — central `FileOperationPlan` used by reporter and applier.
  - Pros: one source for plan output, tests, and apply behavior; force backup invariant can be asserted.
  - Cons: plan object must carry enough detail for both UX and writes.
  - Reversibility: medium.
- Option B — reporter computes display summary separately from applier.
  - Pros: simpler applier API initially.
  - Cons: report/actual mutation drift risk.
  - Reversibility: high cost if drift ships.
- Option C — apply first then summarize.
  - Pros: less planning upfront.
  - Cons: violates pre-apply plan requirement and safety UX.
  - Reversibility: unacceptable.

### Decision

Use Option A. Planner emits a full `FileOperationPlan`; reporter renders it before writes or abort; applier executes it without re-deciding policy.

### Consequences

- Positive: report and manifest traceability become testable.
- Positive: non-interactive aborts still produce auditable plans.
- Negative: planner must model edge cases such as partial install and force-update.
- Neutral: full content diff remains out of scope; plan is file-level.

### Alternatives Rejected

- Separate report computation is rejected due to traceability risk.
- Apply-first summary is rejected because it contradicts NFR-002 and FR-008.

## ADR-005: Keep Release Publication Manual And CI Gates Blocking

### Status

Accepted

### Context

`team-practices.md` and requirements FR-016/FR-017 require installer PR gates and manual GitHub Actions release via `workflow_dispatch`, usually from latest stable tag. Automatic publish on main merge is out of scope.

### Options

- Option A — manual release workflow plus blocking installer PR gates.
  - Pros: human-controlled production publication; CI enforces readiness.
  - Cons: release requires maintainer action.
  - Reversibility: low once release posture is documented.
- Option B — automatic publish on main merge.
  - Pros: lower manual overhead.
  - Cons: explicitly out of scope and riskier for first installer release.
  - Reversibility: medium-high.
- Option C — local manual npm publish as primary.
  - Pros: quick ad hoc release.
  - Cons: weak auditability and contradicts team practice.
  - Reversibility: medium.

### Decision

Use Option A. Installer-related PRs run blocking package/test/security/coverage checks. Production publication happens through a manually triggered GitHub Actions release workflow with package dry-run, SBOM/provenance, and publish validation.

### Consequences

- Positive: release path is auditable and deterministic.
- Positive: supply-chain checks are not advisory-only.
- Negative: CI/release pipeline work is required before publication.
- Neutral: npm credentials and protected environment details are deferred to CI Pipeline / Deployment Pipeline.

### Alternatives Rejected

- Automatic main publish is rejected as out of scope.
- Local manual publish as primary is rejected for auditability and policy mismatch.

## Open Follow-Ups

| ID | Follow-up | Target Stage |
|---|---|---|
| AD-OQ-001 | Define exact required file inventory per harness for manifest entries | Functional Design |
| AD-OQ-002 | Select concrete OSV/audit/secret scan tooling and allowlist format | NFR Requirements / CI Pipeline |
| AD-OQ-003 | Define npm credentials and GitHub environment protection | CI Pipeline / Deployment Pipeline |
| AD-OQ-004 | Implement manifest-first upgrade detection tests, including `kiro`/`kiro-ide` no-manifest ambiguity | Functional Design |

## Traceability

ADRs cover `requirements.md` FR-001, FR-003, FR-007, FR-008, FR-009, FR-010, FR-015, FR-016, FR-017; `stories.md` US-001, US-004, US-007, US-008, US-009, US-010, US-011; brownfield boundaries in `architecture.md` and `component-inventory.md`; and `team-practices.md` package/release/testing posture.
