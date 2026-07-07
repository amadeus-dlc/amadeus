# Drift Report — @amadeus-dlc/setup

## Upstream Inputs

- `deployment-log.md`: local validation state
- `alarms.md`: ANO-CI-* anomaly rules
- `slo-config.md`: gate correctness SLO

**Scan date**: 2026-07-07T15:28:00Z

## Automated Drift Guards (CI)

| Guard | Command | Last local run | Status |
|-------|---------|----------------|--------|
| dist drift | `bun run dist:check` | pass（build-and-test） | **aligned** |
| self-install drift | `bun run promote:self:check` | pass | **aligned** |
| package allowlist | `package-dry-run.ts` | pass | **aligned** |
| coverage ratchet | `coverage-gate.ts` | pass（t209） | **aligned** |
| gate registry | `GATE_REGISTRY` vs ci.yml | structural match | **aligned** |

## Configuration Drift

| Area | Expected | Observed | Drift? |
|------|----------|----------|--------|
| `ci.yml` installer-gates | registry-driven runner | matches U7 code-summary | no |
| `release-setup.yml` | workflow_dispatch only | matches U8 design | no |
| Bun version | 1.3.13 | ci.yml pinned | no |
| `npm-publish` environment | configured | **not verified** | **unknown** |

## Git Working Tree Drift

| Issue | Severity | Detail |
|-------|----------|--------|
| Untracked `packages/setup/**` | **high** | 実装ファイル多数が `??` — PR 前に staging 必須 |
| Modified audit MD | low | session audit log |

**Action**: `git add packages/setup/` + related tests/workflows → PR 作成。

## Infrastructure Drift (AWS Config)

**N/A** — no AWS resources。

## IaC vs Runtime

| Source | Runtime | Match |
|--------|---------|-------|
| GATE_REGISTRY | run-installer-gates.ts | yes |
| release-setup jobs | U8 cicd-pipeline.md | yes |
| domain contracts | t202–t210 tests | yes |

## Remediation Priority

1. **P0**: stage untracked implementation files for PR
2. **P1**: verify E3 `npm-publish` environment exists
3. **P2**: record GHA duration baseline post-merge

## Next Scan

- On each installer PR merge
- Before first npm publish dispatch
