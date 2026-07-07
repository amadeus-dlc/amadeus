# Monitoring Design — U2 Version And Distribution Source

> Stage: construction / infrastructure-design  
> Unit: U2 Version And Distribution Source

## Observability Model

U2 has no hosted telemetry. Observability is local diagnostics, CI fake-port evidence, and classified source-load reports.

## Signals

| Signal | Source | Purpose |
|---|---|---|
| selected source tag | Version Resolver diagnostics | trace release/source selection |
| ignored malformed/prerelease/duplicate tags | resolver diagnostics | explain tag decisions |
| archive retry attempts | ArchiveSourcePort fake/adapter report | prove exactly one retry |
| extraction containment failures | ArchiveExtractorPort tests | prove traversal rejection |
| metadata validity | Metadata Reader report | distinguish invalid vs absent fallback |
| temp cleanup diagnostics | Temp Directory Manager | preserve primary result with cleanup evidence |

## CI Evidence

U6/U7 tests provide:

- in-memory tag resolver fixtures;
- fake tag/archive port failures;
- malicious archive path fixtures;
- selected harness missing fixture;
- invalid metadata fixture;
- absent metadata fallback md5 fixture;
- no-target-write spies.

## Runtime Diagnostics

Runtime diagnostics should include selected repo/tag and classified failure codes, but not dump archive contents wholesale. Temp paths should be minimized or normalized in test output.

## Upstream Coverage

- `performance-design.md`: resolver and archive benchmarks become CI signals.
- `security-design.md`: containment and metadata validation failures are monitored via fixtures.
- `scalability-design.md`: tag/file growth is observed through generated large fixtures.
- `reliability-design.md`: retry, cleanup, and classified failure diagnostics are core signals.
- `logical-components.md`: Source Diagnostics Reporter is the observability component.
- `components.md`: Reporter/ports/metadata reader boundaries provide evidence points.
- `services.md`: external GitHub failures map to source-load diagnostics.
- `business-logic-model.md`: workflows define where source selection evidence is emitted.
