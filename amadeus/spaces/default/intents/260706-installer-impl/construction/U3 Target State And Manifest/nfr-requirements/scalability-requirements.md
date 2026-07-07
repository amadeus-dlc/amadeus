# Scalability Requirements — U3 Target State And Manifest

> Stage: construction / nfr-requirements  
> Unit: U3 Target State And Manifest  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U3 remains a local single-process target reader. Scalability requirements focus on bounded manifest size, sentinel checks, expected-file snapshots, and avoiding full target workspace traversal.

## Capacity Targets

| Dimension | Requirement |
|---|---|
| Manifest file entries | schema validation supports at least 2,000 `files[]` entries |
| Sentinel checks | fixed small set per supported harness |
| Expected snapshot files | supports at least 2,000 expected files |
| Target workspace size | no dependency; U3 only reads manifest/sentinels/expected paths |
| Harness ambiguity candidates | supports `kiro` / `kiro-ide` shared sentinel ambiguity |
| Parallel invocations | independent target reads and no shared mutable state |

## Scaling Triggers

U3 design must be revisited if any of these become true:

- Manifest schema gains nested provenance/signature documents.
- A harness requires dynamic sentinel discovery rather than fixed sentinel files.
- Snapshot must traverse arbitrary target directories.
- Installer begins managing multiple harnesses in one invocation.
- Manifest migration across multiple schema versions becomes required.

## Concurrency Requirements

- U3 has no locks because it does not write.
- Concurrent installer invocations may race on reads, but U3 must represent unreadable/changing files as unknown rather than making unsafe assumptions.
- Manifest write race handling belongs to U5/Application Service, not U3.

## Growth Guardrails

- Adding a harness requires explicit sentinel rules and ambiguity tests.
- Adding manifest fields must not remove minimum FR-013 fields.
- Adding target-state classes requires U4 planning behavior before release.
- U3 must not introduce recursive scan as a shortcut for unsupported layouts.

## Upstream Coverage

- `business-logic-model.md`: detection/snapshot workflows define scaling dimensions.
- `business-rules.md`: sentinel and manifest entry rules define capacity boundaries.
- `requirements.md`: FR-006, FR-013, NFR-002, NFR-003, and NFR-004 define capacity constraints.
- `technology-stack.md`: local Bun process model informs concurrency and no-daemon stance.
