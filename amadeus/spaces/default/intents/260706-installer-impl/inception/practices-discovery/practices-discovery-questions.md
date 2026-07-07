# Practices Discovery Questions

## Q1. Repository package boundary

Should installer work also normalize the repository into a MECE workspace package layout?

A. Staged layout — add `packages/setup/` now, keep existing `core/` and `harness/` in place, and explicitly defer full repo re-layout to a separate refactor
B. Full workspace layout — move framework source into package-owned directories, for example `packages/framework/{core,harness,dist,scripts}` plus `packages/setup/`
C. Top-level domain layout — avoid `packages/` for now and add `setup/` beside existing `core/`, `harness/`, `dist/`, and `scripts/`
D. Root package — convert the root `package.json` into the npm package
X. Other (please specify)

[Answer]: A. Staged layout — add `packages/setup/` now, keep existing `core/` and `harness/` in place, and explicitly defer full repo re-layout to a separate refactor

## Q2. Testing posture and coverage floor

What quality floor should installer work use?

A. Coverage registry + ratchet — require `covers:` registry entries and ratchet checks for installer units; do not add a line coverage threshold
B. 80% line coverage — add a numeric line coverage threshold for installer code
C. Hybrid — require registry/ratchet now and add line coverage later
D. Defer — decide in build-and-test
X. Other (please specify)

[Answer]: A. Coverage registry + ratchet — require `covers:` registry entries and ratchet checks for installer units; do not add a line coverage threshold; CI must include a blocking gate for registry freshness/ratchet and installer smoke/unit/integration tests

## Q3. Release and deployment practice

How should npm/GitHub release operations be treated for the installer?

A. Manual approval release — PR CI blocks merges; production publish happens from tag/Release with human approval
B. Fully automated release — merge to main can publish without an extra human release gate
C. Manual-only release — no release workflow yet; humans publish locally after checks
D. Defer — decide in CI/deployment-pipeline stages
X. Other (please specify)

[Answer]: A. Manual approval release — release is triggered from GitHub Actions via `workflow_dispatch`; normally release/publish from the latest stable tag

## Q4. Security and supply-chain gates

Which security controls should be blocking for installer-related PRs?

A. Deterministic PR gates — add package dry-run, installer smoke/integration, dependency audit/OSV, and secret scan as blocking checks; provenance/SBOM at release
B. Advisory only — run security checks as warnings, not blockers
C. Release-only — keep PR checks as-is and add security controls only at release
D. Defer — decide in NFR/security stages
X. Other (please specify)

[Answer]: A. Deterministic PR gates — add package dry-run, installer smoke/integration, dependency audit/OSV, and secret scan as blocking checks; provenance/SBOM at release

## Q5. User-facing CLI style and safety

What should the installer CLI default behavior be?

A. Human-readable CLI + safety-first writes — stderr for users, structured internals, non-interactive conflicts fail unless explicit force/backup policy is provided
B. JSON-first CLI — match core workflow tools and emit JSON envelopes by default
C. Interactive-first CLI — prompt users to resolve conflicts whenever possible, even if automation is harder
D. Defer — decide in requirements-analysis
X. Other (please specify)

[Answer]: A. Human-readable CLI + safety-first writes — stderr for users, structured internals, non-interactive conflicts fail unless explicit force/backup policy is provided
