// covers: file:packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts, file:packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts
// size: small
//
// U4 hook-wiring-remaining — the auto-compose wiring in the two declarative
// adapters (cursor, kimi). Their session-start dispatch is a PURE seam
// (reconstruct / routeTarget), so the 1-point compose invocation (BR-U4-1) is
// asserted in-process here. The seam does NOT prove the real subprocess fires
// (BR-U4-3, seam-writer-mode-precondition) — that is t328's real launch. This
// unit proves the wiring exists AND does not clobber each host's context
// channel (cursor forwards lastStdout; kimi relays only the session-start
// translate), which the real launch cannot cheaply observe.

import { describe, expect, test } from "bun:test";
import { parseCursorEnvelope, reconstruct } from "../../packages/framework/harness/cursor/hooks/amadeus-cursor-lib.ts";
import { parseKimiEnvelope, routeTarget } from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";

const COMPOSE = "amadeus-plugin-compose.ts";
const SESSION_START = "amadeus-session-start.ts";

describe("t326 adapter compose seam (U4)", () => {
  test("cursor reconstruct session-start invokes compose, session-start stays last (BR-U4-1)", () => {
    const env = parseCursorEnvelope(JSON.stringify({ hook_event_name: "sessionStart", source: "startup" }));
    expect(env).not.toBeNull();
    const recon = reconstruct("session-start", env!);
    expect("calls" in recon).toBe(true);
    if (!("calls" in recon)) throw new Error("unreachable");
    const files = recon.calls.map((c) => c.hookFile);
    // 1-point compose invocation present.
    expect(files).toContain(COMPOSE);
    // session-start is the LAST call so runAdapter forwards ITS stdout (Cursor's
    // context channel) — compose writes nothing to stdout and must not clobber it.
    expect(files[files.length - 1]).toBe(SESSION_START);
    expect(recon.forwardStdout).toBe(true);
    // compose runs with no synthesis payload (the core hook resolves its own dir).
    expect(recon.calls.find((c) => c.hookFile === COMPOSE)?.input).toBe("{}");
  });

  test("kimi routeTarget session-start invokes compose with translate none (BR-U4-1)", () => {
    const env = parseKimiEnvelope(JSON.stringify({ hook_event_name: "SessionStart", source: "startup" }));
    expect(env).not.toBeNull();
    const calls = routeTarget("session-start", env!);
    const compose = calls.find((c) => c.hookPath === COMPOSE);
    const start = calls.find((c) => c.hookPath === SESSION_START);
    expect(compose).toBeDefined();
    // translate "none" drops compose's (empty) stdout; the session-start relay
    // keeps owning Kimi's context channel.
    expect(compose?.translate).toBe("none");
    expect(start?.translate).toBe("session-start");
  });

  // Non-session-start targets are unchanged — compose is a session-start-only
  // wiring (it must not ride mint / audit / stop).
  test("compose is not wired into non-session-start targets", () => {
    const cEnv = parseCursorEnvelope(JSON.stringify({ hook_event_name: "afterFileEdit" }));
    const kEnv = parseKimiEnvelope(JSON.stringify({ hook_event_name: "SessionEnd", reason: "exit" }));
    const cRecon = reconstruct("session-end", cEnv!);
    if ("calls" in cRecon) expect(cRecon.calls.map((c) => c.hookFile)).not.toContain(COMPOSE);
    expect(routeTarget("session-end", kEnv!).map((c) => c.hookPath)).not.toContain(COMPOSE);
  });
});
