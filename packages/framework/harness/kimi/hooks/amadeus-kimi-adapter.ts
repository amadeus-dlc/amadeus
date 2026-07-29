#!/usr/bin/env bun
// amadeus-kimi-adapter.ts — the Kimi Code CLI hook entrypoint (AUTHORED). This
// is the thin runnable shim wired in ~/.kimi-code/config.toml (the managed
// block from hooks/amadeus-hooks.snippet.toml); all parse/map/translate/spawn
// LOGIC lives in amadeus-kimi-lib.ts (fully in-process tested). This file is
// deliberately import-free of tests so its process-lifecycle wiring (stdin
// read + exit) is the only untested surface — the same seam split the
// cursor/codex adapters use, keeping the covered logic 100% and the
// uninstrumentable entrypoint minimal.
//
// Usage (wired by the managed block):
//   bun .kimi-code/hooks/amadeus-kimi-adapter.ts <target>
// where <target> ∈ session-start | session-end | mint | audit-and-sensors |
//                  state-sync | runtime-compile | validate-state |
//                  log-subagent | stop
//
// Fail-open everywhere (BR-2). Stop is intentionally observation-only because
// Kimi does not expose a trustworthy main-vs-subagent caller identity. See
// amadeus-kimi-lib.ts for the measured contracts and rationale.

import { runCli } from "./amadeus-kimi-lib.ts";

const result = await runCli(process.argv, () => Bun.stdin.text());
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.exitCode);
