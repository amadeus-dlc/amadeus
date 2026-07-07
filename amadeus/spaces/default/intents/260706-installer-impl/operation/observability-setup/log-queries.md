# Log Queries — @amadeus-dlc/setup Observability

## Upstream Inputs

- U7 `monitoring-design.md`: secret-safe reporting
- U7 `security-design.md`: reporting controls（no secret values）
- U7 `infrastructure-services.md`: normalized findings boundary

## Log Sources

| Source | Platform | Retention |
|--------|----------|-----------|
| GitHub Actions job logs | GHA | repo settings default |
| Gate JSON reports | `.amadeus-ci/setup/` artifacts | per-run upload |
| Local maintainer stdout | developer terminal | ephemeral |

## GitHub Actions Log Queries (manual)

PR CI failure investigation:

```text
# In failed job log, search:
installer / package-metadata
installer / dependency-audit
GatePlan
blockingFailures
```

Release workflow investigation:

```text
# In release-preflight job:
release-preflight
package-check
security-gate
```

## JSON Report Queries

Gate summary inspection（download artifact 後）:

```bash
jq '.blockingFailures' .amadeus-ci/setup/gate-summary.json
jq '.gates[] | select(.status=="failed")' .amadeus-ci/setup/gate-summary.json
```

Dependency findings（secret-safe — no values）:

```bash
jq '.findings[] | {advisoryId, package, severity, reachable}' \
  .amadeus-ci/setup/dependency-findings.json
```

Secret findings（fingerprint only）:

```bash
jq '.findings[] | {fingerprint, path, line, ruleId, verified}' \
  .amadeus-ci/setup/secret-findings.json
```

## Installer CLI Logs (end-user)

`setup install` / `setup upgrade` は classified error を stderr に出力。structured log aggregation は v1 スコープ外。ユーザー報告は error reason + next action テキストを primary signal とする。

## Forbidden Log Content

- `NPM_TOKEN` 値
- secret scan matched value
- full environment dumps

`security-design.md` reporting controls に準拠。
