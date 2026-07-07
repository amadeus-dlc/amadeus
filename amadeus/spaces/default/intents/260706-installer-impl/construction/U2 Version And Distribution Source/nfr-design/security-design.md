# Security Design — U2 Version And Distribution Source

> Stage: construction / nfr-design  
> Unit: U2 Version And Distribution Source  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U2 security treats tags and archives as untrusted external inputs until they are filtered, fetched from the canonical repository, extracted under a contained temp root, and validated into source distribution metadata. U2 never turns source data into target writes.

## Supply Chain Boundaries

| Boundary | Control |
|---|---|
| tag source | canonical repository only; malformed/prerelease tags excluded from default |
| explicit tag/version | exact/preferring rules; URL encodes selected tag |
| archive source | `ArchiveSourcePort` builds canonical archive request and owns retry |
| archive extraction | normalize entries and reject traversal outside temp root |
| metadata reader | validate schema before use; invalid present metadata fails hard |
| fallback metadata | absent-only fallback from extracted selected harness tree |

## Archive Containment Design

- Extract into a per-invocation temp directory.
- Normalize every archive entry path before writing.
- Reject absolute paths, parent traversal, platform separator escapes, and entries outside extraction root.
- Select only `dist/<harness>/`; missing selected harness returns `harness-dist-missing`.
- Do not fall back to another harness tree.

## Metadata Integrity Design

- Present metadata must satisfy schema before producing `DistributionFile[]`.
- Invalid present metadata returns `distribution-metadata-invalid` and does not fall back.
- Absent metadata fallback emits `path`, `class`, `required`, and binary-content `md5`.
- U2 emits metadata for U4/U5 but does not decide overwrite/backup/conflict behavior.

## Diagnostics And Secret Safety

- Diagnostics include selected source repo, source tag, ignored duplicate tags, and classified failure code.
- Diagnostics must not dump archive contents wholesale.
- Temp path details are minimized to controlled artifact paths or classified diagnostics.
- Network retry instructions are concrete but do not include credentials; authenticated GitHub API is out of first-release scope.

## Upstream Coverage

- `performance-requirements.md`: local fixtures prevent performance tests from requiring unsafe live network access.
- `security-requirements.md`: canonical repo, URL/tag safety, archive containment, metadata validation, and no target writes define controls.
- `scalability-requirements.md`: per-invocation temp dirs and no shared cache reduce supply-chain state risks.
- `reliability-requirements.md`: classified failures and cleanup diagnostics support security observability.
- `tech-stack-decisions.md`: port boundaries, extractor adapter, schema validation, and dependency policy define implementation constraints.
- `business-logic-model.md`: archive loading and metadata workflows define trust transitions.

