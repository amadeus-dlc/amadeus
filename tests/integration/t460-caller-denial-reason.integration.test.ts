// covers: function:authorizeMainConductor, function:callerAuthorizationError,
//         function:detectHarnessTypeForAuthorization
// size: medium
//
// t460 — the Kimi caller-authorization denial REASON contract (FR-1) and the
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
// reads the real filesystem, so this belongs in the integration layer). Each
// fixture root carries a REAL `.kimi-code/` marker rather than an
// AMADEUS_HARNESS_TYPE override: since #2326 the guard answers the harness
// question from process evidence, and a fixture that could only reach the Kimi
// branch through the environment would be testing a route that no longer
// exists. The final describe pins that closure from both directions.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CURRENT_SESSION_RELATIVE_PATH,
  authorizeMainConductor,
  callerAuthorizationError,
  type CallerDenialReason,
  KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH,
  KIMI_SESSION_ENDED_DENY_RELATIVE_PATH,
  KIMI_SUBAGENT_DENY_RELATIVE_PATH,
} from "../../packages/framework/core/tools/amadeus-caller-authorization.ts";
import { detectHarnessTypeForAuthorization } from "../../packages/framework/core/tools/amadeus-harness.ts";

const MAIN_SESSION = "main-session";

const roots: string[] = [];
let previousHarnessType: string | undefined;

// The baseline is env-NEUTRAL: every assertion below must hold on the harness
// evidence alone. beforeEach clears the override rather than setting it so an
// AMADEUS_HARNESS_TYPE inherited from the surrounding session cannot colour a
// single case.
beforeEach(() => {
  previousHarnessType = process.env.AMADEUS_HARNESS_TYPE;
  delete process.env.AMADEUS_HARNESS_TYPE;
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

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-carrier-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus", ".amadeus-sessions"), { recursive: true });
  return root;
}

/** A workspace whose REAL evidence is Kimi: the shipped `.kimi-code/tools/`. */
function carrierRoot(): string {
  const root = tempRoot();
  mkdirSync(join(root, ".kimi-code", "tools"), { recursive: true });
  return root;
}

/** The same workspace shape on a harness the guard is inert for. */
function nonKimiRoot(): string {
  const root = tempRoot();
  mkdirSync(join(root, ".claude", "tools"), { recursive: true });
  return root;
}

/** Run `action` with AMADEUS_HARNESS_TYPE forced to `value` (absent when null). */
function withHarnessTypeEnv<T>(value: string | null, action: () => T): T {
  const saved = process.env.AMADEUS_HARNESS_TYPE;
  if (value === null) delete process.env.AMADEUS_HARNESS_TYPE;
  else process.env.AMADEUS_HARNESS_TYPE = value;
  try {
    return action();
  } finally {
    if (saved === undefined) delete process.env.AMADEUS_HARNESS_TYPE;
    else process.env.AMADEUS_HARNESS_TYPE = saved;
  }
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

describe("carrier faults and role guidance stay fail-closed (FR-1/FR-2)", () => {
  // A carrier that exists but cannot be parsed proves nothing about who the
  // main conductor is — the guard must treat it exactly like an absent one.
  test.each([
    ["unparseable JSON", "{"],
    ["a non-object roles field", JSON.stringify({ version: 1, mainSessionId: "main-session", roles: [] })],
  ])("a carrier with %s fails closed as marker-absent", (_label, body) => {
    const root = carrierRoot();
    writeAt(root, KIMI_ACTIVE_SUBAGENTS_RELATIVE_PATH, `${body}\n`);
    writeCurrentSession(root);

    expect(denialOf(root)).toEqual({ reason: "marker-absent", role: "unknown" });
  });

  test("the active-role message tells the operator to acknowledge the retained role", () => {
    const message = callerAuthorizationError({
      reason: "active-role",
      role: "reviewer",
    });

    expect(message).toContain('--confirm-roles "reviewer"');
  });
});

// #2326 — `AMADEUS_HARNESS_TYPE` was read by the guard itself, so exporting any
// non-Kimi value made authorizeMainConductor return `authorized` before it
// looked at a single carrier file: the marker, session and role checks were all
// skipped, on every workspace, by anyone who could set an environment variable.
// The closure has to hold in BOTH directions — the override must not be able to
// lift the boundary where it applies, and must not be able to impose it where
// it does not — because a one-directional fix would just relocate the bypass.
describe("the harness-type env cannot move an authorization outcome (#2326)", () => {
  // "" and "not-a-harness" are included deliberately: detectHarnessType()
  // normalizes both to "unknown", and "unknown" !== "kimi" was the cheapest
  // form of the bypass — it needed no valid harness name at all.
  const overrides = ["claude-code", "codex", "manual", "unknown", "not-a-harness", ""];

  test.each(overrides)(
    'a "%s" override still denies a broken carrier on a real Kimi workspace',
    (override) => {
      const root = carrierRoot();
      writeCurrentSession(root);

      expect(withHarnessTypeEnv(override, () => authorizeMainConductor(root)))
        .toEqual({ kind: "denied", reason: "marker-absent", role: "unknown" });
    },
  );

  test("every denial reason survives a non-Kimi override unchanged", () => {
    const latch = coherentRoot();
    writeAt(latch, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH, "session-ended\n");
    const absent = carrierRoot();
    writeCurrentSession(absent);
    const mismatch = coherentRoot();
    writeCurrentSession(mismatch, "other-harness-session");
    const active = carrierRoot();
    writeMarker(active, MAIN_SESSION, { reviewer: 1 });
    writeCurrentSession(active);

    const cases = [latch, absent, mismatch, active];
    const baseline = cases.map((root) => denialOf(root));
    const overridden = withHarnessTypeEnv(
      "claude-code",
      () => cases.map((root) => denialOf(root)),
    );

    expect(overridden).toEqual(baseline);
    expect(overridden.map((denial) => denial.reason)).toEqual([
      "deny-latch",
      "marker-absent",
      "session-mismatch",
      "active-role",
    ]);
  });

  test("a non-Kimi override does not deny a coherent carrier either", () => {
    const root = coherentRoot();
    expect(withHarnessTypeEnv("claude-code", () => authorizeMainConductor(root)))
      .toEqual({ kind: "authorized" });
  });

  // The other direction: a "kimi" override on a workspace that is NOT Kimi must
  // not switch the guard ON. A Claude Code session whose carrier files were
  // never written would otherwise be denied every mutating verb by an inherited
  // environment variable — the same defect with the sign flipped.
  test('a "kimi" override does not impose the guard on a non-Kimi workspace', () => {
    const root = nonKimiRoot();
    writeAt(root, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH, "session-ended\n");
    writeCurrentSession(root, "some-other-session");

    expect(withHarnessTypeEnv("kimi", () => authorizeMainConductor(root)))
      .toEqual({ kind: "authorized" });
  });

  // The detector under the guard, pinned directly: whatever the environment
  // says, the answer tracks the workspace marker.
  test("the authorization detector reads the workspace, never the env", () => {
    const kimi = carrierRoot();
    const claude = nonKimiRoot();

    for (const override of [...overrides, "kimi", null]) {
      expect(withHarnessTypeEnv(
        override,
        () => detectHarnessTypeForAuthorization(kimi),
      )).toBe("kimi");
      expect(withHarnessTypeEnv(
        override,
        () => detectHarnessTypeForAuthorization(claude),
      )).toBe("claude-code");
    }
  });
});
