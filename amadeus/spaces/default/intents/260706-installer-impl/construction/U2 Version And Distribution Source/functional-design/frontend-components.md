# Frontend Components — U2 Version And Distribution Source

> Stage: functional-design / Unit: `U2 Version And Distribution Source`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Applicability

U2 has no graphical frontend. Its user-facing surface is terminal output rendered by downstream Reporter components. This file defines the source-resolution status and error information U2 must expose so `mockups.md` plain-text CLI output can remain stable.

## CLI Display Data

| Display Area | U2 Supplies | Renderer Responsibility |
|---|---|---|
| Resolved distribution | source repo, source tag, normalized version | Render `source`, `tag`, `version` block |
| Ignored tags | duplicate/pre-release/malformed diagnostics | Render only when verbose or useful in errors |
| Archive progress | fetch started, fetch complete, final classified failure | Render line-oriented progress |
| Extraction failure | `harness-dist-missing`, `archive-invalid` | Render classified error and next action |
| Network failure | `archive-fetch-failed` after retry | Render retry instruction and no-change guarantee |

## Interaction Flows

### Successful Resolution Flow

1. U2 resolves latest stable SemVer tag.
2. U2 returns `ResolvedVersion`.
3. Reporter displays source, tag, and version before target writes.
4. User can trace installation to the source tag.

### Retry Flow

1. `ArchiveSourcePort` encounters a transient network failure.
2. The adapter performs its single internal retry.
3. If retry succeeds, U2 returns the archive.
4. Reporter is not required to show retry diagnostics; tests may inspect adapter diagnostics if exposed.

### Failure Flow

1. Tag listing or archive fetch fails.
2. U2 returns a classified error.
3. Reporter displays no-change guarantee because U2 cannot target-write.
4. Reporter includes one next action, usually retry or explicit version selection.

## Accessibility And Automation

- Resolution output is plain text and snapshot-testable.
- Error codes are structured internally but rendered as human-readable stderr.
- CI logs must show selected source tag before apply.
- U2 does not emit prompts; prompts remain U1/U5 concerns.

## Display Examples

### Resolved Distribution

```text
Resolved distribution:
  source:  https://github.com/amadeus-dlc/amadeus
  tag:     v1.10.0
  version: 1.10.0
```

### Archive Fetch Failure

```text
Error: archive fetch failed after retry.
No files were modified.

Next action:
  Check network access or re-run with --version <tag>.
```

## Traceability

- `requirements.md` FR-007 and FR-012 define the visible source and retry outcomes.
- `mockups.md` shows resolved distribution and download progress before copy.
- `unit-of-work-story-map.md` maps U2 output to US-002, US-008, US-009, and US-012.
- `components.md`, `component-methods.md`, and `services.md` place rendering in Reporter while U2 supplies structured source data.
