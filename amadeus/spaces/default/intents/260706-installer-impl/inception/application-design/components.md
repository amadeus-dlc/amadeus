# Components — インストーラの実装

> Stage: application-design / Intent: `260706-installer-impl`  
> Upstream: `requirements.md`, `stories.md`, `architecture.md`, `component-inventory.md`, `team-practices.md`, refined CLI/DX mockups  
> Architectural style: `packages/setup/` 内の hexagonal package。root, `core/`, `harness/`, `dist/`, `scripts/` の全面移動はしない。

## Design Summary

`@amadeus-dlc/setup` は、既存 Amadeus repo の build-time architecture とは独立した client-side installer application として設計する。既存の `scripts/package.ts` は信頼できる `dist/<harness>/` 生成者であり、installer は GitHub stable SemVer tag archive から選択 harness の distribution を取得して target project へ安全に適用する。

中核責務は、CLI 入力を `InstallCommand` / `UpgradeCommand` に変換し、version resolution、target detection、file operation planning、backup、manifest、verification、human-readable report を一貫した domain flow として実行すること。副作用は ports/adapters に閉じ込め、plan builder と policy 判定を単体テスト可能にする。

## Component Catalog

| Component | Location | Purpose | Owns |
|---|---|---|---|
| Setup Package Entrypoint | `packages/setup/src/bin/amadeus-setup.ts` | npm bin `amadeus-setup` / bunx / npx delegation entry | process exit, top-level error handling |
| CLI Command Parser | `packages/setup/src/cli/command-parser.ts` | argv から command/options を生成 | command grammar, option validation shape |
| Interaction Mode Resolver | `packages/setup/src/cli/interaction-mode.ts` | TTY/`--yes`/`--force` の mode 判定 | interactive vs non-interactive contract |
| Setup Application Service | `packages/setup/src/application/setup-service.ts` | install/upgrade use case の orchestration | command flow, transaction order |
| Version Resolver | `packages/setup/src/domain/version-resolver.ts` | stable SemVer tag first policy | tag filtering, explicit version resolution |
| Tag Source Port | `packages/setup/src/ports/tag-source.ts` | tag listing boundary for version resolution | external tag contract |
| Archive Source Port | `packages/setup/src/ports/archive-source.ts` | source archive download boundary | external archive contract |
| GitHub Archive Adapter | `packages/setup/src/adapters/github-archive-source.ts` | canonical repo から tag/archive を取得 | network retry, GitHub URL construction |
| Archive Extractor | `packages/setup/src/adapters/archive-extractor.ts` | downloaded archive から `dist/<harness>/` tree を開く | temp dir lifecycle, archive layout errors |
| Distribution Metadata Reader | `packages/setup/src/domain/distribution-metadata.ts` | source distribution の file metadata を読む | class/md5 metadata, fallback policy |
| Target Detector | `packages/setup/src/domain/target-detector.ts` | target の install state を分類 | sentinels, manifest presence, unsupported layout |
| File Classifier | `packages/setup/src/domain/file-classifier.ts` | `owned`/`shared`/`user-preserved` 判定 | source metadata + path policy |
| Operation Planner | `packages/setup/src/domain/operation-planner.ts` | add/update/skip/backup/conflict plan 作成 | pre-apply report, no-write decisions |
| Backup Planner/Writer | `packages/setup/src/domain/backup-policy.ts` + FS adapter | changed/unknown shared file backup | timestamp policy, backup path naming |
| File Applier | `packages/setup/src/application/file-applier.ts` | plan を target filesystem に適用 | apply ordering, write failures |
| Manifest Store | `packages/setup/src/domain/manifest.ts` + FS adapter | installer manifest read/write | schemaVersion, md5, file entries |
| Verifier | `packages/setup/src/domain/verifier.ts` | doctor-equivalent readiness checks | required files, harness readiness |
| Reporter | `packages/setup/src/cli/reporter.ts` | human-readable CLI output | plain-text canonical output |
| Prompt Adapter | `packages/setup/src/adapters/prompt.ts` | interactive harness/target/confirm prompt | typed/numeric fallback |
| Documentation Update Owner | `packages/setup/docs/install-guidance.md` + root `README.md` update | installer-first README guidance | FR-015 documentation contract |
| Package Check | `packages/setup/src/maintainer/package-check.ts` | maintainer-facing package metadata validation | package name/bin/license/files checks |
| Release Workflow Contract | `.github/workflows/release-setup.yml` | manual `workflow_dispatch` release surface | package validation, SBOM/provenance gate |

## Component Responsibilities

### Setup Package Entrypoint

- Starts `amadeus-setup` from Bun.
- When invoked via `npx`, verifies Bun availability and delegates or fails with Bun-required message.
- Converts domain/application errors into exit code and reporter output.
- Does not inspect or mutate target files directly.

### CLI Command Parser

- Accepts only:
  - `install [--harness] [--target] [--version] [--yes] [--force]`
  - `upgrade [--harness] [--target] [--version] [--yes] [--force]`
- Rejects `init` and unknown commands.
- Rejects multiple harness values before network or filesystem writes.

### Setup Application Service

- Coordinates install and upgrade flows in this order: parse result, mode validation, version resolution, source extraction, target detection/snapshot, planning, reporting/confirmation, apply, manifest write, verification, result report.
- Owns transaction sequencing but delegates all external effects to ports.
- Owns classification of `manifest-write-failed` after `File Applier` succeeds and `Manifest Store` fails.
- Guarantees pre-apply plan is produced before writes or abort.

### Version Resolver

- Uses canonical repository `https://github.com/amadeus-dlc/amadeus`.
- Selects highest stable SemVer tag by default.
- Excludes prerelease tags unless explicit.
- Prefers `v1.2.3` over duplicate `1.2.3`.
- Treats GitHub Release metadata as supplemental only.

### Distribution Metadata Reader

- First tries to read installer metadata from the selected release archive when present.
- First release fallback derives metadata from `dist/<harness>/` tree and path policies.
- Emits file entries with `path`, `class`, `required`, and `md5` for manifest/planning.
- Does not define the final per-harness required inventory; Functional Design owns exact inventory.

### Target Detector

- Classifies target state as `manifest-installed`, `manual-or-unknown`, `partial`, `none`, or `unsupported-layout`.
- Uses harness sentinels from requirements and manifest compatibility checks.
- Never writes target files.

### Operation Planner

- Produces a `FileOperationPlan` containing add/update/skip/backup/conflict/force-update operations.
- Applies `--yes` and `--force` policy without performing writes.
- Requires backup operation before force-updating changed or unknown `shared` files.
- Generates no-write outcomes for validation/version/target-state failures.

### File Applier

- Applies a previously approved plan.
- Writes backups before overwriting `shared` files.
- Does not write the installer manifest; `Setup Application Service` calls `Manifest Store` after apply succeeds.
- Does not recalculate policy while applying; the approved plan is the contract.

### Verifier

- Checks required manifest files exist.
- Checks selected harness readiness: harness directory present, tools directory present, active-space memory shell present, state/intent absence tolerated.
- Reports failed checks without inventing rollback semantics.

## Public Interfaces

| Interface | Direction | Consumer |
|---|---|---|
| `runSetup(argv, env)` | process entry -> application | bin entrypoint |
| `parseCommand(argv)` | CLI -> domain command | setup service |
| `resolveVersion(request)` | setup service -> version resolver | install/upgrade |
| `loadDistribution(request)` | setup service -> distribution source | install/upgrade |
| `detectTarget(request)` / `snapshotTarget(request)` | setup service -> target detector/snapshot | upgrade/install collision handling |
| `planInstall/planUpgrade` | setup service -> operation planner | reporter/applier |
| `applyPlan(plan)` | setup service -> file applier | install/upgrade |
| `readManifest/writeManifest` | detector/application service -> manifest store | upgrade/install |
| `verifyInstallation` | setup service -> verifier | post-apply |
| `renderReport(result)` | application -> reporter | CLI output |

## Boundaries And Ownership

| Boundary | Owned by setup package | Not owned by setup package |
|---|---|---|
| Source package | `packages/setup/**` | root package publication, full workspace normalization |
| Distribution source | reading selected release archive | generating `dist/<harness>/` from `core/` and `harness/` |
| Target mutation | planning/applying selected harness files | changing active workflow state beyond installed files |
| Metadata | setup manifest and source distribution metadata reading | exact future harness manifest authoring policy in packager |
| Release | package validation workflow contract | npm credential details and environment protection design |

## Traceability

| Component | Requirements | Stories |
|---|---|---|
| Entrypoint / Parser | FR-001, FR-002, FR-004, FR-005, FR-006, FR-011 | US-001, US-002, US-003, US-004 |
| Version Resolver / GitHub Adapter | FR-007, FR-012 | US-008, US-012 |
| Target Detector / Manifest Store | FR-006, FR-013 | US-005, US-006 |
| Metadata Reader / File Classifier / Planner | FR-008, FR-009, FR-010, NFR-002, NFR-003 | US-004, US-007 |
| File Applier / Backup Writer / Verifier | FR-005, FR-006, FR-014, NFR-001 | US-002, US-005, US-007 |
| Reporter / Prompt Adapter | FR-011, NFR-006 | US-003, US-004, US-011 |
| Documentation Update Owner | FR-015, NFR-006 | US-011 |
| Package Check / Release Workflow Contract | FR-001, FR-003, FR-016, FR-017, NFR-005 | US-001, US-009, US-010 |

## Brownfield Alignment

This design respects the `architecture.md` and `component-inventory.md` boundary: `scripts/package.ts` remains the producer of trusted `dist/<harness>/` artifacts; `packages/setup/` consumes release archives and target files only. The setup package does not write `core/`, `harness/`, `dist/`, or `scripts/` during user install/upgrade.
