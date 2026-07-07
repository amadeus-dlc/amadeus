# Incident Response — Memory

## Upstream References

- `dashboards.md` / `alarms.md`
- U7 `reliability-design.md` / `security-design.md`
- U8 `deployment-architecture.md`

## Interpretations

- 2026-07-07T15:22:00Z — SSM Automation / AWS Incident Manager は npm CLI モデルに不適合のため runbook は shell/GitHub 手順に限定。

## Deviations

- 2026-07-07T15:22:00Z — Step 4 の AWS Backup / DR は git + npm registry モデルに置換。

## Tradeoffs

- 2026-07-07T15:22:00Z — solo maintainer のため escalation matrix は単層。

## Open questions

- backup maintainer 任命は将来検討
