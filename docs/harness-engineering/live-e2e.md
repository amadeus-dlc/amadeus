# Live Harness End-to-End Verification

This runbook describes the opt-in, local-only journey used to verify an Amadeus harness distribution against a real CLI and model. The typed registry is the static source of truth, the JSONL ledger records run facts, and the matrix below is a generated view of both.

## Safety boundary

Live journeys never run on GitHub Actions, even if an opt-in variable is set. Each adapter has a dedicated opt-in whose only accepted value is the exact string `1`. The child process receives a newly constructed allow-list environment and a short-lived credential lease; it does not receive or copy source auth files, user configuration, user hooks, source home paths, prompts, or full stdout/stderr in durable evidence.

The `codex-exec` adapter requires `AMADEUS_CODEX_EXEC_LIVE=1`, Codex CLI 0.139.0 or newer, `dist/codex`, and an `OPENAI_API_KEY` credential lease. The `claude-print` adapter requires `AMADEUS_CLAUDE_PRINT_LIVE=1`, Claude Code 2.1.220 or newer with the measured print flags, and `dist/claude`. Claude authentication is either a short-lived `ANTHROPIC_API_KEY` binding or a native keychain credential confirmed by `claude auth status --json`; source `HOME`, `CLAUDE_CONFIG_DIR`, and user/local settings are never forwarded. Cleanup and credential-leak findings override an otherwise successful or timed-out run.

## Running a live journey

Run the serial Codex journey only from a clean local worktree:

```bash
AMADEUS_CODEX_EXEC_LIVE=1 OPENAI_API_KEY='…' \
  bun test --timeout 180000 tests/e2e/t-exec-codex-kernel.serial.test.ts
```

The runner creates a fresh Git project and separate Codex home, installs only `dist/codex`, invokes one `codex exec --json --ephemeral` process, checks exit/schema/file anchors, reaps the process, destroys the credential binding, and removes scratch resources. Missing opt-in, CLI, distribution, version, or credential produces a machine-readable skip before scratch allocation.

Run the serial Claude print journey only from a clean local worktree:

```bash
AMADEUS_CLAUDE_PRINT_LIVE=1 ANTHROPIC_API_KEY='…' \
  bun test --timeout 120000 tests/e2e/t-claude-print-kernel.serial.test.ts
```

When Claude Code has a usable native keychain login, omit `ANTHROPIC_API_KEY`; the runner verifies the native credential before allocating scratch. It copies `dist/claude` into a fresh Git project, writes exactly `{ "hooks": {} }` to project `.claude/settings.json`, sets a fresh `HOME` and `TMPDIR`, and invokes `claude -p --setting-sources project --tools "" --no-session-persistence --output-format json --json-schema … --max-budget-usd 0.25`. Success requires exit zero, `is_error=false`, at least one turn, and the closed structured output `{ "amadeus_live_e2e": "ok" }` before cleanup and durable ledger append.

## Ledger and matrix

Recorded runs append atomically to `tests/harness/live-e2e/runs.jsonl`. A recorded receipt contains adapter/version/SHA/time/result and bounded digests, never raw credentials, absolute source paths, prompts, or full output. A pending durability marker is not green evidence; recover the identical receipt before projecting it.

Render, update, and check the derived matrix with:

```bash
bun tests/harness/live-e2e/project-matrix.ts render
bun tests/harness/live-e2e/project-matrix.ts update
bun tests/harness/live-e2e/project-matrix.ts check
```

The live test updates only the ledger. Maintainers explicitly run `update`, review the generated block, then run `check`. Hand edits inside the block are drift and fail the contract test.

<!-- AMADEUS_LIVE_E2E_MATRIX:START -->
| Adapter | Harness | Transport | Opt-in | GitHub Actions | Isolation | Anchors | State | Version (min/measured) | Last green / Issue |
|---|---|---|---|---|---|---|---|---|---|
| claude-print | claude | print | `AMADEUS_CLAUDE_PRINT_LIVE` | hard deny | fresh project/home; project settings only; native keychain or env credential lease | exit, schema, state | UNVERIFIED | 2.1.220 / 2.1.220 | — |
| codex-exec | codex | exec | `AMADEUS_CODEX_EXEC_LIVE` | hard deny | fresh project/home; env credential lease; no source config or hooks | exit, schema, file | UNVERIFIED | 0.139.0 / 0.146.0 | — |
<!-- AMADEUS_LIVE_E2E_MATRIX:END -->

## Distribution change trigger

Before completing an intent that changes `dist/<harness>`, a harness driver (including Claude print, SDK, or TUI), or the installer, identify every affected adapter in the registry and run its local live journey once. The completion evidence is a pending-free receipt in the ledger plus a clean matrix check. Unit and fake integration tests do not replace this live evidence.

## Troubleshooting

- `CI_FORBIDDEN` or `OPT_IN_REQUIRED`: leave CI disabled; set the adapter-specific opt-in only for the intentional local run.
- `BINARY_MISSING`, `VERSION_UNSUPPORTED`, or `DIST_MISSING`: install the supported CLI or regenerate distributions from framework sources. Never edit `dist/` directly.
- `AUTH_UNAVAILABLE`: provide the documented environment credential lease. Do not point the runner at a user auth/config directory.
- `pending-durability`: rerun recovery with the exact recorded receipt; do not delete markers or locks by hand.
- `lock-timeout`: inspect the owner. The kernel automatically reaps only a provably dead owner or a stale unstamped lock and never force-removes a live or unknown owner.
- `generated-block-drift`: run the explicit matrix update, review the diff, and rerun the check.
