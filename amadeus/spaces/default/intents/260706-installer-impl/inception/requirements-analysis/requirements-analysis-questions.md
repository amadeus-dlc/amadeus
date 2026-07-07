# Requirements Analysis Questions

> Stage: requirements-analysis / Intent: `260706-installer-impl` / Recreated for grilling: 2026-07-07T03:57:00Z

## Q1. Runtime and invocation contract

Initial requirements previously said both `bunx @amadeus-dlc/setup` and `npx @amadeus-dlc/setup` must work, while the refreshed practices say installer should be Bun-first and Node compatibility should be a separate ADR. Which contract should this release require?

A. Bun-first only — require `bunx @amadeus-dlc/setup`; publish to npm, but do not require `npx`/Node execution in this release
B. Bun-first with best-effort npx — require Bun behavior; allow `npx` only if the installed bin can locate/use Bun and fail clearly otherwise
C. Full bunx + npx support — require the installer implementation to run under both Bun and Node/npm in this release
D. Defer Node compatibility — remove `npx` from must-have requirements and revisit in a dedicated compatibility ADR
X. Other (please specify)

[Answer]: B. Bun-first with best-effort npx — require Bun behavior; allow `npx` only if the installed bin can locate/use Bun and fail clearly otherwise

## Q2. Repository layout requirement

The refreshed practices selected a staged layout: add `packages/setup/` now, keep existing `core/`, `harness/`, `dist/`, and `scripts/` paths in place, and defer full repo layout normalization. How should requirements express this?

A. Make staged layout mandatory for this release and explicitly mark full repo re-layout out of scope
B. Make full workspace normalization part of this release before implementing installer features
C. Leave layout as a design-stage decision, with only the package name/bin required here
D. Avoid `packages/` entirely and use top-level `setup/`
X. Other (please specify)

[Answer]: A. Make staged layout mandatory for this release and explicitly mark full repo re-layout out of scope

## Q3. Release workflow contract

The refreshed practices selected GitHub Actions `workflow_dispatch`, normally from the latest stable tag. What should be required in this intent?

A. Release workflow required — a manually triggered GitHub Actions workflow publishes from selected/latest stable tag
B. Release docs only — document `workflow_dispatch` as future direction, but initial implementation only includes manual publish docs
C. Publish automation out of scope — only installer code and README changes are required
D. Fully automated tag release — pushing a stable tag automatically publishes without a manual button
X. Other (please specify)

[Answer]: A. Release workflow required — a manually triggered GitHub Actions workflow publishes from selected/latest stable tag

## Q4. Security and package validation gates

Practices selected deterministic PR gates. Which checks must be explicit requirements for this release?

A. Blocking PR checks for package dry-run, installer smoke/integration, dependency audit or OSV, secret scan, coverage registry/ratchet; SBOM/provenance in release workflow
B. Only package dry-run and installer tests are required now; dependency/security scans later
C. Only existing CI checks are required now; security gates move to NFR/security stages
D. All release-grade controls including SBOM/provenance must block every PR
X. Other (please specify)

[Answer]: A. Blocking PR checks for package dry-run, installer smoke/integration, dependency audit or OSV, secret scan, coverage registry/ratchet; SBOM/provenance required in release workflow

## Q5. Version source and installer resolver

The release workflow normally publishes from the latest stable tag, while the installer resolver previously preferred latest GitHub Release then stable SemVer tag fallback. What should the runtime resolver do?

A. GitHub Release first, stable SemVer tag fallback — keep previous behavior
B. Stable SemVer tag first, GitHub Release metadata optional — align with tag-driven release button
C. npm package version first — installer package version determines framework distribution version
D. Explicit `--version` required for all non-interactive installs
X. Other (please specify)

[Answer]: B. Stable SemVer tag first, GitHub Release metadata optional — align with tag-driven release button

## Q6. Conflict and backup contract

Practices selected human-readable CLI and non-interactive conflicts fail unless explicit force/backup policy is provided. How should `--force` behave?

A. Force still backs up changed/unknown shared files; it only bypasses prompts/collision aborts
B. Force overwrites everything without backup
C. Force is not supported in initial release
D. Force is allowed only for `upgrade`, not `init`
X. Other (please specify)

[Answer]: A. Force still backs up changed/unknown shared files; it only bypasses prompts/collision aborts

## Q7. Command naming

Should the first-time setup command be named `install` instead of `init`?

A. `install` and `upgrade` — use `amadeus-setup install` for first-time setup and `amadeus-setup upgrade` for existing installations
B. `init` and `upgrade` — keep the previous `init` name for first-time setup
C. `install` with `init` alias — document `install`, but keep `init` as a compatibility alias
D. Defer — decide command naming in application-design
X. Other (please specify)

[Answer]: A. `install` and `upgrade` — use `amadeus-setup install` for first-time setup and `amadeus-setup upgrade` for existing installations

## Q8. Initial release scope boundary

What is the release-blocking minimum for this intent after the refreshed practices and `install`/`upgrade` command naming?

A. Installer package, install/upgrade, manifest, backup policy, verification, docs, CI gates, and manual release workflow
B. Installer package, install only, docs, and basic tests; upgrade and release workflow later
C. Installer package plus documentation only; no real target mutation until next intent
D. Full installer plus complete repo workspace normalization
X. Other (please specify)

[Answer]: A. Installer package, install/upgrade, manifest, backup policy, verification, docs, CI gates, and manual release workflow
