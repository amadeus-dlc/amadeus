# Security Requirements — U2 Version And Distribution Source

> Stage: construction / nfr-requirements  
> Unit: U2 Version And Distribution Source  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U2 security covers supply-chain and archive ingestion risk before target mutation is possible: canonical source repository, SemVer tag trust policy, archive URL construction, archive extraction boundaries, metadata integrity, md5 generation, temp directory handling, and dependency discipline. U2 does not authenticate users, authorize target writes, plan overwrites, or publish packages.

## Threat Considerations

| Threat | Requirement | Verification |
|---|---|---|
| malicious or malformed tag causes wrong latest selection | SemVer parser must reject malformed/pre-release tags by default and sort semantically | tag resolver tests |
| duplicate `v`/non-`v` tags hide selected source | duplicate tags are reported and `v` tag wins | resolver diagnostics test |
| URL/path injection through explicit tag | archive URL construction uses encoded tag input and canonical repo only | adapter unit test |
| archive traversal writes outside temp root | extractor rejects entries resolving outside extraction root | malicious archive fixture |
| missing harness dist causes fallback to wrong tree | extractor fails `harness-dist-missing`; no alternate harness fallback | archive fixture |
| invalid source metadata downgrades integrity | present invalid metadata fails hard as `distribution-metadata-invalid` | metadata fixture |
| temp archive/extraction leaks sensitive local paths | diagnostics avoid dumping arbitrary local temp path details beyond controlled artifact path | reporter/security snapshot |
| runtime dependency vulnerability | new dependencies are scanned and justified | U7 dependency gate |

## Data Classification

| Data | Classification | Handling |
|---|---|---|
| GitHub tag list | public external data | validate and filter before use |
| source archive | untrusted external artifact until extracted and validated | extract under temp root only |
| source distribution metadata | untrusted until schema validated | invalid present metadata is hard error |
| md5 values | integrity metadata, public | stable output for manifest/planning |
| temp paths | internal diagnostic data | avoid exposing unnecessary local path details |

## Controls

- Use canonical repository `https://github.com/amadeus-dlc/amadeus` from `requirements.md` FR-007.
- Treat GitHub Release metadata as supplemental; never use it for ordering.
- Do not accept prerelease tags by default.
- Keep exactly one retry in `ArchiveSourcePort` / `GitHubArchiveAdapter`.
- Validate archive extraction path containment before writing extracted files.
- Validate metadata schema before using metadata.
- Metadata fallback is allowed only when metadata is absent.
- U2 must not read or write target project files.

## Compliance Mapping

No personal data, PHI, payment data, or regulated customer records are processed by U2. Compliance concerns are supply-chain evidence and auditability: selected source tag, ignored tags, archive failure classification, metadata validation result, and dependency vulnerability status must be reproducible in CI/release evidence.

## Upstream Coverage

- `business-logic-model.md`: external tag/archive and metadata flows define trust boundaries.
- `business-rules.md`: canonical repo, retry ownership, invalid metadata, and no-target-write rules define controls.
- `requirements.md`: FR-007, FR-012, FR-013, NFR-004, and NFR-005 define security-relevant acceptance.
- `technology-stack.md`: Bun/TypeScript and no root runtime dependencies inform supply-chain posture.
