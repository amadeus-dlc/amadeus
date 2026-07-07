# Observability Setup — Memory

## Upstream References

- U7 `performance-design.md` / `security-design.md` / `reliability-design.md`
- U7 `monitoring-design.md` / `infrastructure-services.md`

## Interpretations

- 2026-07-07T15:18:00Z — CloudWatch/SaaS APM ではなく GitHub Actions + JSON gate reports を observability plane として文書化。

## Deviations

- 2026-07-07T15:18:00Z — tracing-config は N/A と明記（stage produces は満たすが distributed tracing は採用しない）。

## Tradeoffs

- 2026-07-07T15:18:00Z — PagerDuty なし。solo maintainer は GitHub notifications + manual review。

## Open questions

- gate JSON への `durationMs` 追加は v2 enhancement
