# Upstream Specifications: awslabs/aidlc-workflows (v2)

> **Source**: [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows/tree/3c3146cfd7cef33020d48e8d48d4e80d0f8c2820) — branch `v2`, commit `3c3146cf` (v2.6.40, retrieved 2026-08-21)
> **Status**: As-built specifications derived from the upstream implementation; the upstream code is authoritative over these documents.

This directory contains an as-built specification of the upstream AI-DLC Workflows 2.0 framework, written by reading the implementation on the `v2` branch (`core/`, `harness/`, `scripts/`, `tests/`, `plugins/`). Each document is paired with a Japanese companion translation (`*.ja.md`); the English file is canonical.

## Reading order

| # | Document | Subject |
| --- | ---------- | --------- |
| 00 | [00-overview.md](00-overview.md) | Repository purpose, top-level layout, core→dist source-of-truth model, versioning, dev tooling |
| 01 | [01-workflow-model.md](01-workflow-model.md) | Phases, the full stage inventory, scopes (EXECUTE/SKIP grids), depth and test-strategy tiers, stage-graph compilation, composer |
| 02 | [02-orchestration-engine.md](02-orchestration-engine.md) | Engine loop (`next`/`report`), directive protocol, gates, jump/park/resume, single-stage mode, conductor contract |
| 03 | [03-state-audit-runtime.md](03-state-audit-runtime.md) | Workspace layout (spaces/intents), state file contract, audit event system, runtime path resolution and introspection |
| 04 | [04-stage-protocol.md](04-stage-protocol.md) | Stage file anatomy, base stage protocol, protocol variants (construction, swarm, ensemble, governance, recovery, reviewer) |
| 05 | [05-agents.md](05-agents.md) | The 14 agent personas, reviewer read-only contracts, composer agent, per-agent knowledge attachment |
| 06 | [06-sensors.md](06-sensors.md) | Sensor manifests, dispatch, blocking semantics, and the six shipped sensors |
| 07 | [07-hooks.md](07-hooks.md) | The 17 core hooks: session lifecycle, guards, state sync, usage folding, statusline |
| 08 | [08-memory-rules-learnings.md](08-memory-rules-learnings.md) | Layered memory/rules (org→team→project→phase→stage), learnings admission gate, steering, team knowledge |
| 09 | [09-cli-tools.md](09-cli-tools.md) | CLI tool inventory: bolt autonomy, swarm convergence, worktree management, testing posture, usage/cost, doctors |
| 10 | [10-distribution-harnesses.md](10-distribution-harnesses.md) | Packaging pipeline (`scripts/package.ts`), harness manifests/adapters, the 8 dist targets, self-install and sync |
| 11 | [11-plugin-system.md](11-plugin-system.md) | Plugin anatomy, contribution merging, activation, the shipped `test-pro` example |
| 12 | [12-testing-ci.md](12-testing-ci.md) | Four-layer test suite, runner contract, coverage registry, e2e harness, CI and docs workflows |

## Provenance

- Cloned from `https://github.com/awslabs/aidlc-workflows`, branch `v2`, at commit `3c3146cfd7cef33020d48e8d48d4e80d0f8c2820` (verified against `git ls-remote refs/heads/v2` on 2026-08-21).
- Framework version at that commit: **2.6.40** (top entry of upstream `CHANGELOG.md`).
- Every document carries a `## Measurement notes` section recording the commands behind every count so numbers can be re-derived against the same commit.
