# Deployment Architecture — U2 Version And Distribution Source

> Stage: construction / infrastructure-design  
> Unit: U2 Version And Distribution Source

## Architecture Summary

U2はhosted deploymentを持たない。Deployment architectureはlocal CLI process内のsource ingestion pipelineと、external public GitHub tag/archive sourceで構成する。No database、queue、cache daemon、or service deployment is introduced.

## Runtime Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| Version Resolver | local in-memory function | 1 invocation内でtag listを正規化する。 |
| TagSourcePort | outbound GitHub tag listing boundary | canonical repo only。 |
| ArchiveSourcePort | outbound GitHub archive fetch boundary | exactly one retry owned by adapter。 |
| ArchiveExtractorPort | local temp extraction boundary | selected `dist/<harness>/` only。 |
| Metadata Reader | extracted source inspection | valid metadata or absent-only fallback。 |
| Temp Directory Manager | local temp filesystem | per-invocation root and cleanup diagnostics。 |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | fake-port/unit tests and local archive fixtures |
| GitHub Actions PR | U6/U7 fake network and temp filesystem tests |
| GitHub Actions release | U8 release preflight reuses tests and source validation |
| user machine | public GitHub tag/archive fetch and temp extraction during install/upgrade |

## Storage And Network

U2 uses temporary local storage only. It does not create target manifest, cache directory, lock file, or persistent package state. Network access is outbound to canonical GitHub repository for tag/archive source. Authenticated GitHub access is out of first release.

## Upstream Coverage

- `performance-design.md`: pure resolver and local fixture extraction define runtime topology.
- `security-design.md`: canonical outbound boundary and contained extraction define deployment controls.
- `scalability-design.md`: per-invocation temp dirs and no persistent cache define deployment scale.
- `reliability-design.md`: retry ownership and cleanup diagnostics define runtime failure behavior.
- `logical-components.md`: source ingestion components map to deployment surfaces.
- `components.md`: Version Resolver, Tag Source Port, GitHub Archive Adapter, Archive Extractor, Metadata Reader define ownership.
- `services.md`: GitHub Tag/Archive Source external contract is the only external service.
- `business-logic-model.md`: version resolution, archive loading, and metadata workflows define flow.
