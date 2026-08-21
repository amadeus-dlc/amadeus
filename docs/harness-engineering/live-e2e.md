# Live Harness End-to-End Verification

> Languages: **English** | [日本語](live-e2e.ja.md)

This runbook describes the opt-in, local-only journey used to verify an Amadeus harness distribution against a real CLI and model. The typed registry is the static source of truth, the JSONL ledger records run facts, and the matrix below is a generated view of both.

## Safety boundary

Live journeys never run on GitHub Actions, even if an opt-in variable is set. Each adapter has a dedicated opt-in whose only accepted value is the exact string `1`. The child process receives a newly constructed allow-list environment and a short-lived credential lease; it does not receive or copy source auth files, user configuration, user hooks, source home paths, prompts, or full stdout/stderr in durable evidence.

The `codex-exec` adapter requires `AMADEUS_CODEX_EXEC_LIVE=1`, Codex CLI 0.139.0 or newer, `dist/codex`, and an `OPENAI_API_KEY` credential lease. The `claude-print` adapter requires `AMADEUS_CLAUDE_PRINT_LIVE=1`; the `claude-tui` adapter requires `AMADEUS_TUI_LIVE=1` and tmux. The `claude-print` and `claude-tui` adapters both require Claude Code 2.1.220 or newer with their measured flags and `dist/claude`. The `claude-sdk` adapter separately requires `AMADEUS_CLAUDE_SDK_LIVE=1`, Claude Agent SDK 0.3.158 or newer, and `dist/claude`. Every Claude adapter — print, TUI, and SDK — authenticates through a short-lived `ANTHROPIC_API_KEY` binding. Source `HOME`, `CLAUDE_CONFIG_DIR`, and user/local settings are never forwarded, which is also why a subscription login cannot substitute for the key (see the print journey below). The SDK adapter owns the SDK client and stream in an isolated worker group, transfers an environment credential through one length-prefixed stdin frame, and escalates abort to TERM and KILL before cleanup.

The `kimi-print` adapter requires `AMADEUS_KIMI_PRINT_LIVE=1`, Kimi Code 0.28.1 or newer, and `dist/kimi`. Kimi keeps its OAuth material under the user's own `KIMI_CODE_HOME`, reachable through no environment variable, so no environment credential lease exists for it either. The scratch home binds the source `credentials` and `oauth` entries by reference on the Kiro pattern: no credential byte is copied into scratch, the adapter never writes to the source home, and removing the scratch tree removes the binding. The scratch `config.toml`, sessions, and logs are created scratch-local and die with it. Source `HOME`, `KIMI_CODE_HOME`, `AMADEUS_KIMI_SOURCE_HOME`, and an ambient `KIMI_API_KEY` are never forwarded to the child.

The `kiro-acp` adapter requires `AMADEUS_KIRO_ACP_LIVE=1`, Kiro CLI 2.6.0 or newer, and `dist/kiro`. It drives Kiro's programmatic surface — `kiro-cli acp`, newline-delimited JSON-RPC 2.0 over stdio, no TTY — and shares the TUI adapter's authentication seam: the scratch home binds the source auth database by reference, so no credential byte is copied into scratch and the source home is never written to. Request identity is enforced on the wire: a reply carrying an id the client never issued, a second terminal reply for one id, and a frame that is neither a reply nor a known notification are recorded as protocol violations and fail the run rather than being ignored into a pass. Source `HOME`, `XDG_DATA_HOME`, `KIRO_HOME`, and ambient AWS credentials are never forwarded.

The `kiro-tui` adapter requires `AMADEUS_KIRO_TUI_LIVE=1`, tmux, Kiro CLI 2.6.0 or newer, and `dist/kiro`. Kiro keeps its authentication in an on-disk database under the user's home and re-executes its chat runtime from a per-home path, so no environment credential lease exists for it. The scratch home instead binds those two source entries by reference: the credential bytes never leave the user's home, nothing is copied into scratch, and the adapter never writes to, edits, or deletes anything under the source home. Removing the scratch tree removes the entire binding. Source `HOME`, `XDG_DATA_HOME`, `KIRO_HOME`, and ambient AWS credentials are never forwarded to the child.

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

A subscription login cannot stand in for `ANTHROPIC_API_KEY` here. Claude Code resolves a `claude.ai` login through the source `HOME`, and the isolation this journey is built on replaces `HOME` with a fresh directory, so the login is not visible to the child: `claude -p` under the allow-list environment answers `Not logged in · Please run /login` (measured 2026-08-08, Claude Code 2.1.222). Forwarding the source `HOME` or `CLAUDE_CONFIG_DIR` to reach it would defeat the boundary above, so the runner skips instead, and every Claude adapter takes the same short-lived `ANTHROPIC_API_KEY` binding. The runner copies `dist/claude` into a fresh Git project, writes exactly `{ "hooks": {} }` to project `.claude/settings.json`, sets a fresh `HOME` and `TMPDIR`, and invokes `claude -p --setting-sources project --tools "" --no-session-persistence --output-format json --json-schema … --max-budget-usd 0.25`. Success requires exit zero, `is_error=false`, at least one turn, and the closed structured output `{ "amadeus_live_e2e": "ok" }` before cleanup and durable ledger append.

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

Run the serial Kiro TUI journey only from a clean local worktree:

```bash
AMADEUS_KIRO_TUI_LIVE=1 \
  bun test --timeout 240000 tests/e2e/t-kiro-tui-kernel.serial.test.ts
```

The runner copies `dist/kiro` into a fresh Git project, sets a fresh `HOME` and `TMPDIR`, binds the source auth database and chat runtime into the scratch home, and starts `kiro-cli chat --agent kiro_default --trust-all-tools` inside a run-private `tmux -S` server and session. The built-in agent is pinned deliberately: this journey measures the TUI transport, not the shipped conductor, whose own workflow journeys live in `tests/e2e/t-tui-kiro-*`. The run-private socket is created in the system temp directory under a short run-identified name, because a socket nested inside the scratch root would exceed the platform UNIX domain socket path limit; cleanup unlinks it. It clears the trust-all confirmation picker once, waits for the painted input footer, sends one prompt bound to the 128-bit run ID, verifies the exact current-run file anchor, retains only bounded pane digests, and then closes session, server, binding, and scratch resources before the ledger can be called. It never lists, attaches to, or kills a session on the default tmux server. Authentication is probed by presence only; run `kiro-cli login` first, and expect the journey to spend real Kiro credits on one short turn.

Run the serial Kimi print journey only from a clean local worktree:

```bash
AMADEUS_KIMI_PRINT_LIVE=1 \
  bun test --timeout 660000 tests/e2e/t-kimi-print-kernel.serial.test.ts
```

The runner copies `dist/kimi` into a fresh Git project, sets a fresh `HOME`, `KIMI_CODE_HOME`, and `TMPDIR`, binds the source OAuth entries into the scratch home, seeds a scratch-local `config.toml` carrying the managed provider but no credential material, and runs one `kimi -p` session. `kimi -p` emits prose rather than a structured envelope, so the deterministic half of the PASS product is a file the model had to write into the scratch project — the model's own wording is never asserted. Each stream is captured to 4,096 bytes before sanitisation while the receipt digest still covers the full stream. The journey budget is 600,000 ms and the enclosing Bun timeout is 660,000 ms, deliberately not the same number. Authentication is probed by presence only; run `kimi login` first, and expect the journey to spend real Kimi credits on one short turn.

Run the serial Kiro ACP journey only from a clean local worktree:

```bash
AMADEUS_KIRO_ACP_LIVE=1 \
  bun test --timeout 360000 tests/e2e/t-kiro-acp-kernel.serial.test.ts
```

The runner copies `dist/kiro` into a fresh Git project, sets a fresh `HOME` and `TMPDIR`, binds the source auth database into the scratch home, and starts `kiro-cli acp --agent kiro_default --trust-all-tools` over stdio. The built-in agent is pinned deliberately: this journey measures the ACP transport, not the shipped conductor, whose own workflow journeys live in `tests/e2e/t-acp-kiro-*`. It runs one turn, answers the `session/request_permission` channel if the agent opens it, and judges the turn on completion plus an allow-listed tool call plus the file that tool had to write — never on the agent's prose. Tool output is bounded to 4,096 bytes and only counts and digests are retained. Cleanup kills the process and waits for its exit; a cancel acknowledgement is never accepted as proof of closure, and a process that will not exit fails the cleanup barrier so no receipt is written. Authentication is probed by presence only; run `kiro-cli login` first, and expect the journey to spend real Kiro credits on one short turn.

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
| kimi-print | kimi | print | `AMADEUS_KIMI_PRINT_LIVE` | hard deny | fresh project/home; source OAuth entries bound by reference, never copied; scratch-local config, sessions and logs | exit, file | UNVERIFIED | 0.28.1 / 0.37.2 | — |
| kiro-acp | kiro | acp | `AMADEUS_KIRO_ACP_LIVE` | hard deny | fresh project/home; source auth bound by reference, never copied; stdio JSON-RPC with no TTY | tool, file | UNVERIFIED | 2.6.0 / 2.19.0 | — |
| kiro-tui | kiro | tui | `AMADEUS_KIRO_TUI_LIVE` | hard deny | fresh project/home; source auth bound by reference, never copied; run-private tmux socket and session | file, state | UNVERIFIED | 2.6.0 / 2.13.0 | — |
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
