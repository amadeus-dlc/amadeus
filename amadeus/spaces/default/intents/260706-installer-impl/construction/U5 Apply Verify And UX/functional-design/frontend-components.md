# Frontend Components — U5 Apply Verify And UX

> Stage: functional-design / Unit: `U5 Apply Verify And UX`  
> Upstream: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `component-methods.md`, `services.md`

## Applicability

U5 owns the terminal CLI output and prompt interaction. There is no GUI frontend. The output must stay plain-text, line-oriented, and stable enough for snapshot tests.

## CLI Components

| Component | Input | Output |
|---|---|---|
| Plan Renderer | FileOperationPlan | pre-apply operation summary |
| Error Renderer | SetupError / no-write plan | classified stderr and next action |
| Result Renderer | SetupResult | final install/upgrade result, including apply/manifest/verification details |
| Prompt Adapter | PromptPort requests | harness, target, confirmation choices |
| Verification Summary | VerificationResult | passed/failed check list |

## Canonical Plan Table

```text
File operations:
| Operation | Files | Example |
|---|---:|---|
| add | 148 | .codex/tools/amadeus-orchestrate.ts |
| backup | 1 | AGENTS.md -> AGENTS.md.20260707T052344Z.bk |
| force-update | 1 | AGENTS.md |
```

## Canonical No-Write Error

```text
Error: target contains existing shared files and --force was not supplied.
No files were modified.

Next action:
  Re-run interactively to review the plan, or use --force to back up changed shared files before copy.
```

## Confirmation Interaction

```text
? Apply this install? [y/N]
```

- Default is no.
- `--yes` suppresses this prompt.
- A declined prompt leaves target unchanged.

## Success Result

```text
Installed Amadeus.
  harness:  codex
  version:  1.10.0
  manifest: amadeus/.installer/amadeus-setup-manifest.json
```

## Manifest Write Failure Result

```text
Error: files were copied, but installer manifest could not be written.

Applied operations:
  copied: 148
  backups: 1

Next action:
  Fix permissions under amadeus/.installer and rerun upgrade.
```

## Accessibility And Automation

- Color is optional and never conveys the only meaning.
- Output remains useful in CI logs.
- Error text includes one next action.
- Internal data remains structured for tests; JSON is not the default user-facing output.

## Traceability

- `requirements.md` FR-008, FR-011, FR-013, and FR-014 define plan/error/result output expectations.
- `mockups.md` M2, M3, M4, and M4a define terminal transcript examples.
- `unit-of-work-story-map.md` maps U5 UX to US-002, US-003, US-004, US-007, and US-011.
- `components.md`, `component-methods.md`, and `services.md` define Reporter, Prompt Adapter, File Applier, Manifest Store, and Verifier boundaries.
