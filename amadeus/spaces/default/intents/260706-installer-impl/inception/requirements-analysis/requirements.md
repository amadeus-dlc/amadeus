# Requirements — インストーラの実装

> Stage: requirements-analysis / Intent: `260706-installer-impl` / Scope: feature  
> Sources: `intent-statement.md`, `scope-document.md`, `feasibility-assessment.md`, `constraint-register.md`, `intent-backlog.md`, `business-overview.md`, `architecture.md`, `code-structure.md`, `team-practices.md`, `requirements-analysis-questions.md`

## Intent Analysis

Amadeus の現行導入方式は、ユーザーが `dist/<harness>/` を自プロジェクトへ手動コピーする方式である。この intent は、初回導入、更新、導入ミス防止をまとめて解決する npm 配布インストーラ `@amadeus-dlc/setup` を実装する。

主な利用者は、新規に Amadeus を試す OSS 利用者と、既に導入済みでバージョンアップしたい既存ユーザーである。成功状態は、クローン不要の 1 コマンド導入、既存カスタマイズを失わない更新、README から手動コピー手順を削除できる導入体験である。

## Functional Requirements

### CLI Contract

The minimum user-visible command contract is:

```bash
amadeus-setup init [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
```

- Default command: running `amadeus-setup` with no subcommand is equivalent to interactive `amadeus-setup init`.
- Interactive mode: selected when stdin is a TTY and `--yes` is absent. Missing values may be prompted.
- Non-interactive mode: selected when `--yes` is present or stdin is not a TTY. In non-interactive mode, `--harness` and `--target` are required.
- `--harness`: target harness to install or upgrade. Initial release accepts one harness per invocation.
- `--target`: project root to modify. Defaults to current working directory only in interactive mode.
- `--version`: optional explicit Amadeus distribution version. If omitted, the default version resolution policy in FR-006 applies.
- `--force`: bypasses collision prompts/aborts only. It does not imply non-interactive mode, does not fill missing required values, and does not remove the backup requirement for changed or unknown shared files.

### FR-001: npm CLI Package

The system shall provide an npm package named `@amadeus-dlc/setup` with executable bin `amadeus-setup`.

- Priority: Must
- Source: `scope-document.md` P4, `constraint-register.md` T1/T2
- Acceptance:
  - Given the package is installed or invoked through `bunx`/`npx`, when the user runs the command, then the CLI entrypoint starts without requiring a repository clone.
  - Given package metadata is inspected, then license and repository fields reflect the actual MIT + Apache-2.0 dual-license and repository location.

### FR-002: Bunx and Npx Invocation

The system shall support both `bunx @amadeus-dlc/setup` and `npx @amadeus-dlc/setup`.

- Priority: Must
- Source: `intent-statement.md`, `constraint-register.md` T2
- Acceptance:
  - Given Bun is available, when the user runs the bunx command, then the CLI executes successfully.
  - Given Node/npm is available, when the user runs the npx command, then the CLI executes successfully.

### FR-003: Harness Selection

The system shall let users select exactly one supported harness target per invocation: `claude`, `codex`, `kiro`, or `kiro-ide`.

- Priority: Must
- Source: `intent-statement.md` Q4, `scope-document.md`
- Acceptance:
  - Given interactive mode, when no harness is provided, then the CLI prompts for harness selection.
  - Given non-interactive mode, when `--harness` is missing, then the CLI exits with a clear validation error.
  - Given a user provides multiple harnesses in one invocation, then the CLI exits with an unsupported-multiple-harnesses error and instructs the user to run one command per harness.

### FR-004: Init Command

The system shall provide an `init` flow that installs the selected harness files into a target project.

- Priority: Must
- Source: `scope-document.md` P2
- Acceptance:
  - Given a clean target project, when the user runs init with a selected harness, then required harness files are copied into the target.
  - Given installation completes, then the system reports installed harness, version, target path, and next steps.

### FR-005: Upgrade Command

The system shall provide an `upgrade` flow that updates an existing Amadeus installation to a newer distribution version.

- Priority: Must
- Source: `scope-document.md` P3
- Acceptance:
  - Given a clean existing installation with an installer manifest, when upgrade runs, then the CLI detects installed harness and version and prepares an update plan.
  - Given a manual-copy installation without a manifest but with recognizable harness files, when upgrade runs, then the CLI classifies it as `manual-or-unknown` and prepares a conservative plan that backs up changed shared files before copying.
  - Given a partial installation with missing required files, when upgrade runs, then the CLI reports partial state and refuses non-interactive apply unless `--force` is present.
  - Given no recognizable installation exists, when upgrade runs, then the CLI exits with an instruction to run `init`.
  - Given an unsupported old layout is detected, when upgrade runs, then the CLI exits with a clear unsupported-layout message and no files are modified.
  - Given the installed version equals the resolved or requested version, when upgrade runs, then it reports already-up-to-date and makes no file changes.
  - Given the requested version is older than the installed version, when upgrade runs, then it exits with downgrade-unsupported and makes no file changes.
  - Given the installed version is newer than the default latest stable resolved from GitHub, when upgrade runs without `--version`, then it reports installed-newer-than-latest and makes no file changes.
  - Given a newer explicit version is requested, when upgrade runs, then it prepares an upgrade plan to that version.
  - Given upgrade completes, then framework-owned files are updated according to the non-destructive merge policy.

### FR-006: Distribution Fetch

The system shall fetch Amadeus distribution artifacts from GitHub tag archives.

- Priority: Must
- Source: `feasibility-assessment.md`, `constraint-register.md` T3, Q2 answer
- Acceptance:
  - Given no explicit version is supplied, when init or upgrade fetches a distribution, then it resolves the latest stable GitHub Release first.
  - Given GitHub Releases are unavailable but tags are available, then it resolves the highest stable SemVer tag.
  - Given prerelease versions exist, then versions containing a SemVer prerelease segment are excluded from default resolution.
  - Given draft releases exist, then draft releases are excluded from default resolution.
  - Given no stable release or stable SemVer tag exists, then the CLI exits with a no-stable-version error and no files are modified.
  - Given `--version` is supplied, then the CLI fetches the exact matching GitHub tag; prerelease tags are allowed only when explicitly requested.
  - Given multiple stable versions exist, then SemVer ordering determines latest, not lexicographic string ordering.

### FR-007: File-Level Diff Report

The system shall produce a file-level report before applying changes.

- Priority: Must
- Source: `scope-document.md` P3
- Acceptance:
  - Given init or upgrade has resolved source and target files, when changes are planned, then the report lists files to add, update, skip, back up, or conflict.
  - Given non-interactive mode, then the report is printed before exit or apply so CI logs remain auditable.

### FR-008: Non-Destructive Shared-File Policy

The system shall use expected md5 checksums to decide whether shared non-`amadeus-*` files can be overwritten.

- Priority: Must
- Source: requirements Q1, `constraint-register.md` T5
- Acceptance:
  - Given a target shared file's md5 equals the expected md5 for the previously installed framework version, when upgrade applies, then the file may be overwritten.
  - Given a target shared file's md5 differs from the expected md5, when upgrade applies, then the existing file is moved to `$namefile.$timestamp.bk` and the new file is copied.
  - Given no expected md5 is available for an existing shared non-`amadeus-*` file, when init or upgrade applies, then the file is treated as user-modified and is moved to `$namefile.$timestamp.bk` before the new file is copied.
  - Given multiple files are backed up in one install or upgrade operation, then `$timestamp` is the single install-start timestamp shared by all backup file names.

### FR-009: Force Override

The system shall provide `--force` to bypass prompts and collision aborts while preserving backup of changed shared files.

- Priority: Must
- Source: `intent-statement.md` Q5, `scope-document.md`
- Acceptance:
  - Given `--force` is absent in interactive mode, then collisions are presented for confirmation before apply.
  - Given `--force` is absent in non-interactive mode, then collisions abort the operation.
  - Given `--force` is present, then init and upgrade may proceed without interactive confirmation for collisions.
  - Given `--force` is present in a TTY and `--harness` or `--target` is missing, then the CLI may still prompt for missing values because `--force` does not imply non-interactive mode.
  - Given `--force` is present in non-interactive mode and `--harness` or `--target` is missing, then the CLI exits with a validation error.
  - Given a changed shared file is encountered with `--force`, then it is still moved to `$namefile.$timestamp.bk` before the new file is copied.
  - Given an existing shared file has no expected md5 with `--force`, then it is still backed up before copy.
  - Given an installer-owned `amadeus-*` file is encountered with `--force`, then it may be overwritten without backup unless the file is also classified as shared user-editable.
  - Given `--force` is present, then the pre-apply report clearly marks which operations were force-applied.

### FR-010: Init Collision Handling

The system shall handle existing target files differently for interactive and non-interactive init.

- Priority: Must
- Source: requirements Q3
- Acceptance:
  - Given interactive init finds existing harness files, when collision is detected, then the CLI asks the user whether to proceed.
  - Given non-interactive init finds collisions, then the CLI aborts with a collision report unless an explicit override is supplied.

### FR-011: Non-Interactive Mode

The system shall support non-interactive execution for CI and scripts.

- Priority: Must
- Source: `scope-document.md`, requirements Q5
- Acceptance:
  - Given non-interactive mode, then `--harness` and `--target` are required.
  - Given `--version` is omitted, then version resolution uses the default latest tag policy.

### FR-012: Network Failure Handling

The system shall retry GitHub archive fetch once before failing.

- Priority: Must
- Source: requirements Q4, `feasibility-assessment.md` R2
- Acceptance:
  - Given the first archive fetch fails due to a transient network error, when retry succeeds, then installation proceeds.
  - Given both attempts fail, then the CLI exits with a classified error and a concrete retry instruction.

### FR-013: Post-Install Verification

The system shall verify installation success with file existence checks and a `/amadeus --doctor`-equivalent readiness check.

- Priority: Must
- Source: requirements Q6
- Acceptance:
  - Given files are copied, then required files for the selected harness exist according to the generated install manifest.
  - Given the target is ready, then the doctor-equivalent check reports at least: harness directory present, tools directory present, active-space memory shell present, and state/intent absence handled without failure.
  - Given verification fails, then the CLI reports failed checks and exits non-zero.

### FR-016: Install Manifest

The system shall write an installer manifest at `amadeus/.installer/amadeus-setup-manifest.json` in the target project. The manifest records installed harness, version, source tag, install timestamp, required file list, and expected md5 checksums for framework-managed shared files.

- Priority: Must
- Source: reviewer finding, requirements Q1/Q6
- Acceptance:
  - Given init completes, then the target contains an installer manifest readable by future upgrade runs.
  - Given upgrade completes, then the manifest is updated to the newly installed version.
  - Given QA reads the manifest, then it contains at minimum: `schemaVersion`, `installerPackageVersion`, `distributionVersion`, `sourceTag`, `installedAt`, `harness`, and `files[]`.
  - Given QA reads `files[]`, then each entry contains at minimum: `path`, `class`, `required`, and `md5`; `class` is one of `owned`, `shared`, or `user-preserved`.
  - Given a shared file is evaluated during upgrade, then expected md5 is read from the manifest or the operation is classified as manual-or-unknown and handled conservatively.
  - Given post-install verification runs, then the required file list is read from the manifest.

### FR-014: Documentation Update

The system shall update user-facing documentation to replace manual copy installation with the installer flow.

- Priority: Must
- Source: `intent-statement.md` success metric 2, `scope-document.md` P5
- Acceptance:
  - Given README install instructions are inspected, then manual `cp -r dist/<harness>` instructions are no longer the primary path.
  - Given docs reference installation, then they mention `bunx`/`npx`, supported harness selection, init, and upgrade.

### FR-015: Publish Documentation

The system shall include npm publish procedure documentation for the initial release.

- Priority: Must
- Source: requirements Q7
- Acceptance:
  - Given maintainers prepare a release, then docs describe package build, metadata checks, manual publish steps, and post-publish verification.
  - Given CI auto-publish is out of scope, then docs do not require it for initial release.

## Non-Functional Requirements

### NFR-001: Install Time

New project installation should complete within 1 minute under normal network conditions.

- Source: `intent-statement.md` success metric 1
- Verification: E2E test or scripted smoke test measuring elapsed time with a cached or mocked GitHub archive where appropriate.

### NFR-002: Safety

Upgrade must preserve user customizations by avoiding silent destructive overwrite.

- Source: `intent-statement.md` success metric 3, requirements Q1
- Verification: Test changed shared files are backed up with one operation timestamp before new files are copied.

### NFR-003: Traceability

Every installer-owned file operation must be explainable from the pre-apply report.

- Source: `scope-document.md`, practices-discovery
- Verification: Tests assert report entries for add/update/skip/backup/conflict paths.

### NFR-004: Portability

Installer behavior must work on macOS, Linux, and Windows-compatible shells where Bun/Node are available.

- Source: project codebase portability practice
- Verification: path handling tests avoid POSIX-only assumptions; file backup naming is valid on supported platforms.

### NFR-005: Dependency Discipline

The shipped framework's user-side premise remains Bun-only. Any new runtime dependency introduced by the installer must be documented and justified.

- Source: practices-discovery `discovered-rules.md`, project guardrails
- Verification: dependency manifest review and package contents test.

### NFR-006: CI Compatibility

Installer changes must preserve existing validation commands: `bun run typecheck`, `bun run lint`, `bun run dist:check`, `bun run promote:self:check`, and relevant `tests/run-tests.sh` profile.

- Source: `team-practices.md`
- Verification: CI and local test run.

## Constraints

| ID | Constraint | Source |
|---|---|---|
| CON-001 | Package name is `@amadeus-dlc/setup`; npm org scope availability must be confirmed before publish. | `constraint-register.md` T1 |
| CON-002 | Implementation is Bun/TypeScript, with JS build output for npx compatibility. | `constraint-register.md` T2/T4 |
| CON-003 | Distribution artifacts are fetched from GitHub tag archives; offline install is out of scope. | `constraint-register.md` T3, scope W2 |
| CON-004 | Initial release does not include npm provenance or CI auto-publish. | `scope-document.md` W5, requirements Q7 |
| CON-005 | Source edits must occur in `core/` or `harness/<name>/`; generated `dist/` must not be hand-edited. | `team-practices.md` |
| CON-006 | User-visible change requires version, README badge, and CHANGELOG synchronization unless classified as docs/test/internal-only. | `project.md` |

## Assumptions

| ID | Assumption | Validation |
|---|---|---|
| ASM-001 | The latest stable GitHub Release/tag is an acceptable default for installer version resolution. | Requirements define stable SemVer and release/tag precedence in FR-006. |
| ASM-002 | Expected md5 values are stored in the installer manifest written by init/upgrade. | FR-016 makes manifest creation a requirement. |
| ASM-003 | Moving changed files to `.bk` before copying new files satisfies "customizations are not lost." | User confirmed the backup-and-copy policy in Q1. |
| ASM-004 | `/amadeus --doctor` equivalent can run from the target after files are copied without requiring an active workflow. | Verify against current doctor implementation. |
| ASM-005 | npm package publication remains manual for the first release. | Publish docs will encode manual process. |

## Out of Scope

- Organization-wide multi-project rollout
- Offline installer with bundled `dist`
- Rollback restore workflow beyond file backups made during install/upgrade
- Dedicated migration flow for old manual installs beyond normal init/upgrade behavior
- npm provenance and CI automated publish
- New `doctor` subcommand in the installer separate from existing `/amadeus --doctor`
- Full content diff display beyond file-level report

## Open Questions

| ID | Question | Owner | Target Stage |
|---|---|---|---|
| OQ-001 | What exact file list is emitted into the manifest for each harness? | Developer | Functional Design |
| OQ-002 | What package build format best supports both bunx and npx while preserving TypeScript source maintainability? | Developer | Application Design |

## Traceability Matrix

| Req ID | Priority | Source | Design Ref | Unit Ref | Test Ref |
|---|---|---|---|---|---|
| FR-001 | Must | P4 / T1 / T2 | TBD | TBD | TBD |
| FR-002 | Must | T2 | TBD | TBD | TBD |
| FR-003 | Must | Intent Q4 | TBD | TBD | TBD |
| FR-004 | Must | P2 | TBD | TBD | TBD |
| FR-005 | Must | P3 | TBD | TBD | TBD |
| FR-006 | Must | T3 / Q2 | TBD | TBD | TBD |
| FR-007 | Must | P3 | TBD | TBD | TBD |
| FR-008 | Must | Q1 / T5 | TBD | TBD | TBD |
| FR-009 | Must | Intent Q5 | TBD | TBD | TBD |
| FR-010 | Must | Q3 | TBD | TBD | TBD |
| FR-011 | Must | Q5 | TBD | TBD | TBD |
| FR-012 | Must | Q4 / R2 | TBD | TBD | TBD |
| FR-013 | Must | Q6 | TBD | TBD | TBD |
| FR-014 | Must | Success metric 2 | TBD | TBD | TBD |
| FR-015 | Must | Q7 | TBD | TBD | TBD |
| FR-016 | Must | Q1 / Q6 / Review | TBD | TBD | TBD |
| NFR-001 | Must | Success metric 1 | TBD | TBD | TBD |
| NFR-002 | Must | Success metric 3 / Q1 | TBD | TBD | TBD |
| NFR-003 | Must | P3 | TBD | TBD | TBD |
| NFR-004 | Should | Codebase practice | TBD | TBD | TBD |
| NFR-005 | Must | Practices Discovery | TBD | TBD | TBD |
| NFR-006 | Must | Team Practices | TBD | TBD | TBD |

## Review Iteration 1

Verdict: NOT-READY

### Findings

1. Default version resolution is not testable enough. FR-006 says "latest GitHub Release/tag" and OQ-001 defers prerelease/draft handling to Application Design, but this is a requirements-level behavior because QA must know which version should be fetched. Required fix: define the exact source and ordering policy, including Release vs tag precedence, SemVer sorting, prerelease inclusion/exclusion, draft release exclusion, and behavior when no release exists.

2. The CLI command contract is incomplete. FR-001 names the package and bin, while FR-004/FR-005 refer to `init` and `upgrade` flows, but the artifact does not specify exact invocation forms, default command behavior, required/optional flags, or how interactive vs non-interactive mode is selected. Required fix: add a minimal CLI contract covering `amadeus-setup init`, `amadeus-setup upgrade`, `--harness`, `--target`, `--version`, `--force`, and the flag or condition that makes execution non-interactive.

3. `--force` behavior conflicts with the safety requirement. FR-008 requires changed shared files to be backed up before copying new files, but FR-009 says `--force` allows overwrite behavior and bypasses safety checks. This leaves engineering and QA unable to determine whether `--force` skips backups, only bypasses prompts, or changes collision handling for init only. Required fix: state the exact `--force` semantics per operation and file class, and preserve the non-destructive customization guarantee unless explicitly declared out of scope.

4. Post-install verification is underspecified. FR-013 requires file existence checks and a `/amadeus --doctor`-equivalent readiness check, while OQ-003 leaves the required file list to later stages. QA cannot write acceptance tests without knowing the source of truth for "required files" per harness and the observable pass/fail criteria for the doctor-equivalent check. Required fix: define either the required file manifest location and required check outputs, or make manifest generation itself a requirement with acceptance criteria.

5. Upgrade planning lacks boundary conditions. FR-005 requires detecting current installation state and preparing an update plan, but the artifact does not define what counts as an existing installation, how manual-copy installs are detected, what happens with unknown versions, partial installs, or unsupported old layouts. Required fix: add acceptance criteria for clean installed state, unknown/manual state, partial state, and no-installation state.

### Scope Control Notes

- The out-of-scope list is useful and appropriately excludes offline install, rollback restore, CI auto-publish, and full content diff display.
- The requirements should avoid deferring user-visible behavior such as version selection and command syntax to design stages; those are product contract decisions, not implementation details.

### Required Fixes Before Engineering

- Resolve findings 1-5 in the requirements artifact.
- Update acceptance criteria so each corrected behavior has a deterministic QA assertion.
- Keep remaining design-stage questions limited to implementation choices that do not alter user-visible behavior.

## Review

Verdict: NOT-READY

### Findings

1. Harness cardinality is contradictory. The CLI contract says the initial release accepts one harness per invocation, but FR-003 says users can select "one or more" harness targets. QA cannot know whether to reject comma-separated/multi-select harnesses or support them. Required fix: make the initial release explicitly single-harness, or define the multi-harness syntax, ordering, report, manifest, and failure semantics.

2. `--force`, `--yes`, and interactive prompting still have an ambiguous boundary. Mode selection says only `--yes` or non-TTY makes execution non-interactive, while `--force` bypasses prompts. For `amadeus-setup init --force` in a TTY with missing `--harness` or `--target`, it is unclear whether the CLI may prompt, must use defaults, or must fail. Required fix: state whether `--force` implies non-interactive execution or only collision override, and add acceptance criteria for missing required values under `--force`.

3. Upgrade version boundary conditions are incomplete. FR-005 says upgrade updates to a newer distribution version, but requirements do not define behavior when the installed version equals the resolved/requested version, when the requested version is older, when the installed version is newer than the default latest stable, or when downgrade is intentionally requested. Required fix: add deterministic acceptance criteria for same-version no-op, downgrade rejection or allowance, and newer-installed/version-resolution cases.

4. Manual-or-unknown shared-file handling is not testable enough. FR-016 says missing manifest md5 data is handled conservatively, while FR-005 says manual-copy installs back up "changed" shared files; without an expected md5, QA cannot determine what counts as changed. Required fix: define the exact conservative policy for existing shared non-`amadeus-*` files when no manifest or expected md5 is available, including init collisions and upgrade from manual-copy installs.

5. Manifest observability remains too vague for QA. FR-013 and FR-016 make the manifest the source of truth for required files and expected md5 values, but OQ-001 defers the exact manifest path and schema. Engineering can design the internal schema later, but QA needs a stable observable location and minimum required fields to assert install/upgrade behavior. Required fix: define the manifest path and minimum field contract in requirements; defer only internal formatting details if needed.

### Required Fixes Before Engineering

- Resolve findings 1-5 in the requirements artifact.
- Add acceptance criteria for each corrected branch so QA can write deterministic positive and negative tests.
- Keep later-stage open questions limited to implementation choices that do not change the user-visible CLI, upgrade safety, or manifest contract.

## Builder Resolution After Review Iteration 2

Reviewer iteration limit was reached with `NOT-READY`. The builder addressed the five iteration-2 findings before presenting the human gate:

1. Harness cardinality: FR-003 now states initial release is single-harness per invocation and rejects multiple harnesses.
2. `--force` / `--yes`: CLI Contract and FR-009 now state `--force` only bypasses collision prompts/aborts and does not imply non-interactive mode or fill missing values.
3. Upgrade version boundaries: FR-005 now covers same-version no-op, downgrade rejection, installed-newer-than-latest, and explicit newer version behavior.
4. Manual-or-unknown shared files: FR-008 now treats missing expected md5 as user-modified and backs up before copy.
5. Manifest observability: FR-016 now fixes manifest path as `amadeus/.installer/amadeus-setup-manifest.json` and defines minimum required fields.
