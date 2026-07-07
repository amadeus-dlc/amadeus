# Practices Discovery Evidence

## Sources Scanned

- `amadeus/spaces/default/codekb/amadeus/*.md`
- `amadeus/spaces/default/memory/{org,team,project}.md`
- `amadeus/spaces/default/memory/phases/inception.md`
- `package.json`
- `biome.json`
- `.github/workflows/ci.yml`
- `git log --oneline --decorate`
- `core/`, `harness/`, `scripts/`, `tests/` file layout

## Pipeline & Deployment Findings

- Branch history shows recent work landing through Pull Requests into `main` (`#601` through `#606`), with short topic branches such as `ci/github-actions` and `chore/amadeus-installer-impl-progress`.
- Current HEAD is `a8921e0c`. The previous codekb statement that `.github/workflows` was absent is stale: `.github/workflows/ci.yml` now exists and runs on `push` to `main` plus all pull requests.
- CI installs Bun `1.3.13`, then runs typecheck, Biome lint, `dist:check`, `promote:self:check`, and `tests/run-tests.sh --ci`.
- Deployment is not infrastructure deployment. Release readiness is distribution/npm readiness: generated `dist/<harness>/` parity, self-install parity, and test suite health.

## Quality Findings

- `package.json` exposes the expected contributor validation commands: `typecheck`, `lint`, `check`, `dist:check`, and `promote:self:check`.
- Tests are organized as smoke, unit, integration, and e2e tiers under `tests/`, with `tests/run-tests.sh --ci` used by CI.
- `biome.json` disables formatting, enables linting, excludes `dist/**`, and applies explicit rule overrides for `tests/**`, `core/tools/**`, `harness/**`, and `scripts/**`.
- Known risk from earlier reverse engineering remains relevant: historical known-failure baselines can make "all green" an unreliable shorthand unless the exact test profile and expected baseline are named.

## Developer Practice Findings

- The source/distribution split is stable: implementation changes belong in `core/` or `harness/<name>/`; `dist/` is generated output and committed as a parity artifact.
- Framework files consistently use the `amadeus-` prefix for tools, hooks, agents, and sensors.
- Tools and hooks are TypeScript files executed by Bun directly; executable bits are not required by convention.
- The package is dev-only (`private: true`) today, while the intent goal is an npm setup installer. Installer design must preserve the shipped framework's user-side premise that Bun is the only runtime requirement.

## DevSecOps Findings

- CI currently includes typecheck, lint, drift guards, and smoke+unit+integration tests. No dedicated SAST, dependency vulnerability, secret scanning, or SBOM generation was found in the scanned workflow.
- The dependency surface is intentionally small and dev-only: `typescript`, `bun-types`, `@anthropic-ai/claude-agent-sdk`, `node-pty`, and `@xterm/headless`.
- For this installer intent, the main supply-chain concern is not application runtime exposure but package publication integrity: generated assets, version metadata, package contents, and install-time behavior must be deterministic and auditable.

## Asked vs. Inferred

- Inferred from evidence: branch flow, CI gates, distribution parity rules, code style, and current test posture.
- Proposed for human affirmation at the gate: treating the first installer Bolt as a gated walking-skeleton slice even though the codebase is brownfield, because installer behavior is a new user-facing distribution path.
