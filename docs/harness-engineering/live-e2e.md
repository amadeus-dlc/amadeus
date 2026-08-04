# Live Harness End-to-End Verification

This runbook describes the opt-in, local-only journey used to verify an Amadeus harness distribution against a real CLI and model. The typed registry is the static source of truth, the JSONL ledger records run facts, and the matrix below is a generated view of both.

## Safety boundary

Live journeys never run on GitHub Actions, even if an opt-in variable is set. Each adapter has a dedicated opt-in whose only accepted value is the exact string `1`. The child process receives a newly constructed allow-list environment and a short-lived credential lease; it does not receive or copy source auth files, user configuration, user hooks, source home paths, prompts, or full stdout/stderr in durable evidence.

The `codex-exec` adapter requires `AMADEUS_CODEX_EXEC_LIVE=1`, Codex CLI 0.139.0 or newer, `dist/codex`, and an `OPENAI_API_KEY` credential lease. The `claude-print` adapter requires `AMADEUS_CLAUDE_PRINT_LIVE=1`; the `claude-tui` adapter requires `AMADEUS_TUI_LIVE=1` and tmux. The `claude-print` and `claude-tui` adapters both require Claude Code 2.1.220 or newer with their measured flags and `dist/claude`. The `claude-sdk` adapter separately requires `AMADEUS_CLAUDE_SDK_LIVE=1`, Claude Agent SDK 0.3.158 or newer, and `dist/claude`. Claude authentication requires a short-lived `ANTHROPIC_API_KEY` binding; source `HOME`, `CLAUDE_CONFIG_DIR`, and user/local settings are never forwarded. The SDK adapter owns the SDK client and stream in an isolated worker group, transfers an environment credential through one length-prefixed stdin frame, and escalates abort to TERM and KILL before cleanup.

Cleanup is a barrier, not another recorded outcome. A cleanup error, leak finding, or retained resource returns `cleanup-barrier-failed` and suppresses ledger append even when execution/assertion succeeded. Only the sequence `executed/asserted → cleanup-barrier-closed → ledger-appended|already-present → closure-committed` can release a PASS receipt or a supported matrix projection.

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

Run the serial Claude Agent SDK journey independently from the print journey:

```bash
AMADEUS_CLAUDE_SDK_LIVE=1 ANTHROPIC_API_KEY='…' \
  bun test --timeout 120000 tests/e2e/t-claude-sdk-kernel.serial.test.ts
```

The parent process imports no SDK client. It creates a fresh project/home, starts one SDK-owning worker group, sends the run-bound credential frame once, and drives the literal `echo ok` prompt with project-only settings. The worker emits only bounded, sanitized JSON events. Success requires exactly one terminal success result, positive turn count, zero permission denials, ordered state/audit observations, and non-empty tool-result or assistant-byte evidence. A 90-second deadline requests SDK abort, waits 10 seconds, then escalates to TERM for 5 seconds and KILL/reap for 5 seconds. A single event over 65,536 bytes, total event output over 1 MiB, more than 4,096 events, an in-memory queue over 16 events or 256 KiB, a duplicate or late terminal, or any cleanup/credential leak is non-green.

Run the serial Claude TUI journey only from a clean local worktree:

```bash
AMADEUS_TUI_LIVE=1 ANTHROPIC_API_KEY='…' \
  bun test --timeout 180000 tests/e2e/t-claude-tui-kernel.serial.test.ts
```

The TUI runner starts Claude with project-only settings and scratch-confined `acceptEdits` permission inside a run-private `tmux -S` server and session. It waits for a painted pane, sends one prompt bound to the 128-bit run ID, verifies the exact current-run file anchor, retains only bounded pane digests, and then closes session, server, credential, and scratch resources before the ledger can be called. It never lists, attaches to, or kills a session on the default tmux server.

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
| claude-print | claude | print | `AMADEUS_CLAUDE_PRINT_LIVE` | hard deny | fresh project/home; project settings only; environment credential lease | exit, schema, state | UNVERIFIED | 2.1.220 / 2.1.220 | — |
| claude-sdk | claude | agent-sdk | `AMADEUS_CLAUDE_SDK_LIVE` | hard deny | SDK-owned worker group; one-shot credential pipe; project settings only | schema, tool, state, audit | UNVERIFIED | 0.3.158 / 0.3.158 | — |
| claude-tui | claude | tui | `AMADEUS_TUI_LIVE` | hard deny | fresh project/home; project settings only; run-private tmux socket and session | file, state | UNVERIFIED | 2.1.220 / 2.1.220 | — |
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
