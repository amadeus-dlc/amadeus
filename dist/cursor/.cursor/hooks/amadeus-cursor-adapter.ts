#!/usr/bin/env bun
// amadeus-cursor-adapter.ts — the Cursor IDE hook entrypoint (AUTHORED). This is
// the thin runnable shim wired in .cursor/hooks.json; all parse/map/reconstruct/
// spawn LOGIC lives in amadeus-cursor-lib.ts (fully in-process tested). This
// file is deliberately import-free of tests so its process-lifecycle wiring
// (stdin read + exit) is the only untested surface — the same seam split the
// codex adapter uses, keeping the covered logic 100% and the uninstrumentable
// entrypoint (bun --coverage cannot instrument the spawned child) minimal.
//
// Usage (wired in .cursor/hooks.json):
//   bun .cursor/hooks/amadeus-cursor-adapter.ts <target>
// where <target> ∈ session-start | mint | runtime-compile | audit-and-sensors |
//                  log-subagent | validate-state | stop | session-end
//
// See amadeus-cursor-lib.ts for the 工程0 Cursor-hooks measurement (retrieved
// 2026-07-16): dedicated tool-observation events, exit-code contract, and why
// this shim NEVER emits exit 2.

import { runCli } from "./amadeus-cursor-lib.ts";

const result = await runCli(process.argv, () => Bun.stdin.text());
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.exitCode);
