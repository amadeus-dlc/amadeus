# Requirements — インストーラの実装

> Stage: requirements-analysis / Intent: `260706-installer-impl` / Scope: feature  
> Sources: `intent-statement.md`, `scope-document.md`, `business-overview.md`, `architecture.md`, `code-structure.md`, `team-practices.md`, `requirements-analysis-questions.md`

## Intent Analysis

Amadeus の現行導入方式は、ユーザーが `dist/<harness>/` を自プロジェクトへ手動コピーする方式である。この intent は、初回導入、既存導入先の更新、導入ミス防止をまとめて解決する npm 配布インストーラ `@amadeus-dlc/setup` を実装する。

主な利用者は、新規に Amadeus を試す OSS 利用者と、既に導入済みでバージョンアップしたい既存ユーザーである。成功状態は、クローン不要の 1 コマンド導入、既存カスタマイズを失わない更新、README から手動コピー手順を主要導線として削除できる導入体験である。

## Functional Requirements

### CLI Contract

初回リリースのユーザー可視 CLI contract は次の通り。

```bash
amadeus-setup install [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
```

- `install`: 新規導入。旧案の `init` は採用しない。`init` alias も初回リリースでは提供しない。
- `upgrade`: 既存導入の distribution version を上げる。
- 対話モード: stdin が TTY で `--yes` がない場合。未指定値は prompt してよい。
- 非対話モード: `--yes` がある、または stdin が TTY でない場合。`--harness` と `--target` は必須。
- `--harness`: 1 invocation につき 1 harness のみ。複数指定は初回リリースでは拒否する。
- `--target`: 変更対象 project root。対話モードのみ current working directory を既定値として提示してよい。
- `--version`: 明示 version/tag。省略時は FR-007 の stable SemVer tag first policy を使う。
- `--force`: prompt/collision abort を bypass するが、非対話化、必須値補完、shared file backup 省略はしない。

Requirements Q7 supersedes older upstream `init` wording in `scope-document.md` and earlier codekb notes. The authoritative command names for this intent are `install` and `upgrade`.

### FR-001: npm CLI Package

The system shall provide an npm package named `@amadeus-dlc/setup` with executable bin `amadeus-setup`.

- Priority: Must
- Source: `scope-document.md` P4/T1/T2, `team-practices.md`
- Acceptance:
  - Given the package is installed or invoked through a supported package runner, when the user runs `amadeus-setup --help`, then the CLI entrypoint starts without requiring a repository clone.
  - Given package metadata is inspected, then `name`, `bin`, `license`, `repository`, `files`, and publish contents are valid for `@amadeus-dlc/setup`.
  - Given license metadata is inspected, then it reflects the repository's MIT + Apache-2.0 dual-license posture, not the stale root `MIT-0` value.

### FR-002: Runtime And Invocation Support

The system shall be Bun-first and support best-effort `npx` only when Bun is available.

- Priority: Must
- Source: requirements Q1, `team-practices.md`
- Acceptance:
  - Given Bun is available, when the user runs `bunx @amadeus-dlc/setup --help`, then the CLI executes successfully.
  - Given npm/Node is available and Bun is also discoverable, when the user runs `npx @amadeus-dlc/setup --help`, then the npm bin may delegate to Bun and execute successfully.
  - Given `npx @amadeus-dlc/setup` is run without Bun available, then the CLI exits non-zero with a clear message that Bun is required for this release.
  - Given Node-only execution is requested, then the CLI does not promise full Node runtime compatibility in this release.

### FR-003: Repository Layout Boundary

The system shall use a staged package layout for this intent.

- Priority: Must
- Source: requirements Q2, `team-practices.md`, `code-structure.md`
- Acceptance:
  - Given the installer package source is added, then it lives under `packages/setup/`.
  - Given framework source is inspected, then existing `core/`, `harness/`, `dist/`, and `scripts/` paths remain in place for this intent.
  - Given scope is reviewed, then full repo workspace normalization is explicitly out of scope.
  - Given root `package.json` is inspected, then it remains dev-only and is not converted into the publishable installer package.

### FR-004: Harness Selection

The system shall let users select exactly one supported harness target per invocation: `claude`, `codex`, `kiro`, or `kiro-ide`.

- Priority: Must
- Source: `intent-statement.md` Q4
- Acceptance:
  - Given interactive mode and no harness value, when the CLI needs a harness, then it prompts for one of the supported harnesses.
  - Given non-interactive mode and `--harness` is missing, then the CLI exits with a clear validation error and modifies no files.
  - Given multiple harnesses are provided in one invocation, then the CLI exits with an unsupported-multiple-harnesses error and instructs the user to run one command per harness.

### FR-005: Install Command

The system shall provide an `install` flow that installs the selected harness files into a target project.

- Priority: Must
- Source: `scope-document.md` P2, requirements Q7/Q8
- Acceptance:
  - Given a clean target project, when the user runs `amadeus-setup install --harness <h> --target <path>`, then required harness files are copied into the target.
  - Given install completes, then the system reports installed harness, distribution version, source tag, target path, manifest path, and next steps.
  - Given install finds existing target files, then interactive mode asks for confirmation and non-interactive mode aborts unless `--force` is present.
  - Given `--force` is used during install, then shared files that already exist and are changed or unknown are backed up before copy.

### FR-006: Upgrade Command

The system shall provide an `upgrade` flow that updates an existing Amadeus installation to a newer distribution version.

- Priority: Must
- Source: `scope-document.md` P3, requirements Q7/Q8
- Acceptance:
  - Given a clean existing installation with an installer manifest, when upgrade runs, then the CLI detects installed harness and version and prepares an update plan.
  - Given a manual-copy installation without a manifest but with recognizable harness files, when upgrade runs, then the CLI classifies it as `manual-or-unknown` and prepares a conservative plan that backs up existing shared files before copying.
  - Given a partial installation with missing required files, when upgrade runs, then the CLI reports partial state and refuses non-interactive apply unless `--force` is present.
  - Given no recognizable installation exists, when upgrade runs, then the CLI exits with an instruction to run `install`.
  - Given an unsupported old layout is detected, when upgrade runs, then the CLI exits with a clear unsupported-layout message and modifies no files.
  - Given the installed version equals the resolved or requested version, when upgrade runs, then it reports already-up-to-date and makes no file changes.
  - Given the requested version is older than the installed version, when upgrade runs, then it exits with downgrade-unsupported and makes no file changes.
  - Given the installed version is newer than the default latest stable resolved from tags, when upgrade runs without `--version`, then it reports installed-newer-than-latest and makes no file changes.
  - Given a newer explicit version is requested, when upgrade runs, then it prepares an upgrade plan to that version.

Upgrade detection uses this minimum classification table. Dedicated migration of old manual installs remains out of scope; the installer only recognizes enough state to refuse safely or apply a conservative upgrade.

| State | Minimum signal | Behavior |
|---|---|---|
| `manifest-installed` | `amadeus/.installer/amadeus-setup-manifest.json` exists and has matching `harness` plus required fields | Use manifest version, file list, and expected md5 values |
| `manual-or-unknown` | No installer manifest, but selected harness sentinel files exist | Conservative upgrade may proceed; existing shared files are treated as user-modified unless expected md5 can be derived from the selected source distribution |
| `partial` | Some, but not all, selected harness sentinel files exist | Report partial installation; non-interactive apply fails unless `--force` is present |
| `none` | No selected harness sentinel files exist | Exit with instruction to run `install` |
| `unsupported-layout` | Files indicate an older or unrecognized Amadeus layout outside current harness sentinels | Exit with unsupported-layout and modify no files |

Minimum harness sentinel files are:

| Harness | Sentinel files/directories |
|---|---|
| `claude` | `.claude/` and `amadeus/` |
| `codex` | `.codex/`, `.agents/`, `AGENTS.md`, and `amadeus/` |
| `kiro` | `.kiro/`, `AGENTS.md`, and `amadeus/` |
| `kiro-ide` | `.kiro/`, `AGENTS.md`, and `amadeus/` |

### FR-007: Distribution Version Resolution

The system shall fetch Amadeus distribution artifacts from GitHub tag archives, using stable SemVer tags as the primary default resolver.

- Priority: Must
- Source: requirements Q5, `architecture.md`, `scope-document.md`
- Acceptance:
  - Given no explicit version is supplied, when install or upgrade resolves a distribution, then it selects the highest stable SemVer tag from canonical repository `https://github.com/amadeus-dlc/amadeus`.
  - Given repository metadata is emitted in package metadata or docs, then it uses `amadeus-dlc/amadeus`.
  - Given tags are listed, then stable tags match `vMAJOR.MINOR.PATCH` or `MAJOR.MINOR.PATCH` with no prerelease segment.
  - Given both `v1.2.3` and `1.2.3` exist for the same version, then `v1.2.3` is preferred as the canonical source tag and the duplicate is reported as ignored.
  - Given GitHub Release metadata exists for the selected tag, then the CLI may use it as supplemental metadata but not as the primary ordering source.
  - Given prerelease tags exist, then tags containing a SemVer prerelease segment are excluded from default resolution.
  - Given draft releases exist, then they are ignored for default metadata selection.
  - Given no stable SemVer tag exists, then the CLI exits with a no-stable-version error and modifies no files.
  - Given `--version 1.2.3` is supplied and tag `v1.2.3` exists, then the CLI resolves to `v1.2.3`.
  - Given `--version 1.2.3` is supplied and only tag `1.2.3` exists, then the CLI resolves to `1.2.3`.
  - Given `--version v1.2.3` is supplied, then the CLI requires exact tag `v1.2.3`.
  - Given `--version` includes a prerelease segment, then the CLI permits that prerelease only because it was explicitly requested.
  - Given the requested version/tag cannot be resolved, then the CLI exits with version-not-found and modifies no files.
  - Given multiple stable versions exist, then SemVer ordering determines latest, not lexicographic string ordering.

### FR-008: File-Level Plan And Report

The system shall produce a file-level report before applying changes.

- Priority: Must
- Source: `scope-document.md` P3, `team-practices.md`
- Acceptance:
  - Given install or upgrade has resolved source and target files, when changes are planned, then the report lists files to add, update, skip, back up, or conflict.
  - Given non-interactive mode, then the report is printed before exit or apply so CI logs remain auditable.
  - Given `--force` is present, then the report clearly marks which operations were force-applied.

### FR-009: Non-Destructive Shared-File Policy

The system shall use expected md5 checksums to decide whether shared non-`amadeus-*` files can be overwritten.

- Priority: Must
- Source: previous requirements Q1, requirements Q6
- Acceptance:
  - Given a target shared file's md5 equals the expected md5 for the previously installed framework version, when upgrade applies, then the file may be overwritten.
  - Given a target shared file's md5 differs from the expected md5, when install or upgrade applies, then the existing file is moved to `$namefile.$timestamp.bk` and the new file is copied.
  - Given no expected md5 is available for an existing shared non-`amadeus-*` file, when install or upgrade applies, then the file is treated as user-modified and is moved to `$namefile.$timestamp.bk` before the new file is copied.
  - Given multiple files are backed up in one operation, then `$timestamp` is the single operation-start timestamp shared by all backup file names.

File ownership classes are determined from the selected source distribution plus installer manifest metadata:

| Class | Source of truth | Behavior when existing target differs |
|---|---|---|
| `owned` | Files under harness-managed runtime trees whose path is not classified as shared/user-preserved | May update after report; backup not required unless future manifest marks it shared |
| `shared` | Manifest entries for files expected to be user-visible or non-`amadeus-*` shared surfaces, including examples such as `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.codex/config.toml`, and `.kiro/settings/cli.json` where applicable | Compare expected md5; backup before copy when changed or unknown |
| `user-preserved` | Local workspace state, memory, intents, audit, local settings, and files excluded by manifest | Skip and never overwrite |

For install without an existing manifest, any existing target file at a `shared` path is treated as unknown and backed up before copy if the operation proceeds.

### FR-010: Force Override

The system shall provide `--force` to bypass prompts and collision aborts while preserving backup of changed or unknown shared files.

- Priority: Must
- Source: requirements Q6, `team-practices.md`
- Acceptance:
  - Given `--force` is absent in interactive mode, then collisions are presented for confirmation before apply.
  - Given `--force` is absent in non-interactive mode, then collisions abort the operation.
  - Given `--force` is present, then install and upgrade may proceed without interactive confirmation for collisions.
  - Given `--force` is present in a TTY and `--harness` or `--target` is missing, then the CLI may still prompt for missing values.
  - Given `--force` is present in non-interactive mode and `--harness` or `--target` is missing, then the CLI exits with a validation error.
  - Given a changed or unknown shared file is encountered with `--force`, then it is still backed up before the new file is copied.

`--yes` and `--force` combinations follow this contract:

| Flags | Prompt behavior | Missing `--harness`/`--target` | Collision behavior |
|---|---|---|---|
| none in TTY | prompts allowed | prompt allowed | prompt allowed |
| `--yes` | prompts suppressed | validation error; no file changes | abort unless `--force`; no file changes |
| `--force` in TTY | value prompts allowed, collision prompts bypassed | prompt allowed | apply with required shared-file backups |
| `--yes --force` | prompts suppressed | validation error; no file changes | apply with required shared-file backups |

### FR-011: Non-Interactive Mode

The system shall support non-interactive execution for CI and scripts.

- Priority: Must
- Source: previous requirements Q5
- Acceptance:
  - Given non-interactive mode, then `--harness` and `--target` are required.
  - Given `--version` is omitted, then version resolution uses the default stable SemVer tag policy.
  - Given validation fails, then the CLI exits non-zero with human-readable stderr and modifies no files.
  - Given `--yes` is present in a TTY, then prompts are suppressed and the command follows non-interactive validation.

### FR-012: Network Failure Handling

The system shall retry GitHub archive fetch once before failing.

- Priority: Must
- Source: previous requirements Q4
- Acceptance:
  - Given the first archive fetch fails due to a transient network error, when retry succeeds, then installation proceeds.
  - Given both attempts fail, then the CLI exits with a classified error and a concrete retry instruction.

### FR-013: Install Manifest

The system shall write an installer manifest at `amadeus/.installer/amadeus-setup-manifest.json` in the target project.

- Priority: Must
- Source: previous reviewer findings, requirements Q6/Q8
- Acceptance:
  - Given install completes, then the target contains an installer manifest readable by future upgrade runs.
  - Given upgrade completes, then the manifest is updated to the newly installed version.
  - Given QA reads the manifest, then it contains at minimum: `schemaVersion`, `installerPackageVersion`, `distributionVersion`, `sourceTag`, `installedAt`, `harness`, and `files[]`.
  - Given QA reads `files[]`, then each entry contains at minimum: `path`, `class`, `required`, and `md5`; `class` is one of `owned`, `shared`, or `user-preserved`.
  - Given post-install verification runs, then the required file list is read from the manifest.

### FR-014: Post-Install Verification

The system shall verify installation success with file existence checks and an `/amadeus --doctor`-equivalent readiness check.

- Priority: Must
- Source: previous requirements Q6
- Acceptance:
  - Given files are copied, then required files for the selected harness exist according to the installer manifest.
  - Given the target is ready, then the doctor-equivalent check reports at least: harness directory present, tools directory present, active-space memory shell present, and state/intent absence handled without failure.
  - Given verification fails, then the CLI reports failed checks and exits non-zero.

### FR-015: Documentation Update

The system shall update user-facing documentation to replace manual copy installation with the installer flow.

- Priority: Must
- Source: `intent-statement.md` success metric 2, `scope-document.md` P5
- Acceptance:
  - Given README install instructions are inspected, then manual `cp -r dist/<harness>` instructions are no longer the primary path.
  - Given docs reference installation, then they mention `bunx`, best-effort `npx` behavior, supported harness selection, `install`, and `upgrade`.
  - Given docs describe Node/npm usage, then they clearly state Bun is required for this release.

### FR-016: CI And Package Validation Gates

The system shall add blocking installer validation to the existing CI path.

- Priority: Must
- Source: requirements Q4, `team-practices.md`
- Acceptance:
  - Given a PR changes `packages/setup/**`, installer tests, installer docs, release workflow, package metadata, or installer-owned CI configuration, then it is installer-related.
  - Given an installer-related PR runs CI, then package dry-run, installer smoke/integration tests, dependency audit or OSV, secret scan, coverage registry/ratchet, typecheck, lint, `dist:check`, and `promote:self:check` are blocking.
  - Given coverage registry is stale or ratchet decreases, then CI fails.
  - Given dependency audit or OSV finds a High or Critical vulnerability reachable from installer runtime or publish tooling, then CI fails by default unless an explicit allowlist entry with rationale exists.
  - Given secret scan finds any verified secret, then CI fails.

### FR-017: Manual Release Workflow

The system shall provide a manually triggered GitHub Actions release workflow for installer publication.

- Priority: Must
- Source: requirements Q3/Q8, `team-practices.md`
- Acceptance:
  - Given a maintainer opens GitHub Actions, then a `workflow_dispatch` release workflow is available for installer publication.
  - Given no explicit tag input is supplied, then the workflow selects the latest stable SemVer tag.
  - Given a stable tag is selected, then the workflow can build/package `@amadeus-dlc/setup`, run release validation, and publish through the configured npm release path.
  - Given release validation runs, then SBOM/provenance generation is required in the release workflow.

## Non-Functional Requirements

### NFR-001: Install Time

New project installation should complete within 1 minute under normal network conditions.

- Source: `intent-statement.md` success metric 1
- Verification: smoke or integration test with cached/mocked GitHub archive where appropriate.

### NFR-002: Safety

Install and upgrade must preserve user customizations by avoiding silent destructive overwrite.

- Source: `intent-statement.md` success metric 3, requirements Q6
- Verification: tests assert changed/unknown shared files are backed up with one operation timestamp before new files are copied.

### NFR-003: Traceability

Every installer-owned file operation must be explainable from the pre-apply report and manifest.

- Source: `scope-document.md`, `team-practices.md`
- Verification: tests assert report and manifest entries for add/update/skip/backup/conflict paths.

### NFR-004: Portability

Installer behavior must work on macOS, Linux, and Windows-compatible shells where Bun is available.

- Source: codebase portability practice
- Verification: path handling tests avoid POSIX-only assumptions; file backup naming is valid on supported platforms.

### NFR-005: Dependency Discipline

The shipped framework's user-side premise remains Bun-first. Any new runtime dependency introduced by the installer must be documented and justified.

- Source: `team-practices.md`, `project.md`
- Verification: dependency manifest review and package contents test.

### NFR-006: Human-Readable CLI

`amadeus-setup` must default to human-readable terminal output while keeping internal operations structured enough for tests and automation.

- Source: requirements Q6, `team-practices.md`
- Verification: CLI tests assert stderr/stdout shape for validation errors, reports, and success messages.

## Constraints

| ID | Constraint | Source |
|---|---|---|
| CON-001 | Package name is `@amadeus-dlc/setup`; npm org scope availability must be confirmed before publish. | `scope-document.md` |
| CON-002 | Implementation is Bun-first TypeScript. Full Node-only compatibility is out of scope for this release. | requirements Q1 |
| CON-003 | Installer source lives under `packages/setup/`; root package remains dev-only. | requirements Q2 |
| CON-004 | Existing `core/`, `harness/`, `dist/`, and `scripts/` paths must not be moved in this intent. | requirements Q2 |
| CON-005 | Distribution artifacts are fetched from GitHub tag archives; offline install is out of scope. | `scope-document.md`, requirements Q5 |
| CON-006 | Source edits must occur in `core/` or `harness/<name>/`; generated `dist/` must not be hand-edited. | `team-practices.md` |
| CON-007 | User-visible change requires version, README badge, and CHANGELOG synchronization unless classified as docs/test/internal-only. | `project.md` |

## Assumptions

| ID | Assumption | Validation |
|---|---|---|
| ASM-001 | Stable SemVer tags are the correct source of truth for default distribution resolution. | FR-007 acceptance tests. |
| ASM-002 | Expected md5 values can be stored in the installer manifest written by install/upgrade. | FR-013 implementation and tests. |
| ASM-003 | Moving changed files to `.bk` before copying new files satisfies "customizations are not lost." | FR-009 and NFR-002 tests. |
| ASM-004 | `/amadeus --doctor` equivalent can run from the target after files are copied without requiring an active workflow. | FR-014 verification. |
| ASM-005 | Release workflow can publish from latest stable tag without relying on GitHub Release as the primary ordering source. | FR-017 release workflow tests/dry-run. |

## Out Of Scope

- Full repo workspace/package-layout normalization beyond adding `packages/setup/`
- Organization-wide multi-project rollout
- Offline installer with bundled `dist`
- Rollback restore workflow beyond file backups made during install/upgrade
- Full Node-only runtime compatibility for the installer
- Multiple harnesses in one installer invocation
- Automatic publish on ordinary `main` merge
- Manual local npm publish as the primary release path
- New standalone `doctor` subcommand in the installer separate from the doctor-equivalent install verification
- Full content diff display beyond file-level report

## Open Questions

| ID | Question | Owner | Target Stage |
|---|---|---|---|
| OQ-001 | What exact required file list is emitted into the manifest for each harness? | Developer | Functional Design |
| OQ-002 | Which concrete dependency audit/OSV and secret scan tools are used in CI? | DevSecOps | NFR Requirements / CI Pipeline |
| OQ-003 | What npm credentials/environment protection is used by the manual release workflow? | Pipeline Deploy | CI Pipeline / Deployment Pipeline |

## Traceability Matrix

| Req ID | Priority | Source | Design Ref | Unit Ref | Test Ref |
|---|---|---|---|---|---|
| FR-001 | Must | `scope-document.md`, `team-practices.md` | TBD | TBD | TBD |
| FR-002 | Must | requirements Q1 | TBD | TBD | TBD |
| FR-003 | Must | requirements Q2 | TBD | TBD | TBD |
| FR-004 | Must | `intent-statement.md` Q4 | TBD | TBD | TBD |
| FR-005 | Must | `scope-document.md` P2, requirements Q7/Q8 | TBD | TBD | TBD |
| FR-006 | Must | `scope-document.md` P3, requirements Q8 | TBD | TBD | TBD |
| FR-007 | Must | requirements Q5, `architecture.md` | TBD | TBD | TBD |
| FR-008 | Must | `scope-document.md` P3 | TBD | TBD | TBD |
| FR-009 | Must | previous requirements Q1, requirements Q6 | TBD | TBD | TBD |
| FR-010 | Must | requirements Q6 | TBD | TBD | TBD |
| FR-011 | Must | previous requirements Q5 | TBD | TBD | TBD |
| FR-012 | Must | previous requirements Q4 | TBD | TBD | TBD |
| FR-013 | Must | reviewer findings, requirements Q6/Q8 | TBD | TBD | TBD |
| FR-014 | Must | previous requirements Q6 | TBD | TBD | TBD |
| FR-015 | Must | `intent-statement.md`, `scope-document.md` | TBD | TBD | TBD |
| FR-016 | Must | requirements Q4, `team-practices.md` | TBD | TBD | TBD |
| FR-017 | Must | requirements Q3/Q8, `team-practices.md` | TBD | TBD | TBD |
| NFR-001 | Must | `intent-statement.md` success metric 1 | TBD | TBD | TBD |
| NFR-002 | Must | `intent-statement.md` success metric 3 | TBD | TBD | TBD |
| NFR-003 | Must | `scope-document.md`, `team-practices.md` | TBD | TBD | TBD |
| NFR-004 | Should | codebase practice | TBD | TBD | TBD |
| NFR-005 | Must | `team-practices.md`, `project.md` | TBD | TBD | TBD |
| NFR-006 | Must | requirements Q6, `team-practices.md` | TBD | TBD | TBD |
