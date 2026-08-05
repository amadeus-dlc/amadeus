// covers: function:authorizeMainConductor, function:callerAuthorizationError
// size: medium
//
// t448 — the Kimi caller-authorization denial REASON contract (FR-1) and the
// recovery guidance carried by the denial message (FR-2).
//
// Before this contract every denial collapsed into `role: "unknown"`, so a
// missing role carrier, a stale `.current-session`, and a residual deny latch
// were indistinguishable to the operator (RE 260805 §"決定的再現", cases
// C1-C6). The reason value is what makes the four causes separable, and the
// message is what tells the operator which of the two recovery layers to use.
//
// Mechanism: in-process import of the guard with real carrier fixtures under
// the OS temp dir (cid:code-generation:fs-tests-integration-first — the guard
// reads the real filesystem, so this belongs in the integration layer). The
// harness type is forced through AMADEUS_HARNESS_TYPE, exactly as the RE
// reproduction did, because the guard is inert on every non-Kimi harness.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  authorizeMainConductor,
  callerAuthorizationError,
  type CallerDenialReason,
  KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
  KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
  KIMI_SUBAGENT_DENY_RELATIVE_PATH,
} from "../../packages/framework/core/tools/amadeus-caller-authorization.ts";

const MAIN_SESSION = "main-session";
const CURRENT_SESSION_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  ".current-session",
);

const roots: string[] = [];
let previousHarnessType: string | undefined;

beforeEach(() => {
  previousHarnessType = process.env.AMADEUS_HARNESS_TYPE;
  process.env.AMADEUS_HARNESS_TYPE = "kimi";
});

afterEach(() => {
  if (previousHarnessType === undefined) {
    delete process.env.AMADEUS_HARNESS_TYPE;
  } else {
    process.env.AMADEUS_HARNESS_TYPE = previousHarnessType;
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function carrierRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-carrier-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus", ".amadeus-sessions"), { recursive: true });
  return root;
}

function writeAt(root: string, relative: string, body: string): void {
  const path = join(root, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf-8");
}

function writeMarker(
  root: string,
  sessionId = MAIN_SESSION,
  roles: Record<string, number> = {},
): void {
  writeAt(
    root,
    KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
    `${JSON.stringify({ version: 1, mainSessionId: sessionId, roles })}\n`,
  );
}

function writeCurrentSession(root: string, sessionId = MAIN_SESSION): void {
  writeAt(root, CURRENT_SESSION_RELATIVE_PATH, `${sessionId}\n`);
}

/** C4 — the coherent baseline every other case perturbs. */
function coherentRoot(): string {
  const root = carrierRoot();
  writeMarker(root);
  writeCurrentSession(root);
  return root;
}

function denialOf(root: string): { reason: string; role: string } {
  const authorization = authorizeMainConductor(root);
  if (authorization.kind !== "denied") {
    throw new Error(`expected a denial, got ${authorization.kind}`);
  }
  return { reason: authorization.reason, role: authorization.role };
}

describe("Kimi caller-authorization denial reasons (FR-1)", () => {
  test("C4 — a coherent carrier stays authorized", () => {
    expect(authorizeMainConductor(coherentRoot())).toEqual({
      kind: "authorized",
    });
  });

  test("C1/C2/C3/C5 carry four mutually distinct reasons", () => {
    // C1 — role marker absent.
    const c1 = carrierRoot();
    writeCurrentSession(c1);

    // C2 — `.current-session` overwritten by another harness.
    const c2 = coherentRoot();
    writeCurrentSession(c2, "other-harness-session");

    // C3 — session-ended deny latch retained.
    const c3 = coherentRoot();
    writeAt(c3, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH, "session-ended\n");

    // C5 — an active subagent role remains.
    const c5 = carrierRoot();
    writeMarker(c5, MAIN_SESSION, { reviewer: 1 });
    writeCurrentSession(c5);

    const reasons = [c1, c2, c3, c5].map((root) => denialOf(root).reason);
    expect(new Set(reasons).size).toBe(4);
    expect(reasons).toEqual([
      "marker-absent",
      "session-mismatch",
      "deny-latch",
      "active-role",
    ]);
  });

  test("the subagent-transition latch and the marker lock both read as deny-latch", () => {
    const transition = coherentRoot();
    writeAt(transition, KIMI_SUBAGENT_DENY_RELATIVE_PATH, "subagent-start\n");
    expect(denialOf(transition).reason).toBe("deny-latch");

    const locked = coherentRoot();
    mkdirSync(join(locked, `${KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH}.lock`), {
      recursive: true,
    });
    expect(denialOf(locked).reason).toBe("deny-latch");
  });

  test("C6 — a split carrier reports the same reason as C1", () => {
    // The Kimi adapter writes the carrier under the raw payload cwd while the
    // core hooks resolve a marker-verified project dir, so a session launched
    // from a subdirectory splits the two faces. From the guard's project dir
    // the split is indistinguishable from an absent marker, and requirements
    // FR-1 fixes that as correct: no fifth reason value is minted for it.
    const split = carrierRoot();
    const adapterView = join(split, "sub");
    mkdirSync(adapterView, { recursive: true });
    writeMarker(adapterView);
    writeCurrentSession(adapterView);
    writeCurrentSession(split);

    const c1 = carrierRoot();
    writeCurrentSession(c1);

    expect(denialOf(split).reason).toBe(denialOf(c1).reason);
    expect(denialOf(split).reason).toBe("marker-absent");
  });

  test("an active role keeps reporting its role name", () => {
    const root = carrierRoot();
    writeMarker(root, MAIN_SESSION, { "amadeus-product-lead-agent": 1 });
    writeCurrentSession(root);
    expect(denialOf(root)).toEqual({
      reason: "active-role",
      role: "amadeus-product-lead-agent",
    });
  });
});

describe("caller-authorization denial message (FR-2)", () => {
  const reasons: CallerDenialReason[] = [
    "deny-latch",
    "marker-absent",
    "session-mismatch",
    "active-role",
  ];

  test.each(reasons)("the %s message names an executable recovery command", (reason) => {
    const message = callerAuthorizationError({ reason, role: "unknown" });
    expect(message).toContain("session-takeover");
    expect(message).toContain("amadeus-state.ts");
  });

  test("every reason produces a distinct cause sentence", () => {
    const messages = reasons.map((reason) =>
      callerAuthorizationError({ reason, role: "unknown" })
    );
    expect(new Set(messages).size).toBe(reasons.length);
    for (const [index, message] of messages.entries()) {
      expect(message).toContain(reasons[index] as string);
    }
  });

  test("the pre-existing denial substring is preserved verbatim", () => {
    for (const reason of reasons) {
      expect(callerAuthorizationError({ reason, role: "reviewer" })).toContain(
        'Kimi caller role "reviewer" is not the main conductor',
      );
    }
  });

  test("no message offers the harness-type env as a recovery route (NFR-1)", () => {
    for (const reason of reasons) {
      expect(callerAuthorizationError({ reason, role: "unknown" })).not.toContain(
        "AMADEUS_HARNESS_TYPE",
      );
    }
  });
});
