# Frontend Components — U3 Target State And Manifest

> Stage: functional-design / Unit: `U3 Target State And Manifest`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Applicability

U3 has no graphical frontend. Its user-facing output is target-state data that the Reporter renders in the terminal. This file defines what U3 supplies for CLI status, warnings, and no-write errors.

## CLI Display Data

| Display Area | U3 Supplies | Renderer Responsibility |
|---|---|---|
| Manifest status | manifest path, harness, distribution version, source tag | Render installed source identity |
| Target state | `manifest-installed`, `manual-or-unknown`, `partial`, `none`, `unsupported-layout`, `ambiguous-harness` | Render user-facing classification |
| Missing sentinels | missing required paths | Render partial install explanation |
| Harness ambiguity | candidate harnesses and reason | Prompt or no-write message |
| Snapshot summary | existing file count and readable md5 count | Render plan preface if useful |

## Interaction Flows

### Manifest-Installed Upgrade

1. User runs `amadeus-setup upgrade --target <path>`.
2. U3 reads valid manifest.
3. Reporter can show installed harness/version without requiring `--harness`.
4. U4 plans version comparison and file operations.

### Manual-Or-Unknown Upgrade

1. U3 finds selected harness sentinels without manifest.
2. Reporter can warn that conservative planning will treat shared files as user-modified unless md5 can be derived.
3. U4 decides backup/no-write behavior.

### Ambiguous Harness

1. U3 finds no valid manifest and multiple candidate harnesses.
2. If prompts are allowed and `PromptPort` is provided, `detectTarget` asks the user to choose and returns resolved detection.
3. If prompts are suppressed or no `PromptPort` is available, Reporter renders no-write error with candidate harnesses.

### None Or Unsupported

1. U3 finds no recognized install or unsupported layout.
2. Reporter renders no-write error.
3. Next action is `amadeus-setup install` for `none`, or manual remediation for `unsupported-layout`.

## Accessibility And Automation

- Target state names are stable and snapshot-testable.
- No-write messages include one concrete next action.
- Harness ambiguity output lists candidates as plain text.
- U3 supplies structured data; Reporter owns wording.

## Display Examples

```text
Detected existing installation:
  state:    manifest-installed
  harness:  codex
  version:  1.9.0
  manifest: amadeus/.installer/amadeus-setup-manifest.json
```

```text
Error: target has no recognizable Amadeus installation.
No files were modified.

Next action:
  Run amadeus-setup install --harness <h> --target <path>.
```

## Traceability

- `requirements.md` FR-006, FR-011, and FR-013 define visible state classifications and no-write behavior.
- `unit-of-work-story-map.md` maps U3 to US-005, US-006, and US-007.
- `components.md`, `component-methods.md`, and `services.md` define target detection, manifest store, and reporter boundaries.
