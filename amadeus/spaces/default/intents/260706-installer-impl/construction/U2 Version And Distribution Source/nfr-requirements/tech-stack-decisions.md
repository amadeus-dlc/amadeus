# Tech Stack Decisions — U2 Version And Distribution Source

> Stage: construction / nfr-requirements  
> Unit: U2 Version And Distribution Source  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript / ESM | Matches `technology-stack.md` and installer package direction |
| Runtime | Bun | Required by `requirements.md` FR-002 and current toolchain |
| SemVer handling | deterministic parser/comparator with explicit tests | FR-007 forbids lexicographic ordering |
| Network boundary | `TagSourcePort` and `ArchiveSourcePort` | Keeps GitHub external service behind testable ports |
| Retry owner | `ArchiveSourcePort` / `GitHubArchiveAdapter` only | Prevents double retry and matches U2 functional design |
| Archive extraction | adapter behind `ArchiveExtractorPort` with path containment checks | Isolates untrusted archive handling |
| Metadata reader | schema-validated source metadata with absent-only fallback | Preserves manifest/planning integrity |
| Hashing | md5 compatible with Bun/standard crypto APIs | Required by FR-013 metadata and downstream planning |

## Explicit Non-Decisions

- Do not add a persistent cache in first release.
- Do not use GitHub Release metadata for ordering.
- Do not fetch or extract every harness when only one harness is selected.
- Do not implement target detection, planning, apply, manifest write, or verification in U2.
- Do not add authenticated GitHub API requirements for the first release.

## Dependency Policy

Any runtime dependency added for SemVer, archive extraction, metadata validation, or hashing must include:

- purpose;
- why Bun/TypeScript standard APIs are insufficient;
- license compatibility;
- package size impact;
- vulnerability scan result;
- portability notes for macOS, Linux, and Windows-compatible shells.

This follows `requirements.md` NFR-005 and the Bun-first posture in `technology-stack.md`.

## CI And Tooling

U2 implementation must integrate with:

- `bun run typecheck`;
- U6 resolver/archive/metadata fixture tests;
- U7 package and dependency gates;
- U8 release preflight source validation;
- no-live-GitHub unit tests for normal CI, with live network behavior covered only by optional/manual diagnostics if needed.

## Portability Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Path representation | metadata uses portable relative paths with `/` separators | Stable manifest/planning input across OSes |
| Temp directory API | platform temp APIs | Avoid POSIX-only `/tmp` assumptions |
| Archive entry handling | normalize and validate before extraction | Avoid path traversal and platform separator bugs |
| Hash calculation | binary content md5, independent of newline conversion | Stable across macOS/Linux/Windows-compatible shells |

## Upstream Coverage

- `business-logic-model.md`: U2 workflows drive port, retry, extraction, and metadata decisions.
- `business-rules.md`: canonical repo, SemVer, retry, and metadata rules drive technology constraints.
- `requirements.md`: FR-007 / FR-012 / FR-013 / NFR-004 / NFR-005 are primary constraints.
- `technology-stack.md`: TypeScript/ESM/Bun and current CI define the implementation baseline.
