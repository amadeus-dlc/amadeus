# Refined Mockups — インストーラの実装

> Stage: refined-mockups / Intent: `260706-installer-impl`  
> Upstream: `wireframes.md`, `user-flow.md`, `stories.md`, `requirements.md`, `team-practices.md`  
> Representation: terminal transcript first. This refines rough `init` mockups into the authoritative `install` / `upgrade` CLI contract.

## Design Principles

- Use `amadeus-setup install` and `amadeus-setup upgrade`; do not expose `init` or an `init` alias in the first release.
- Default output is plain-text and line-oriented. Tables are reserved for file-operation summaries.
- Always show the resolved plan before writing files. `--yes` removes prompts, not validation or reporting.
- `--force` bypasses collision prompts but does not bypass backup for changed or unknown `shared` files.
- Error output includes a classified reason, the no-change guarantee where applicable, and one concrete next action.
- All examples trace to `wireframes.md`, `user-flow.md`, `stories.md` US-001..US-012, `requirements.md` FR-001..FR-017, and `team-practices.md` release/CI posture.

## M1: Help And Runtime Entry

```text
$ bunx @amadeus-dlc/setup --help

Amadeus Setup

Usage:
  amadeus-setup install [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
  amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide>] [--target <path>] [--version <semver|tag>] [--yes] [--force]

Commands:
  install   Install Amadeus into a target project
  upgrade   Upgrade an existing Amadeus installation

Runtime:
  Bun is required for this release. npx may delegate to Bun when Bun is installed.
```

**States covered:** US-001, FR-001, FR-002.  
**No-change guarantee:** help never modifies target files.

## M1a: Package Metadata And Layout Check

```text
$ bun scripts/package-setup.ts --check

Amadeus Setup Package Check

Package:
  path:       packages/setup/
  name:       @amadeus-dlc/setup
  bin:        amadeus-setup
  root:       dev-only package.json
  license:    MIT OR Apache-2.0
  repository: https://github.com/amadeus-dlc/amadeus

Publish files:
| Check | Status | Example |
|---|---|---|
| package metadata | passed | name, bin, license, repository |
| files allowlist | passed | dist/, package.json, README.md |
| root package role | passed | not publishable installer package |

Package check passed.
```

**States covered:** US-001, FR-001, FR-003, NFR-005.  
**Developer experience note:** this is a maintainer/contributor-facing DX check, not an end-user installer command. It makes the staged `packages/setup/` layout and root dev-only boundary visible before publish.

## M2: Interactive Install

```text
$ amadeus-setup install

Amadeus Setup

? Harness to install:
  1. claude
  2. codex
  3. kiro
  4. kiro-ide
> 2

? Target project:
> /Users/example/project

Resolved distribution:
  source:  https://github.com/amadeus-dlc/amadeus
  tag:     v1.10.0
  version: 1.10.0

Plan:
  harness:  codex
  target:   /Users/example/project
  manifest: /Users/example/project/amadeus/.installer/amadeus-setup-manifest.json

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 148 | .codex/tools/amadeus-orchestrate.ts |
| add | 1 | AGENTS.md |
| add | 1 | amadeus/.installer/amadeus-setup-manifest.json |

? Apply this install? [y/N]
> y

Downloading v1.10.0 archive... done
Copying codex harness files... done
Writing installer manifest... done
Verifying installation... done

Installed Amadeus.
  harness:  codex
  version:  1.10.0
  manifest: amadeus/.installer/amadeus-setup-manifest.json

Next steps:
  1. Open the target project with Codex
  2. Run /amadeus and describe what you want to build
```

**States covered:** US-002, US-003, US-008, FR-004, FR-005, FR-007, FR-008, FR-013, FR-014.  
**Interaction notes:** numeric harness selection is available alongside arrow-key UI if a TTY helper is used. Default confirmation is no-write.

## M3: Non-Interactive Install

```text
$ amadeus-setup install --harness codex --target /tmp/project --yes

Amadeus Setup

Resolved distribution:
  source:  https://github.com/amadeus-dlc/amadeus
  tag:     v1.10.0
  version: 1.10.0

Plan:
  harness:  codex
  target:   /tmp/project
  manifest: /tmp/project/amadeus/.installer/amadeus-setup-manifest.json

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 150 | .codex/ |
| add | 1 | AGENTS.md |

Applying install because --yes was supplied.
Downloading v1.10.0 archive... done
Copying codex harness files... done
Writing installer manifest... done
Verifying installation... done

Installed Amadeus.
```

**States covered:** US-004, FR-011.  
**Validation rule:** if `--harness` or `--target` is missing, exit non-zero before version fetch and before file writes.

## M4: Collision During Install

```text
$ amadeus-setup install --harness codex --target /tmp/project --yes

Amadeus Setup

Plan:
  harness: codex
  target:  /tmp/project

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 148 | .codex/tools/amadeus-orchestrate.ts |
| conflict | 1 | AGENTS.md |

Error: target contains existing shared files and --force was not supplied.
No files were modified.

Next action:
  Re-run interactively to review the plan, or use --force to back up changed shared files before copy.
```

**States covered:** US-004, US-007, FR-008, FR-009, FR-010, NFR-002.  
**Safety note:** `--force` still backs up changed or unknown shared files.

## M4a: Force Matrix Examples

```text
$ amadeus-setup install --harness codex --target /tmp/project --force

Amadeus Setup

Plan:
  harness: codex
  target:  /tmp/project

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 148 | .codex/tools/amadeus-orchestrate.ts |
| backup | 1 | AGENTS.md -> AGENTS.md.20260707T052344Z.bk |
| force-update | 1 | AGENTS.md |

Applying install because --force bypasses collision prompts.
Backing up changed shared files... done
Copying codex harness files... done
Writing installer manifest... done
Verifying installation... done

Installed Amadeus.
```

```text
$ amadeus-setup install --harness codex --target /tmp/project --yes --force

Amadeus Setup

Resolved distribution:
  source:  https://github.com/amadeus-dlc/amadeus
  tag:     v1.10.0
  version: 1.10.0

Plan:
  harness:  codex
  target:   /tmp/project
  manifest: /tmp/project/amadeus/.installer/amadeus-setup-manifest.json

File operations:
| Operation | Files | Example |
|---|---:|---|
| backup | 1 | AGENTS.md -> AGENTS.md.20260707T052344Z.bk |
| force-update | 1 | AGENTS.md |

Applying install because --yes --force was supplied.
Backing up changed shared files... done
Copying codex harness files... done
Writing installer manifest... done
Verifying installation... done

Installed Amadeus.
```

```text
$ amadeus-setup install --harness codex --force

Amadeus Setup

Error: --target is required when prompts are suppressed or target cannot be inferred.
No files were modified.

Next action:
  Re-run with --target <path>.
```

**States covered:** US-004, US-007, FR-010, FR-011.  
**Safety note:** `force-update` is always paired with a `backup` row for changed or unknown `shared` files.

## M4b: Verification Failure

```text
$ amadeus-setup install --harness codex --target /tmp/project --yes

Amadeus Setup

Resolved distribution:
  source:  https://github.com/amadeus-dlc/amadeus
  tag:     v1.10.0
  version: 1.10.0

Plan:
  harness:  codex
  target:   /tmp/project
  manifest: /tmp/project/amadeus/.installer/amadeus-setup-manifest.json

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 150 | .codex/ |

Applying install because --yes was supplied.
Downloading v1.10.0 archive... done
Copying codex harness files... done
Writing installer manifest... done
Verifying installation... failed

Error: installation verification failed.
  failed check: tools directory present

Next action:
  Inspect the target directory, then re-run the same command after fixing permissions or disk issues.
```

**States covered:** US-002, FR-014, NFR-006.

## M5: Manifest-Based Upgrade

```text
$ amadeus-setup upgrade --target /Users/example/project

Amadeus Setup

Detected installation:
  state:    manifest-installed
  harness:  codex
  current:  1.9.0
  target:   1.10.0
  source:   v1.10.0

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 4 | .codex/skills/amadeus-compose/SKILL.md |
| update | 23 | .codex/tools/amadeus-orchestrate.ts |
| skip | 7 | amadeus/spaces/default/memory/team.md |
| backup | 1 | AGENTS.md -> AGENTS.md.20260707T052344Z.bk |

? Apply this upgrade? [y/N]
> y

Downloading v1.10.0 archive... done
Backing up changed shared files... done
Copying updated files... done
Updating installer manifest... done
Verifying installation... done

Upgraded Amadeus.
  from: 1.9.0
  to:   1.10.0
```

**States covered:** US-005, US-007, FR-006, FR-008, FR-009, FR-013, FR-014.  
**Traceability:** every applied file operation is represented in both the pre-apply report and manifest where applicable.

## M6: Upgrade Version-State Branches

```text
$ amadeus-setup upgrade --target /Users/example/project

Amadeus Setup

Detected installation:
  state:    manifest-installed
  harness:  codex
  current:  1.10.0
  target:   1.10.0

Already up to date.
No files were modified.
```

```text
$ amadeus-setup upgrade --target /Users/example/project --version 1.8.0

Amadeus Setup

Error: downgrade unsupported.
  current version:   1.10.0
  requested version: 1.8.0

No files were modified.
```

```text
$ amadeus-setup upgrade --target /Users/example/project

Amadeus Setup

Error: installed version is newer than the latest stable tag.
  installed version: 1.11.0
  latest stable:     1.10.0

No files were modified.
Next action:
  Re-run with --version <tag> if you intentionally want a newer explicit target.
```

**States covered:** US-005, FR-006.

## M7: Manual-Or-Unknown And Partial Upgrade

```text
$ amadeus-setup upgrade --harness codex --target /Users/example/project

Amadeus Setup

Detected installation:
  state:   manual-or-unknown
  harness: codex

No installer manifest was found. Existing shared files will be treated as user-modified.

File operations:
| Operation | Files | Example |
|---|---:|---|
| update | 140 | .codex/ |
| backup | 3 | AGENTS.md -> AGENTS.md.20260707T052344Z.bk |
| skip | 12 | amadeus/spaces/default/ |

? Apply conservative upgrade? [y/N]
```

```text
$ amadeus-setup upgrade --harness codex --target /Users/example/project --yes

Amadeus Setup

Detected installation:
  state: partial
  missing: .agents/

Error: partial installation requires interactive review or --force.
No files were modified.
```

```text
$ amadeus-setup upgrade --harness codex --target /Users/example/project --yes --force

Amadeus Setup

Detected installation:
  state: partial
  missing: .agents/

File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 1 | .agents/ |
| update | 140 | .codex/ |
| backup | 3 | AGENTS.md -> AGENTS.md.20260707T052344Z.bk |
| force-update | 3 | shared files with unknown md5 |

Applying conservative upgrade because --yes --force was supplied.
Backing up changed shared files... done
Copying updated files... done
Updating installer manifest... done
Verifying installation... done

Upgraded Amadeus.
```

**States covered:** US-006, US-007, FR-006, FR-009, FR-010.

## M7a: None And Unsupported Upgrade Errors

```text
$ amadeus-setup upgrade --harness codex --target /tmp/project

Amadeus Setup

Detected installation:
  state: none

Error: no Amadeus installation detected for harness codex.
No files were modified.

Next action:
  Run: amadeus-setup install --harness codex --target /tmp/project
```

```text
$ amadeus-setup upgrade --harness codex --target /tmp/project

Amadeus Setup

Detected installation:
  state: unsupported-layout
  reason: files indicate an older or unrecognized Amadeus layout

Error: unsupported layout cannot be upgraded automatically.
No files were modified.

Next action:
  Back up the project and install into a clean target, or update manually.
```

**States covered:** US-006, FR-006.

## M8: Version Resolution Failure

```text
$ amadeus-setup install --harness codex --target /tmp/project

Amadeus Setup

Resolving latest stable version from https://github.com/amadeus-dlc/amadeus... failed
Retrying once... failed

Error: could not fetch GitHub tags or archive.
  reason: network timeout

No files were modified.
Next action:
  Check network or proxy settings, then re-run the same command.
```

**States covered:** US-008, US-012, FR-007, FR-012.

## M8a: Version Resolver Edge Cases

```text
$ amadeus-setup install --harness codex --target /tmp/project

Amadeus Setup

Resolving latest stable version from https://github.com/amadeus-dlc/amadeus... done

Resolved distribution:
  selected: v1.10.0
  ignored:  1.10.0 (duplicate tag; v-prefixed tag preferred)
  ignored:  v1.11.0-beta.1 (prerelease excluded by default)

Plan:
  harness: codex
  target:  /tmp/project
```

```text
$ amadeus-setup install --harness codex --target /tmp/project

Amadeus Setup

Error: no stable SemVer tag found in https://github.com/amadeus-dlc/amadeus.
No files were modified.

Next action:
  Re-run with --version <tag> if you intentionally want an explicit prerelease.
```

```text
$ amadeus-setup install --harness codex --target /tmp/project --version 1.2.3

Amadeus Setup

Error: version not found.
  requested: 1.2.3
  tried:     v1.2.3, 1.2.3

No files were modified.
```

```text
$ amadeus-setup install --harness codex --target /tmp/project

Amadeus Setup

Resolved distribution:
  selected: v1.10.0
  ordering: SemVer
  note:     v1.10.0 is newer than v1.2.0
```

**States covered:** US-008, FR-007.

## M9: Unsupported Multiple Harnesses

```text
$ amadeus-setup install --harness codex --harness claude --target /tmp/project --yes

Amadeus Setup

Error: multiple harnesses are not supported in one invocation.
No files were modified.

Next action:
  Run one command per harness.
```

**States covered:** US-004, FR-004.

## M10: Maintainer Release Workflow UX

```text
GitHub Actions > Release @amadeus-dlc/setup > Run workflow

Inputs:
  tag:        optional; defaults to latest stable SemVer tag
  dry_run:    true by default

Validation:
  package build:        required
  package dry-run:      required
  installer smoke:      required
  dependency review:    required
  SBOM/provenance:      required
  publish validation:   required

Publish:
  npm publication runs only after manual workflow_dispatch and protected release validation.
```

```text
Release @amadeus-dlc/setup failed before publish.

Failed gates:
| Gate | Reason | Next action |
|---|---|---|
| package dry-run | package contents changed unexpectedly | update package files allowlist or fix build |
| SBOM/provenance | provenance attestation missing | fix release workflow permissions |

No npm publication occurred.
```

**States covered:** US-009, FR-017, `team-practices.md` Deployment.

## M11: Installer PR Gate UX

```text
Installer-related PR detected:
  packages/setup/**
  installer docs/tests
  release workflow
  package metadata
  installer-owned CI config

Blocking gates:
  package dry-run:              required
  smoke/integration tests:      required
  coverage registry/ratchet:    required
  typecheck/lint:               required
  dist:check/promote:self:check required
  OSV/audit/secret scan:        required
```

```text
Installer PR gates failed:

| Gate | Failure | Merge behavior |
|---|---|---|
| coverage registry/ratchet | covers registry stale or ratchet decreased | blocked |
| OSV/audit | High reachable vulnerability without allowlist rationale | blocked |
| secret scan | verified secret detected | blocked |
| path handling | backup filename invalid on supported shell assumptions | blocked |
| dependency review | new runtime dependency lacks package/docs justification | blocked |

Fix the failing gate or add an explicit allowlist entry with rationale where the policy permits it.
```

**States covered:** US-010, FR-016, `team-practices.md` Testing Posture.

## M12: README Install Guidance

```text
README.md > Installation

Recommended:
  bunx @amadeus-dlc/setup install --harness codex --target .

Supported harnesses:
  claude, codex, kiro, kiro-ide

Upgrade:
  bunx @amadeus-dlc/setup upgrade --harness codex --target .

Node/npm:
  npx @amadeus-dlc/setup install --harness codex --target .

  Bun is still required for this release. The npx entrypoint delegates to Bun when Bun is installed.

Manual copy:
  Manual cp -r dist/<harness> installation is no longer the primary path.
```

**States covered:** US-011, FR-015, NFR-006.  
**Documentation UX note:** README should present the one-command installer path first, then mention manual copy only as non-primary legacy context if it remains documented at all.

## State Coverage Matrix

| Mockup | Primary stories | Requirements |
|---|---|---|
| M1 | US-001 | FR-001, FR-002 |
| M1a | US-001 | FR-001, FR-003, NFR-005 |
| M2 | US-002, US-003, US-008 | FR-004, FR-005, FR-007, FR-008, FR-013, FR-014 |
| M3 | US-004 | FR-008, FR-011 |
| M4 | US-004, US-007 | FR-008, FR-009, FR-010 |
| M4a | US-004, US-007 | FR-010, FR-011 |
| M4b | US-002 | FR-014, NFR-006 |
| M5 | US-005, US-007 | FR-006, FR-008, FR-009, FR-013, FR-014 |
| M6 | US-005 | FR-006 |
| M7 | US-006, US-007 | FR-006, FR-009, FR-010 |
| M7a | US-006 | FR-006 |
| M8 | US-008, US-012 | FR-007, FR-012 |
| M8a | US-008 | FR-007 |
| M9 | US-004 | FR-004 |
| M10 | US-009 | FR-017 |
| M11 | US-010 | FR-016 |
| M12 | US-011 | FR-015, NFR-006 |
