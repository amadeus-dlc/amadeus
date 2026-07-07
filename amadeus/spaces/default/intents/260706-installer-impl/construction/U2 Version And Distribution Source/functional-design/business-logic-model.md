# Business Logic Model — U2 Version And Distribution Source

> Stage: functional-design / Unit: `U2 Version And Distribution Source`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Scope

U2 resolves a requested Amadeus distribution and loads the selected harness distribution from the canonical repository archive. It owns stable SemVer tag ordering, explicit version/tag mapping, tag listing, archive fetch retry, archive extraction, and source distribution metadata reading. It does not parse CLI argv, inspect target state, plan target file operations, write the installer manifest, or verify target readiness.

Primary stories from `unit-of-work-story-map.md`:

- US-002: install can load selected harness distribution.
- US-005: upgrade can compare target version against resolved source version.
- US-008: latest stable SemVer tag is selected by default.
- US-009: release workflow can default to latest stable tag.
- US-012: archive fetch failures retry once and fail without target writes.

## Workflows

### Default Version Resolution

1. Receive a version request with no explicit `--version`.
2. Ask `TagSourcePort` for tags from `https://github.com/amadeus-dlc/amadeus`.
3. Filter to stable SemVer tags matching `vMAJOR.MINOR.PATCH` or `MAJOR.MINOR.PATCH` with no prerelease segment.
4. Group duplicates by semantic version.
5. Prefer `vX.Y.Z` over `X.Y.Z` when both exist.
6. Sort by SemVer precedence, not lexicographic string order.
7. Return highest stable version as `ResolvedVersion`.
8. Include ignored prerelease, draft-supplemental, malformed, and duplicate tags in diagnostics where available.

### Explicit Version Resolution

1. Receive explicit `--version`.
2. If explicit value starts with `v`, require exact tag.
3. If explicit value is a bare SemVer version, prefer `vX.Y.Z` when it exists and fall back to `X.Y.Z`.
4. If explicit value contains a prerelease segment, allow it only because it was explicit.
5. If no matching tag exists, return `version-not-found`.

### Archive Loading

1. Receive `ResolvedVersion` and selected `Harness`.
2. Ask `ArchiveSourcePort` to fetch archive for `sourceTag`.
3. `ArchiveSourcePort` / `GitHubArchiveAdapter` owns exactly one internal retry for transient archive fetch failure.
4. `loadDistribution` does not retry around the port call, preventing accidental double retry.
5. Fail with `archive-fetch-failed` when the port exhausts its single retry.
6. Pass fetched archive to `ArchiveExtractorPort`.
7. Extract only `dist/<harness>/` from the archive.
8. Fail with `harness-dist-missing` if selected harness distribution is absent.
9. Return `LoadedDistribution` with root, harness, resolved version, and file list.

### Source Metadata Reading

1. Inspect extracted distribution root for installer metadata.
2. If metadata exists and is valid, return its file entries.
3. If metadata exists but is invalid, fail with `distribution-metadata-invalid`; do not silently fall back.
4. If metadata is absent in the first release, derive file entries from `dist/<harness>/` tree and path policy.
5. Emit `DistributionFile[]` with `path`, `class`, `required`, and `md5`.
6. Do not decide target overwrite behavior; U4 Operation Planning And Safety consumes the metadata.

## Decision Tree

| Condition | Result |
|---|---|
| no stable SemVer tag exists | `no-stable-version`, no target writes |
| explicit version missing | `version-not-found`, no target writes |
| explicit prerelease exists | resolve because explicit |
| archive port succeeds after its internal retry | continue |
| archive port exhausts its single retry | `archive-fetch-failed`, no target writes |
| archive lacks `dist/<harness>/` | `harness-dist-missing`, no target writes |
| metadata absent | first-release fallback path policy |
| metadata present but invalid | `distribution-metadata-invalid`, no fallback |

## Data Transformations

| Input | Transformation | Output |
|---|---|---|
| tags | stable SemVer filtering and ordering | `ResolvedVersion` |
| explicit version | exact/preferred tag mapping | `ResolvedVersion` or `SetupError` |
| source tag | archive URL construction and fetch | archive path |
| archive path + harness | extract `dist/<harness>/` | `LoadedDistribution` |
| distribution root | metadata read / fallback classification | `DistributionFile[]` |

## Integration Boundaries

- U1 supplies `SetupCommand.version` and selected `Harness`.
- U2 supplies `ResolvedVersion`, `LoadedDistribution`, and `DistributionFile[]` to U4/U5 through the Setup Application Service.
- `components.md` separates `Tag Source Port` and `Archive Source Port`; U2 must preserve that split.
- `component-methods.md` defines `resolveVersion`, `loadDistribution`, `readDistributionMetadata`, `TagSourcePort`, `ArchiveSourcePort`, and `ArchiveExtractorPort`.
- `services.md` states GitHub tag/archive is an external service contract and no target files are modified before source load succeeds.
