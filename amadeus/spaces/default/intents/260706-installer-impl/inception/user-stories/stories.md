# User Stories — インストーラの実装

> Stage: user-stories / Intent: `260706-installer-impl`  
> Breakdown: user workflow / Persona priority: New OSS user first / Granularity: thin vertical slices

## Must Have Stories

### US-001: 新規ユーザーが package entrypoint を起動できる

As a 新規 OSS ユーザー, I want `@amadeus-dlc/setup` to expose a working `amadeus-setup` bin, so that I can start the installer without cloning the repository.

**Acceptance criteria**

- Given the repository is inspected, then installer source lives under `packages/setup/` and the root package remains dev-only.
- Given package metadata is inspected, then `@amadeus-dlc/setup` exposes bin `amadeus-setup` and carries valid license, repository, and files metadata.
- Given Bun is available, when the user runs `bunx @amadeus-dlc/setup --help`, then help starts successfully.
- Given Node/npm and Bun are available, when the user runs `npx @amadeus-dlc/setup --help`, then the bin can delegate to Bun and help starts successfully.
- Given `npx @amadeus-dlc/setup --help` runs without Bun available, then the command exits non-zero with a clear Bun-required message.

**Priority**: Must Have  
**Dependencies**: None  
**Requirements**: FR-001, FR-002, FR-003, NFR-005  
**INVEST**: Thin package/runtime slice; independently testable through package metadata checks and subprocess help commands.

### US-002: 新規ユーザーが選択 harness を導入できる

As a 新規 OSS ユーザー, I want to run `amadeus-setup install --harness <h> --target <path>`, so that I can install Amadeus without cloning the repository or manually copying `dist/<harness>/`.

**Acceptance criteria**

- Given a clean target project, when `install` runs with one supported harness and target, then required files for that harness are copied.
- Given install completes, then the CLI reports harness, distribution version, source tag, target path, manifest path, and next steps.
- Given post-install verification runs, then required files exist and the doctor-equivalent readiness checks pass.

**Priority**: Must Have  
**Dependencies**: US-001  
**Requirements**: FR-001, FR-002, FR-004, FR-005, FR-014, NFR-001  
**INVEST**: Independent first walking-skeleton slice; valuable and testable end-to-end with a temp target.

### US-003: 新規ユーザーが対話モードで harness と target を選べる

As a 新規 OSS ユーザー, I want missing install values to be prompted in a TTY, so that I can complete installation without memorizing all flags.

**Acceptance criteria**

- Given stdin is a TTY and `--yes` is absent, when `--harness` is missing, then the CLI prompts for exactly one supported harness.
- Given stdin is a TTY and `--target` is missing, then the CLI may present current working directory as the default target.
- Given the user declines the pre-apply summary, then no files are modified.

**Priority**: Must Have  
**Dependencies**: US-002  
**Requirements**: CLI Contract, FR-004, FR-005, FR-008, FR-011  
**INVEST**: Small interactive variant of install; testable with a pseudo-TTY fixture.

### US-004: Automation が非対話 install を安全に実行できる

As a Contributor / CI Owner, I want non-interactive install to require explicit harness and target, so that scripts do not mutate the wrong project.

**Acceptance criteria**

- Given `--yes` is present or stdin is not a TTY, when `--harness` or `--target` is missing, then the CLI exits non-zero and modifies no files.
- Given multiple harnesses are provided in one invocation, then the CLI exits non-zero, modifies no files, and instructs the user to run one command per harness.
- Given required flags are present, when non-interactive install runs, then it prints the file-level plan before apply.
- Given collisions exist without `--force`, then non-interactive install aborts and modifies no files.

**Priority**: Must Have  
**Dependencies**: US-002  
**Requirements**: FR-008, FR-010, FR-011, NFR-002, NFR-003  
**INVEST**: Independent automation safety slice; acceptance can be verified with temp directories and exit codes.

### US-005: 既存ユーザーが manifest 付き導入を更新できる

As a 既存 Amadeus ユーザー, I want `amadeus-setup upgrade` to read the installer manifest, so that my existing installation can be updated predictably.

**Acceptance criteria**

- Given `amadeus/.installer/amadeus-setup-manifest.json` exists and matches the selected harness, when upgrade runs, then installed version, file list, and expected md5 values are read from the manifest.
- Given the target version is newer, then the CLI prepares an update plan.
- Given the installed version equals the resolved or requested version, then upgrade reports already-up-to-date and makes no file changes.
- Given the requested version is older than the installed version, then upgrade exits with downgrade-unsupported and makes no file changes.
- Given the installed version is newer than the default latest stable tag and `--version` is absent, then upgrade reports installed-newer-than-latest and makes no file changes.
- Given a newer explicit version is requested, then upgrade prepares an update plan to that version.
- Given upgrade completes, then the manifest is updated to the newly installed version and includes `schemaVersion`, `installerPackageVersion`, `distributionVersion`, `sourceTag`, `installedAt`, `harness`, and `files[]`.
- Given QA reads `files[]`, then each entry includes `path`, `class`, `required`, and `md5`.

**Priority**: Must Have  
**Dependencies**: US-002  
**Requirements**: FR-006, FR-013, FR-014  
**INVEST**: Thin upgrade happy path; independently testable with a fixture manifest.

### US-006: 既存ユーザーが手動コピー導入を保守的に更新できる

As a 既存 Amadeus ユーザー, I want manual-or-unknown installs to be handled conservatively, so that my local customizations are not silently overwritten.

**Acceptance criteria**

- Given selected harness sentinel files exist but no installer manifest exists, when upgrade runs, then the state is classified as `manual-or-unknown`.
- Given existing shared files have no expected md5, then they are treated as user-modified and backed up before copy if the operation proceeds.
- Given some but not all selected harness sentinel files exist, then the state is classified as `partial` and non-interactive apply fails unless `--force` is present.
- Given no selected harness sentinel files exist, then upgrade exits with an instruction to run `install`.
- Given files indicate an older or unrecognized Amadeus layout outside current sentinels, then upgrade exits with unsupported-layout and modifies no files.

**Priority**: Must Have  
**Dependencies**: US-005  
**Requirements**: FR-006, FR-009, NFR-002  
**INVEST**: Focused on one non-happy upgrade branch; testable with fixture target layouts.

### US-007: 既存ユーザーが変更済み shared file を backup 付きで更新できる

As a 既存 Amadeus ユーザー, I want changed shared files to be backed up before replacement, so that customizations are not lost.

**Acceptance criteria**

- Given a shared file's md5 differs from expected md5, when install or upgrade applies, then the existing file is moved to `$namefile.$timestamp.bk`.
- Given multiple backups occur in one operation, then they share the same operation-start timestamp.
- Given `--force` is present, then changed or unknown shared files are still backed up before copy.
- Given file classes are emitted, then `owned`, `shared`, and `user-preserved` are the only accepted class values.
- Given the file-level report is generated, then add/update/skip/backup/conflict operations are represented and force-applied operations are marked.
- Given report and manifest are compared, then installer-owned file operations can be traced between pre-apply report and manifest entries.

**Priority**: Must Have  
**Dependencies**: US-005  
**Requirements**: FR-008, FR-009, FR-010, FR-013, NFR-002, NFR-003  
**INVEST**: Clear safety story; independently testable with file fixtures.

### US-008: ユーザーが stable SemVer tag から version を解決できる

As a 新規 OSS ユーザー, I want the installer to choose the latest stable SemVer tag by default, so that I get a stable distribution without understanding release internals.

**Acceptance criteria**

- Given no `--version` is supplied, then the highest stable SemVer tag from `amadeus-dlc/amadeus` is selected.
- Given prerelease tags exist, then they are excluded from default resolution.
- Given `--version 1.2.3` is supplied and `v1.2.3` exists, then `v1.2.3` is selected.
- Given `--version 1.2.3` is supplied and only `1.2.3` exists, then `1.2.3` is selected.
- Given `--version v1.2.3` is supplied, then exact tag `v1.2.3` is required.
- Given both `v1.2.3` and `1.2.3` exist, then `v1.2.3` is preferred and the duplicate is reported as ignored.
- Given GitHub Release metadata exists for the selected tag, then it is supplemental and does not override SemVer tag ordering.
- Given stable tags include `v1.10.0` and `v1.2.0`, then SemVer ordering selects `v1.10.0`, not lexicographic ordering.
- Given no stable SemVer tag exists, then no-stable-version is reported and no files are modified.
- Given an explicit prerelease version is supplied, then that prerelease is allowed only because it was explicitly requested.
- Given the requested version cannot be resolved, then no files are modified and version-not-found is reported.

**Priority**: Must Have  
**Dependencies**: US-002  
**Requirements**: FR-007, FR-012  
**INVEST**: Isolated resolver behavior with user-visible outcome; testable with mocked tag lists.

### US-009: メンテナーが手動 release workflow で publish できる

As a メンテナー, I want to trigger installer publication from GitHub Actions, so that production release requires an explicit human action.

**Acceptance criteria**

- Given a maintainer opens GitHub Actions, then a `workflow_dispatch` release workflow is available.
- Given no tag input is supplied, then the workflow selects the latest stable SemVer tag.
- Given release validation runs, then package build, package dry-run, SBOM/provenance, and publish validation are required before npm publication.

**Priority**: Must Have  
**Dependencies**: US-001, US-008  
**Requirements**: FR-017  
**INVEST**: Release workflow is independently demonstrable via dry-run or protected environment.

### US-010: Contributor が installer PR を blocking gates で検証できる

As a Contributor / CI Owner, I want installer-related PRs to run blocking package, test, coverage, and security checks, so that installer changes cannot bypass release readiness.

**Acceptance criteria**

- Given a PR changes `packages/setup/**`, installer docs/tests, release workflow, package metadata, or installer-owned CI config, then installer gates run.
- Given package dry-run, installer smoke/integration, coverage registry/ratchet, typecheck, lint, dist check, or promote-self check fails, then CI fails.
- Given OSV/audit finds a High or Critical reachable vulnerability or secret scan finds a verified secret, then CI fails unless explicitly allowlisted.
- Given path handling or backup filename tests fail on supported macOS/Linux/Windows-compatible shell assumptions, then CI fails.
- Given a new installer runtime dependency is introduced, then package metadata and docs include a justification or CI fails package/dependency review.

**Priority**: Must Have  
**Dependencies**: US-001  
**Requirements**: FR-016, NFR-004, NFR-005  
**INVEST**: CI behavior is testable with workflow fixtures and negative cases.

### US-011: 新規ユーザーが README から正しい導入方法を理解できる

As a 新規 OSS ユーザー, I want README install guidance to point to `amadeus-setup install`, so that I do not follow stale manual copy instructions.

**Acceptance criteria**

- Given README install instructions are inspected, then manual `cp -r dist/<harness>` is no longer the primary path.
- Given docs mention `npx`, then they state Bun is required for this release.
- Given docs describe setup, then they include supported harness selection, `install`, `upgrade`, and expected next steps.

**Priority**: Must Have  
**Dependencies**: US-001, US-005  
**Requirements**: FR-015, NFR-006  
**INVEST**: Documentation story is independently reviewable and tied to user onboarding.

### US-012: ユーザーが network failure から再実行できる

As a 新規 OSS ユーザー, I want GitHub archive fetch failures to be retried once and explained, so that transient failures do not look like installer corruption.

**Acceptance criteria**

- Given the first archive fetch fails transiently, then one retry occurs.
- Given both attempts fail, then the CLI reports a classified error and concrete retry instruction.
- Given fetch fails, then no target files are modified.

**Priority**: Must Have  
**Dependencies**: US-008  
**Requirements**: FR-012  
**INVEST**: Narrow reliability story; testable with mocked network failures.

## Should Have Stories

## Could Have Stories

### US-013: メンテナーが release metadata を docs と照合できる

As a メンテナー, I want release docs to describe package metadata and post-publish verification, so that publication can be audited.

**Acceptance criteria**

- Given release docs are inspected, then package metadata, license, repository, package contents, release workflow, and post-publish verification are described.
- Given maintainers prepare a release, then docs point to `workflow_dispatch` rather than local manual publish as the primary path.

**Priority**: Could Have  
**Dependencies**: US-008  
**Requirements**: FR-001, FR-017  
**INVEST**: Valuable but can follow core release workflow.

## Won't Have Stories

The following user outcomes are intentionally excluded from this release and should not be implemented as part of the current intent:

- Organization-wide multi-project rollout
- Offline installer with bundled `dist`
- Rollback restore workflow beyond generated backups
- Full Node-only runtime compatibility
- Multiple harnesses in one invocation
- Automatic publish on ordinary `main` merge
- Standalone `amadeus-setup doctor`
- Full content diff display beyond file-level report
