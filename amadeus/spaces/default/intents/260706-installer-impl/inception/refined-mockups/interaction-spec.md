# Interaction Spec — インストーラの実装

> Stage: refined-mockups / Upstream: `wireframes.md`, `user-flow.md`, `stories.md`, `requirements.md`, `team-practices.md`  
> Scope: CLI and GitHub Actions developer experience for `@amadeus-dlc/setup`.

## Interaction Model

| Area | Decision |
|---|---|
| Command names | `install` and `upgrade` only; no first-release `init` alias |
| Runtime | Bun-first; `npx` is best-effort only when Bun is available |
| Mode detection | Interactive when stdin is TTY and `--yes` is absent; non-interactive when `--yes` is present or stdin is not TTY |
| Harness selection | Exactly one of `claude`, `codex`, `kiro`, `kiro-ide` |
| Plan visibility | Pre-apply plan is always printed before writes or abort |
| Confirmation | Interactive apply requires explicit confirmation; default is no-write |
| `--yes` | Suppresses prompts, requires all mandatory values, preserves validation and plan output |
| `--force` | Bypasses collision prompts but preserves changed/unknown shared-file backup |
| Errors | Classified, no-change guarantee when applicable, and one next action |

## Safety Matrix

| Flags / Context | Missing values | Collision behavior | Plan output | Backup behavior |
|---|---|---|---|---|
| Interactive TTY, no flags | Prompt allowed | Prompt before apply | Always printed | Changed/unknown shared files backed up before copy |
| `--yes` or non-TTY | Validation error | Abort without `--force` | Always printed before abort/apply | No writes on abort |
| `--force` in TTY | Prompt allowed | Apply without collision prompt | Always printed | Changed/unknown shared files backed up before copy |
| `--yes --force` | Validation error | Apply without prompts | Always printed | Changed/unknown shared files backed up before copy |

`force-update` rows must not appear for changed or unknown `shared` files unless a matching `backup` row is present in the same operation plan.

## Flow Specifications

### Install

1. Parse command and flags.
2. Validate runtime. If invoked through `npx` and Bun is unavailable, fail before target inspection.
3. Resolve missing `--harness` and `--target` only in interactive mode.
4. Reject multiple harness values.
5. Resolve distribution version from explicit version or latest stable SemVer tag.
6. Build file-operation plan.
7. Print plan.
8. In interactive mode, ask for confirmation unless `--force` bypasses collision prompts only.
9. Apply operations.
10. Write `amadeus/.installer/amadeus-setup-manifest.json`.
11. Run doctor-equivalent verification.
12. Print installed summary and next steps.

### Upgrade

1. Parse command and flags.
2. Resolve selected harness and target.
3. Classify target as `manifest-installed`, `manual-or-unknown`, `partial`, `none`, or `unsupported-layout`.
4. For `none`, fail with instruction to run `install`.
5. For `unsupported-layout`, fail with no file changes.
6. Resolve target version from explicit version or latest stable SemVer tag.
7. Compare installed and target versions: already-up-to-date, downgrade-unsupported, installed-newer-than-latest, or upgradeable.
8. Build file-operation plan from manifest md5 or conservative shared-file assumptions.
9. Print plan with add/update/skip/backup/conflict operations.
10. Confirm or apply according to interactive/`--yes`/`--force` rules.
11. Update manifest and verify.
12. Print upgraded summary.

## CLI Components

## Command Header

| Field | Value |
|---|---|
| Component | Command Header |
| Description | Identifies the tool and frames subsequent output |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| default | Prints `Amadeus Setup` once at command start | command start |
| runtime-error | Prints Bun-required failure before any target mutation | Bun unavailable |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| command | string | yes | none | `install`, `upgrade`, or `--help` |
| version | string | no | package version | Installer package version when useful |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| narrow terminal | Keep lines under approximately 100 columns; wrap detail lines |
| CI log | No spinner; every state is printed as a completed line |
| wide terminal | Same content; no extra decorative layout |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | Not applicable to CLI |
| Keyboard interaction | No interaction |
| Label | Plain heading text |
| Contrast ratio | Do not rely on color |
| Screen reader | Header is first line after command echo in examples |
| Focus management | Not applicable |

## Harness Prompt

| Field | Value |
|---|---|
| Component | Harness Prompt |
| Description | Selects exactly one supported harness |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Shows four numbered options | interactive mode and missing `--harness` |
| selected | Records one harness | valid number/name entered |
| error | Re-prompts or exits on invalid value | invalid input |
| disabled | Skipped in non-interactive mode | `--yes` or non-TTY |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| supportedHarnesses | string[] | yes | claude,codex,kiro,kiro-ide | Allowed values |
| suppliedHarness | string | no | none | Value from `--harness` |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| narrow terminal | One option per line |
| CI log | Prompt is not rendered; missing value is validation error |
| wide terminal | One option per line for predictable snapshots |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | Number or value entry; arrow-key helper may be additive |
| Label | `Harness to install` or `Harness to upgrade` |
| Contrast ratio | Selection does not depend on color |
| Screen reader | Options read in numeric order |
| Focus management | Cursor remains on prompt input |

## File Operation Plan

| Field | Value |
|---|---|
| Component | File Operation Plan |
| Description | Pre-apply report of target mutations |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| empty | No changes; already up to date | version state match |
| add-update | Shows add/update rows | clean install or normal upgrade |
| conflict | Shows conflicts and exits or prompts | collision without force |
| backup | Shows backup rows | changed/unknown shared files |
| force | Marks force-applied operations | `--force` present |
| package-check | Shows package metadata checks | maintainer package validation |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| operations | object[] | yes | [] | add/update/skip/backup/conflict rows |
| force | boolean | yes | false | Whether collision prompts are bypassed |
| manifestPath | string | yes | none | Manifest destination |
| packagePath | string | no | packages/setup/ | Package layout checked by maintainer DX flow |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| narrow terminal | Keep table to Operation, Files, Example; truncate examples by path segment if needed |
| CI log | Same table printed before apply or abort |
| wide terminal | Same columns to preserve test snapshots |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | No interaction |
| Label | `File operations:` heading |
| Contrast ratio | Operation names carry meaning without color |
| Screen reader | Table columns are stable and compact |
| Focus management | Not applicable |

## Apply Confirmation

| Field | Value |
|---|---|
| Component | Apply Confirmation |
| Description | Final human checkpoint before writes |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Asks `Apply this install/upgrade? [y/N]` | interactive apply |
| accepted | Proceeds to writes | user enters `y` |
| declined | Exits with no changes | user presses Enter or enters no |
| suppressed | Applies or aborts according to validation | `--yes` |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| operation | string | yes | none | install or upgrade |
| hasCollisions | boolean | yes | false | Whether file collisions exist |
| force | boolean | yes | false | Whether collision prompts are bypassed |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| narrow terminal | Single prompt line |
| CI log | Prompt not rendered |
| wide terminal | Single prompt line |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | `y` to apply; Enter defaults to no-write |
| Label | Prompt includes operation name |
| Contrast ratio | Default is expressed textually as `[y/N]` |
| Screen reader | Prompt is a complete sentence |
| Focus management | Cursor remains on prompt input |

## Version Resolver Summary

| Field | Value |
|---|---|
| Component | Version Resolver Summary |
| Description | Explains selected distribution version and ignored candidates |
| Category | display |

### States

| State | Description | Trigger |
|---|---|---|
| latest-stable | Selects highest stable SemVer tag | no `--version` |
| explicit | Selects requested exact or normalized tag | `--version` supplied |
| duplicate-ignored | Reports non-canonical duplicate | both `v1.2.3` and `1.2.3` exist |
| prerelease-excluded | Reports prerelease excluded from default | prerelease tag found without explicit request |
| no-stable-version | Fails before file writes | no default stable tag exists |
| version-not-found | Fails before file writes | requested version cannot resolve |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| sourceRepo | string | yes | https://github.com/amadeus-dlc/amadeus | Canonical repository |
| requestedVersion | string | no | none | User supplied semver/tag |
| selectedTag | string | no | none | Resolved source tag |
| ignoredTags | string[] | no | [] | Duplicate or prerelease tags ignored by default |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | No interaction |
| Label | `Resolved distribution:` or `Error:` |
| Screen reader | Selected and ignored tags are separate labeled lines |

## Target Prompt

| Field | Value |
|---|---|
| Component | Target Prompt |
| Description | Selects target project root |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | Offers current directory as default | interactive mode and missing `--target` |
| supplied | Uses supplied path | `--target` present |
| validation-error | Fails before writes | non-interactive missing target |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | Typed path or Enter for default in TTY |
| Label | `Target project:` |
| Screen reader | Prompt includes the full path text |

## Error Block

| Field | Value |
|---|---|
| Component | Error Block |
| Description | Human-readable failure and recovery instruction |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| validation | Missing required values, multiple harnesses, Bun unavailable | preflight |
| resolution | Version or network failure | resolver/fetch |
| target-state | none, partial, unsupported-layout | target classification |
| verification | Post-copy readiness failed | verification step |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| code | string | yes | none | Stable internal error code |
| message | string | yes | none | Human-readable message |
| noChanges | boolean | yes | true | Whether no files were modified |
| nextAction | string | yes | none | One concrete recovery action |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| narrow terminal | Wrap details under the primary `Error:` line |
| CI log | Same output; no color-only severity |
| wide terminal | Same output |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | No interaction |
| Label | Starts with `Error:` |
| Contrast ratio | Error state is text, not color |
| Screen reader | Reason, no-change guarantee, next action are consecutive |
| Focus management | Not applicable |

## Release Workflow

| Field | Value |
|---|---|
| Component | Release Workflow |
| Description | Manual GitHub Actions publication surface |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| default | `workflow_dispatch` available | maintainer opens Actions |
| validated | Build, dry-run, SBOM/provenance, publish validation pass | release run |
| blocked | Any required validation fails | release run |

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard interaction | GitHub Actions default UI |
| Label | Workflow name references `@amadeus-dlc/setup` |
| Screen reader | Validation names are plain words, not icon-only |

## CI Gate Report

| Field | Value |
|---|---|
| Component | CI Gate Report |
| Description | Contributor-facing installer PR quality gate output |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| detected | Installer-related PR paths detected | PR changes setup/docs/tests/release metadata |
| passed | All blocking gates pass | CI run |
| blocked | One or more gates fail | CI run |

### Required Gate Names

| Gate | Failure UX |
|---|---|
| package dry-run | Show package contents or metadata mismatch |
| smoke/integration | Show failing installer scenario |
| coverage registry/ratchet | Show stale registry or ratchet decrease |
| typecheck/lint | Show standard diagnostics |
| dist/promote-self drift | Show generated/self-install drift |
| OSV/audit | Show High/Critical reachable vulnerability and allowlist status |
| secret scan | Show verified secret failure without exposing secret value |
| path handling | Show portability assumption that failed |
| dependency review | Show missing runtime dependency justification |

## Traceability

| Interaction | Stories | Requirements |
|---|---|---|
| Runtime/help | US-001 | FR-001, FR-002 |
| Package metadata/layout | US-001 | FR-001, FR-003, NFR-005 |
| Interactive install | US-002, US-003 | FR-004, FR-005, FR-007, FR-013, FR-014 |
| Non-interactive install | US-004 | FR-008, FR-010, FR-011 |
| Upgrade | US-005, US-006, US-007 | FR-006, FR-008, FR-009, FR-010, FR-013 |
| Resolver/network errors | US-008, US-012 | FR-007, FR-012 |
| Release workflow | US-009 | FR-017 |
| PR gates | US-010 | FR-016 |
| Docs guidance | US-011 | FR-015 |

## README Guidance Block

| Field | Value |
|---|---|
| Component | README Guidance Block |
| Description | User-facing install documentation section |
| Category | display |

### Required Content

| Item | Requirement |
|---|---|
| Primary install path | Shows `bunx @amadeus-dlc/setup install --harness <h> --target <path>` before manual copy |
| Supported harnesses | Lists `claude`, `codex`, `kiro`, `kiro-ide` |
| Upgrade path | Shows `amadeus-setup upgrade` / `bunx @amadeus-dlc/setup upgrade` |
| npx caveat | States Bun is required and npx is best-effort delegation |
| Manual copy | Not the primary path |

### Accessibility

| Requirement | Implementation |
|---|---|
| Screen reader | Commands appear in code blocks with surrounding explanatory text |
| Keyboard interaction | Copyable one-line commands |
| No color-only meaning | Warnings and caveats are written as text |
