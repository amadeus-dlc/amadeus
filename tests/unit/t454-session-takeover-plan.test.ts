// covers: function:parseSessionTakeoverArgs, function:planSessionTakeover,
//         function:callerAuthorizationError
// size: small
//
// t454 — the PURE half of the manual takeover verb. Everything the verb decides
// before it touches a byte lives in two functions: the argv parse and the
// decision table. Driving them in-process is what makes the whole refusal
// ladder observable — the spawned CLI tests (t453) prove the contract at the
// argv boundary but their execution is not attributed to the parent LCOV
// report.
//
// No filesystem, no spawn: this file stays in the unit layer on purpose.

import { describe, expect, test } from "bun:test";
import { callerAuthorizationError } from "../../packages/framework/core/tools/amadeus-caller-authorization.ts";
import type {
  SessionTakeoverFacts,
  SessionTakeoverRequest,
} from "../../packages/framework/core/tools/amadeus-session-takeover.ts";
import {
  parseSessionTakeoverArgs,
  planSessionTakeover,
} from "../../packages/framework/core/tools/amadeus-session-takeover.ts";

function request(
  overrides: Partial<SessionTakeoverRequest> = {},
): SessionTakeoverRequest {
  return {
    confirmed: true,
    confirmedRoles: null,
    sessionId: null,
    ...overrides,
  };
}

function facts(
  overrides: Partial<SessionTakeoverFacts> = {},
): SessionTakeoverFacts {
  return {
    denial: { reason: "marker-absent", role: "unknown" },
    hostSessionId: "host-session",
    retainedRoles: [],
    humanTurnGrounded: true,
    ...overrides,
  };
}

function parsed(args: string[]): SessionTakeoverRequest {
  const result = parseSessionTakeoverArgs(args);
  if (result.kind !== "parsed") {
    throw new Error(`expected a parse, got: ${result.message}`);
  }
  return result.request;
}

function invalid(args: string[]): string {
  const result = parseSessionTakeoverArgs(args);
  if (result.kind !== "invalid") {
    throw new Error(`expected a rejection, got a parse`);
  }
  return result.message;
}

describe("parseSessionTakeoverArgs", () => {
  test("reads the three supported flags", () => {
    expect(parsed([])).toEqual({
      confirmed: false,
      confirmedRoles: null,
      sessionId: null,
    });
    expect(parsed(["--confirm"])).toEqual({
      confirmed: true,
      confirmedRoles: null,
      sessionId: null,
    });
    expect(parsed(["--confirm", "--session-id", "kimi-42"]).sessionId).toBe(
      "kimi-42",
    );
    expect(
      parsed(["--confirm", "--confirm-roles", " a , b ,"]).confirmedRoles,
    ).toEqual(["a", "b"]);
  });

  // The defect this pins: a trailing `--session-id` used to fall off the end of
  // the loop, leaving sessionId null so the plan silently adopted the
  // host-stamped session instead of the one the operator named — a rebind of a
  // DIFFERENT session, reported as success.
  test("rejects a flag whose value is missing", () => {
    expect(invalid(["--confirm", "--session-id"])).toContain("--session-id");
    expect(invalid(["--confirm", "--confirm-roles"])).toContain(
      "--confirm-roles",
    );
  });

  test("rejects a value that is another flag", () => {
    expect(invalid(["--session-id", "--confirm"])).toContain("--session-id");
    expect(invalid(["--confirm-roles", "--confirm"])).toContain(
      "--confirm-roles",
    );
  });

  test("rejects a blank value rather than falling back", () => {
    expect(invalid(["--session-id", "   "])).toContain("--session-id");
    expect(invalid(["--confirm-roles", " , "])).toContain("--confirm-roles");
  });

  test("rejects an unknown argument", () => {
    expect(invalid(["--confirm", "--force"])).toContain("--force");
    expect(invalid(["takeover"])).toContain("takeover");
  });
});

describe("planSessionTakeover refuses before it decides", () => {
  test("an unconfirmed request never learns the session id", () => {
    const decision = planSessionTakeover(
      request({ confirmed: false }),
      facts(),
    );
    expect(decision.kind).toBe("refused");
    if (decision.kind !== "refused") return;
    expect(decision.message).toContain("--confirm");
    expect(decision.message).not.toContain("host-session");
  });

  test("an ungrounded request is refused even when confirmed", () => {
    const decision = planSessionTakeover(
      request(),
      facts({ humanTurnGrounded: false }),
    );
    expect(decision.kind).toBe("refused");
    if (decision.kind !== "refused") return;
    expect(decision.message).toContain("HUMAN_TURN");
  });
});

describe("planSessionTakeover decides against the carrier facts", () => {
  test("an authorized caller is a no-op", () => {
    expect(planSessionTakeover(request(), facts({ denial: null }))).toEqual({
      kind: "noop",
    });
  });

  test("refuses when no session id can be determined", () => {
    // The two shapes readHostSessionId can actually produce: absent, and the
    // empty-string guard the plan keeps for a caller that builds facts by hand.
    for (const hostSessionId of [null, ""]) {
      const decision = planSessionTakeover(
        request(),
        facts({ hostSessionId }),
      );
      expect(decision.kind).toBe("refused");
      if (decision.kind !== "refused") continue;
      expect(decision.message).toContain(".current-session");
    }
  });

  test("adopts the host-stamped session when none is named", () => {
    expect(planSessionTakeover(request(), facts())).toEqual({
      kind: "rebind",
      reason: "marker-absent",
      sessionId: "host-session",
      retainedRoles: [],
    });
  });

  test("an explicit --session-id wins over the host stamp", () => {
    const decision = planSessionTakeover(
      request({ sessionId: "  chosen-session  " }),
      facts(),
    );
    expect(decision).toEqual({
      kind: "rebind",
      reason: "marker-absent",
      sessionId: "chosen-session",
      retainedRoles: [],
    });
  });

  test("refuses to seize an unacknowledged retained role", () => {
    const decision = planSessionTakeover(
      request(),
      facts({ retainedRoles: ["reviewer"] }),
    );
    expect(decision.kind).toBe("refused");
    if (decision.kind !== "refused") return;
    expect(decision.message).toContain("--confirm-roles");
    expect(decision.message).toContain("reviewer");
  });

  test("refuses an acknowledgement that names a different role set", () => {
    const decision = planSessionTakeover(
      request({ confirmedRoles: ["builder"] }),
      facts({ retainedRoles: ["reviewer"] }),
    );
    expect(decision.kind).toBe("refused");
    if (decision.kind !== "refused") return;
    expect(decision.message).toContain("builder");
    expect(decision.message).toContain("reviewer");
  });

  test("accepts an acknowledgement that matches modulo order and duplicates", () => {
    const decision = planSessionTakeover(
      request({ confirmedRoles: ["reviewer", " builder ", "reviewer"] }),
      facts({
        denial: { reason: "deny-latch", role: "unknown" },
        retainedRoles: ["builder", "reviewer"],
      }),
    );
    expect(decision).toEqual({
      kind: "rebind",
      reason: "deny-latch",
      sessionId: "host-session",
      retainedRoles: ["builder", "reviewer"],
    });
  });
});

describe("callerAuthorizationError", () => {
  test("names the retained role and the acknowledgement flag for active-role", () => {
    const message = callerAuthorizationError({
      reason: "active-role",
      role: "amadeus-quality-agent",
    });
    expect(message).toContain("amadeus-quality-agent");
    expect(message).toContain("--confirm-roles");
    expect(message).toContain("session-takeover");
  });

  test("omits the roles hint for every other reason", () => {
    for (const reason of ["deny-latch", "marker-absent", "session-mismatch"] as const) {
      const message = callerAuthorizationError({ reason, role: "unknown" });
      expect(message).toContain(`Cause (${reason})`);
      expect(message).not.toContain("--confirm-roles");
    }
  });
});
