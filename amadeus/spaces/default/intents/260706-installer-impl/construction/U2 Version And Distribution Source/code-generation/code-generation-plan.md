# Code Generation Plan — U2 Version And Distribution Source

> Stage: construction / code-generation  
> Unit: U2 Version And Distribution Source

## Scope

U2 implements source distribution selection and loading for `@amadeus-dlc/setup`: stable SemVer tag resolution, explicit version mapping, tag source and archive source ports, GitHub archive URL construction/fetch with adapter-owned one retry, selected harness extraction from an archive/temp source tree, and distribution metadata reading with absent-only fallback. U2 must not inspect or mutate target projects.

## Plan

- [x] Step 1: Add U2 source/domain types under `packages/setup/src`.
  - Traceability: US-002, US-005, US-008, US-009, US-012, FR-007, FR-012.
  - Add `VersionRequest`, `ResolvedVersion`, `TagCandidate`, `LoadedDistribution`, `DistributionFile`, source-loading result/error types, and file class values.
  - Reuse U1 `Harness` type instead of defining a separate harness enum.

- [x] Step 2: Implement pure SemVer tag resolver.
  - Traceability: US-008, US-009, FR-007, BR-U2-001 through BR-U2-012.
  - Support default latest stable tag selection, prerelease exclusion by default, explicit prerelease support, `vX.Y.Z` preference over duplicate bare tags, SemVer precedence sorting, malformed tag diagnostics, and `version-not-found` / `no-stable-version` errors.
  - Avoid adding a runtime dependency unless impossible; keep resolver deterministic and unit-testable.

- [x] Step 3: Implement source ports and fake-friendly adapters.
  - Traceability: US-012, FR-012, BR-U2-013, BR-U2-014.
  - Define `TagSourcePort`, `ArchiveSourcePort`, and `ArchiveExtractorPort`.
  - Implement GitHub tag source and archive source with canonical repo URL and exactly one retry inside `ArchiveSourcePort`.
  - Keep tests primarily on fake ports; do not require live GitHub for deterministic tests.

- [x] Step 4: Implement archive extraction boundary.
  - Traceability: US-002, FR-007, BR-U2-015, BR-U2-016.
  - Add extraction logic that selects only `dist/<harness>/`, rejects missing harness dist, rejects path traversal/absolute path escapes, and returns a temp-root `LoadedDistribution`.
  - Use contained temp directories and cleanup diagnostics. If actual compressed archive extraction is too broad for U2 without adding dependencies, isolate archive extraction behind `ArchiveExtractorPort` and provide a directory-backed extractor/test extractor in this unit.

- [x] Step 5: Implement distribution metadata reader.
  - Traceability: US-002, US-005, FR-013, BR-U2-018 through BR-U2-022.
  - Validate present metadata schema; invalid present metadata returns `distribution-metadata-invalid` with no fallback.
  - When metadata is absent, derive `DistributionFile[]` from selected `dist/<harness>/` tree, classifying first-release file classes by path policy and computing md5 from binary content.
  - Do not decide overwrite/backup/conflict policy.

- [x] Step 6: Connect U2 to the application boundary without implementing target mutation.
  - Traceability: US-002, US-005, FR-005, FR-006, FR-007.
  - Extend `executeSetupCommand` so valid `install` / `upgrade` can resolve version/source when a harness is supplied and fake/default dependencies are available, then stop before U3-U5 with a classified downstream-not-implemented result.
  - Preserve U1 no-target-access behavior for parse/help/runtime failures.

- [x] Step 7: Add U2 unit tests.
  - Traceability: US-008, US-009, US-012, FR-007, FR-012.
  - Cover SemVer ordering (`v1.10.0` > `v1.2.0`), v-prefixed duplicate preference, prerelease default exclusion, explicit prerelease resolution, exact v-tag behavior, bare semver fallback, no stable tag, version not found, and malformed tag diagnostics.

- [x] Step 8: Add U2 archive/metadata tests.
  - Traceability: US-002, US-005, US-012, FR-007, FR-012, FR-013.
  - Cover adapter-owned retry count, selected harness extraction, missing `dist/<harness>/`, path traversal rejection, valid metadata, absent metadata fallback with md5, invalid metadata hard failure, and no target writes.

- [x] Step 9: Update package metadata/tests/coverage surfaces as needed.
  - Traceability: FR-016 and U6/U7 quality gates.
  - Add focused tests under `tests/unit/` and ensure root `typecheck` / `lint` still includes `packages/setup`.
  - Keep `packages/setup/package.json` files allowlist compatible with new source files.

- [x] Step 10: Run focused verification.
  - Traceability: Testing Posture, final goal.
  - Run U1/U2 focused tests, `bun run typecheck`, `bun run lint`, package metadata check, and `git diff --check`.

## Non-Goals

- Do not implement target detection, manifests, operation planning, file apply, verification, CI workflow YAML, release workflow YAML, or docs updates in U2.
- Do not introduce persistent source caches, authenticated GitHub access, or multi-harness extraction.
- Do not write to user target projects.

## Verification Expectations

- Pure resolver tests prove SemVer behavior independent of network.
- Archive/metadata tests use fake/local fixtures and do not call live GitHub.
- U2 code passes root `typecheck` and lint.
- Valid command flow still stops before target mutation until U3-U5 are implemented.
