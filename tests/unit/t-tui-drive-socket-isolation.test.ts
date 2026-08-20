// covers: function:tui-drive:tmux-socket-isolation
//
// t-tui-drive-socket-isolation.test.ts — a deterministic, token-free guard that
// the tmux backend runs on a PRIVATE tmux server socket (`tmux -L <socket>`),
// never the default server the developer's interactive shell is attached to.
//
// WHY THIS GUARD EXISTS (a real incident): tui-drive.ts originally called
// `spawnSync("tmux", args)` with no `-L`, so every harness new-session /
// kill-session landed on the DEFAULT tmux server — the same one a developer's
// live session is attached to. Server-level resource pressure from the live tui
// tier (or a kill targeting a stale name) could then take down the session the
// developer was working in (observed: crashes that needed a restart). The fix
// routes every tmux call through a private `-L amadeus-tui` socket. This test pins
// that: a regression that drops the `-L` flag re-exposes the developer's session,
// so it must fail loudly and deterministically — no claude, no tmux, no tokens.
//
// It is a SOURCE-LEVEL assertion (reads the driver's tmux() helper text), which
// is OS-invariant and runs in the deterministic unit tier. A behavioural check
// would need a live tmux server; the contract we protect — "the harness never
// touches the default server" — is fully expressed by the presence of `-L
// <socket>` ahead of the tmux args at the single chokepoint.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type Backend,
  createTmuxBackend,
  main,
  tmuxClientEnv,
} from "../harness/tui-drive.ts";

const DRIVER_SRC = readFileSync(
  join(import.meta.dir, "..", "harness", "tui-drive.ts"),
  "utf8",
);

describe("tui-drive tmux backend runs on a private socket (developer-session safety)", () => {
  test("a private TMUX_SOCKET is defined with a non-empty default", () => {
    // The socket name must default to a concrete private label, overridable via
    // AMADEUS_TUI_TMUX_SOCKET, so the harness never shares the default server.
    expect(DRIVER_SRC).toMatch(
      /const\s+TMUX_SOCKET\s*=\s*process\.env\.AMADEUS_TUI_TMUX_SOCKET\s*\|\|\s*"[^"]+"/,
    );
  });

  test("the single tmux() chokepoint passes -L <socket> ahead of the args", () => {
    // Every backend op (start/send/capture/kill) funnels through tmux(); the -L
    // flag MUST be injected here and MUST precede the tmux subcommand, or the call
    // hits the default server. Pin the exact shape.
    expect(DRIVER_SRC).toMatch(
      /spawnSync\(\s*"tmux"\s*,\s*\[\s*"-L"\s*,\s*TMUX_SOCKET\s*,\s*\.\.\.args\s*\]/,
    );
  });

  test("no tmux server op bypasses the helper onto the default server", () => {
    // A bare `spawnSync("tmux", [..., "new-session"|"kill-session", ...])` outside
    // the helper would land on the default server. The only permitted direct
    // spawnSync("tmux", ...) calls are version probes (`tmux -V`) in skipReason
    // gates, which touch no server. Assert no direct spawnSync invokes a
    // server-touching subcommand.
    const directTmuxSpawns = [
      ...DRIVER_SRC.matchAll(/spawnSync\(\s*"tmux"\s*,\s*\[([^\]]*)\]/g),
    ];
    for (const m of directTmuxSpawns) {
      const argsText = m[1];
      // The helper itself matches here (it contains "-L", TMUX_SOCKET, ...args) —
      // that is the SAFE one. Any OTHER direct spawn must be a `-V` version probe.
      const isHelper = /"-L"\s*,\s*TMUX_SOCKET/.test(argsText);
      const isVersionProbe = /"-V"/.test(argsText);
      expect(isHelper || isVersionProbe).toBe(true);
    }
  });

  test("the tmux backend maps all operations to the canonical command shapes", () => {
    const calls: string[][] = [];
    const backend = createTmuxBackend((args) => {
      calls.push(args);
      return { code: 0, stdout: "captured grid", stderr: "" };
    });

    backend.start("session", "/tmp/it's-here", 80, 24, ["printf", "it's-ready"]);
    backend.send("session", "plain text", true, false);
    expect(backend.capture("session", true)).toBe("captured grid");
    backend.kill("session");

    expect(calls).toEqual([
      ["kill-session", "-t", "session"],
      [
        "new-session",
        "-d",
        "-s",
        "session",
        "-x",
        "80",
        "-y",
        "24",
        "bash",
        "-lc",
        "cd '/tmp/it'\\''s-here' && exec 'printf' 'it'\\''s-ready'",
      ],
      ["send-keys", "-t", "session", "-l", "plain text"],
      ["send-keys", "-t", "session", "Enter"],
      ["capture-pane", "-t", "session", "-p", "-J", "-e"],
      ["kill-session", "-t", "session"],
    ]);
  });

  test("the in-process dispatcher delegates every public subcommand", async () => {
    const calls: Array<{ operation: string; args: unknown[] }> = [];
    const backend: Backend = {
      start: (...args) => calls.push({ operation: "start", args }),
      send: (...args) => calls.push({ operation: "send", args }),
      capture: (...args) => {
        calls.push({ operation: "capture", args });
        return "READY";
      },
      kill: (...args) => calls.push({ operation: "kill", args }),
    };
    const projectDir = mkdtempSync(join(tmpdir(), "amadeus-tui-driver-unit-"));
    try {
      writeFileSync(join(projectDir, "done.txt"), "done");
      await main(
        ["start", "--session", "s", "--cwd", projectDir, "--width", "80", "--height", "24", "--", "bash"],
        backend,
      );
      await main(["send", "--session", "s", "--keys", "hello", "--literal"], backend);
      await main(
        ["wait", "--session", "s", "--pattern", "READY", "--stable-ms", "0"],
        backend,
      );
      await main(["capture", "--session", "s", "--ansi"], backend);
      await main(["kill", "--session", "s"], backend);
      await main(
        ["answer-gate", "--session", "s", "--project-dir", projectDir, "--until-file", "done.txt"],
        backend,
      );
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }

    expect(calls).toContainEqual({
      operation: "start",
      args: ["s", projectDir, 80, 24, ["bash"]],
    });
    expect(calls).toContainEqual({
      operation: "send",
      args: ["s", "hello", true, false],
    });
    expect(calls).toContainEqual({
      operation: "capture",
      args: ["s", false],
    });
    expect(calls).toContainEqual({
      operation: "capture",
      args: ["s", true],
    });
    expect(calls).toContainEqual({ operation: "kill", args: ["s"] });
  });
});

describe("tui-drive tmux clients never carry the per-file leak marker (#1982)", () => {
  // The private tmux SERVER is daemonized by the first client and shared across
  // the serial tui files by design; if that client's environment carried the
  // runner-injected AMADEUS_TEST_NAME, the silent-success leak gate would flag
  // and reap the shared server as a leak of whichever file started it.
  test("tmuxClientEnv strips AMADEUS_TEST_NAME and keeps everything else", () => {
    const env = tmuxClientEnv({ AMADEUS_TEST_NAME: "t1.test.ts", PATH: "/usr/bin", TERM: "xterm" });
    expect(env.AMADEUS_TEST_NAME).toBeUndefined();
    expect(env.PATH).toBe("/usr/bin");
    expect(env.TERM).toBe("xterm");
  });

  test("the real tmux() chokepoint routes its spawn through tmuxClientEnv", () => {
    // Source-level pin, same idiom as the -L socket guard above: the contract
    // lives at one chokepoint and must not silently regress.
    expect(DRIVER_SRC).toContain("env: tmuxClientEnv()");
  });
});
