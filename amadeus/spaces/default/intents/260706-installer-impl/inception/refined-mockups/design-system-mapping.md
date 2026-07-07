# Design System Mapping — インストーラの実装

> Stage: refined-mockups / Upstream: `wireframes.md`, `user-flow.md`, `stories.md`, `requirements.md`, `team-practices.md`  
> Surface: terminal CLI, CI logs, and GitHub Actions release workflow.

## CLI Design Tokens

| Token | Value | Rationale |
|---|---|---|
| Command names | `install`, `upgrade` | Matches `requirements.md`; supersedes rough `init` wording |
| Product heading | `Amadeus Setup` | Stable, human-readable CLI identity |
| Confirmation default | No-write | Aligns with safety and non-destructive policy |
| Operation words | `add`, `update`, `skip`, `backup`, `conflict` | Traceable file-operation vocabulary |
| Target states | `manifest-installed`, `manual-or-unknown`, `partial`, `none`, `unsupported-layout` | Matches upgrade classification in requirements |
| File classes | `owned`, `shared`, `user-preserved` | Matches manifest/report contract |
| Force operation | `force-update` | Marks force-applied writes while preserving paired backup rows |
| Error prefix | `Error:` | Screen-reader and log-friendly severity |
| No-change phrase | `No files were modified.` | Consistent safety reassurance |
| Next action label | `Next action:` | One concrete recovery instruction |

## Component Mapping

| UX Element | CLI Component | Requirement Link | Notes |
|---|---|---|---|
| Harness picker | Harness Prompt | FR-004 | Exactly one harness; multiple values rejected |
| Target selector | Target Prompt | FR-005, FR-011 | CWD default only in interactive mode |
| Version resolver summary | Resolved Distribution Block | FR-007 | Stable SemVer tag first; Release metadata supplemental |
| Version edge-case report | Version Resolver Summary | FR-007 | Duplicate tags, prerelease exclusion, no stable tag, version-not-found |
| Pre-apply report | File Operation Plan | FR-008 | Always printed before apply or abort |
| Force safety matrix | Safety Matrix | FR-010, FR-011 | Distinguishes `--yes`, `--force`, and `--yes --force` |
| Shared-file handling | Backup Row | FR-009, FR-010 | Backup remains required under `--force` |
| Manifest destination | Manifest Summary | FR-013 | Points to `amadeus/.installer/amadeus-setup-manifest.json` |
| Verification | Verification Line | FR-014 | Doctor-equivalent readiness checks |
| Package layout check | Package Check Report | FR-001, FR-003, NFR-005 | `packages/setup/` source, root dev-only, package metadata |
| Runtime failure | Error Block | FR-002 | Bun-required message for unsupported Node-only case |
| Network failure | Error Block | FR-012 | One retry, then classified failure |
| Verification failure | Error Block | FR-014 | Failed doctor-equivalent check and next action |
| Manual release | GitHub Actions workflow | FR-017 | `workflow_dispatch`, latest stable tag default |
| Release failure report | Release Workflow | FR-017 | No npm publication after failed validation |
| PR quality gate | CI Gate Report | FR-016 | Blocking package/security/coverage/portability/dependency gates |
| README install section | README Guidance Block | FR-015 | Installer-first docs with Bun-required npx caveat |

## Output Density Rules

- Default to four sections in success flows: resolved distribution, plan, apply progress, result.
- Use compact tables only for file-operation summaries.
- Keep table columns stable: `Operation`, `Files`, `Example`.
- Avoid spinners in canonical output; progress is a sequence of completed lines.
- Avoid icon-only states. If symbols or colors are later added, text remains authoritative.
- Keep error blocks three-part: reason, no-change guarantee, next action.
- Keep design-system component names aligned with `interaction-spec.md`; if a mapped component has no implementation section, add one or collapse it into an existing component.

## Responsive And Environment Mapping

| Environment | Behavior |
|---|---|
| Interactive TTY | Prompts allowed; confirmation defaults to no-write; numeric input accepted |
| Non-TTY | No prompts; missing required flags fail before file writes |
| `--yes` in TTY | Prompt suppression uses non-interactive validation semantics |
| Narrow terminal | Preserve content and wrap paths; do not introduce alternate wording |
| CI log | Same text output; no animation or cursor control |
| GitHub Actions | Release workflow uses native `workflow_dispatch`; validation names are plain text |

## Out-Of-Scope UI Elements

- GUI installer screens are not designed in this intent.
- Rich terminal UI with spinners and color-only status is not the canonical experience.
- JSON-first output is not the default UX. Structured internal results may exist for tests and implementation.
- Full content diff display is intentionally out of scope; the file-level report is the designed surface.
