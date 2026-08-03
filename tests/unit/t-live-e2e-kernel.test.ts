import { describe, expect, test } from "bun:test";
import {
  codeMatchesStatus,
  sanitizeEvidence,
} from "../harness/live-e2e/contract.ts";
import {
  buildChildEnvironment,
  evaluateLiveGate,
  selectPrimaryPreflightCode,
} from "../harness/live-e2e/policy.ts";
import {
  LIVE_CAPABILITIES,
  capabilityById,
  validateCapabilityRegistry,
} from "../harness/live-e2e/registry.ts";
import {
  checkCapabilityMatrix,
  renderCapabilityMatrix,
} from "../harness/live-e2e/projector.ts";

describe("live E2E production kernel", () => {
  test("CI hard deny wins over strict adapter opt-in", () => {
    const capability = capabilityById("codex-exec");
    expect(capability.ok).toBe(true);
    if (!capability.ok) return;

    expect(
      evaluateLiveGate(
        { AMADEUS_CODEX_EXEC_LIVE: "1", GITHUB_ACTIONS: "true" },
        capability.value,
      ),
    ).toMatchObject({
      kind: "skip",
      code: "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN",
    });
  });

  test.each([undefined, "", "0", "true", "yes"])(
    "only the exact string one opts in (%s is denied)",
    (value) => {
      const capability = LIVE_CAPABILITIES[0];
      expect(
        evaluateLiveGate({ AMADEUS_CODEX_EXEC_LIVE: value }, capability),
      ).toMatchObject({
        kind: "skip",
        code: "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED",
      });
    },
  );

  test("preflight findings use the canonical fixed precedence", () => {
    expect(
      selectPrimaryPreflightCode([
        { code: "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE", diagnostic: "auth" },
        { code: "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING", diagnostic: "binary" },
        { code: "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING", diagnostic: "dist" },
      ]),
    ).toBe("AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING");
  });

  test("child environments are rebuilt from an allow-list without source pointers", () => {
    expect(
      buildChildEnvironment(
        {
          PATH: "/bin",
          HOME: "/source/home",
          AMADEUS_CODEX_EXEC_AUTH_HOME: "/source/auth",
          SECRET_TOKEN: "do-not-copy",
        },
        {
          allowedKeys: ["PATH"],
          sensitiveKeys: ["OPENAI_API_KEY"],
          sourcePathKeys: ["HOME", "AMADEUS_CODEX_EXEC_AUTH_HOME"],
        },
      ),
    ).toEqual({ ok: true, value: { PATH: "/bin" } });
  });

  test("outcome vocabulary and evidence sanitizer reject incompatible or secret-bearing data", () => {
    expect(codeMatchesStatus("success", "AMADEUS_LIVE_E2E:PASS:SUCCESS")).toBe(true);
    expect(codeMatchesStatus("success", "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED")).toBe(
      false,
    );
    expect(
      sanitizeEvidence({
        kind: "stderr",
        value: "token=sk-secret /Users/alice/.codex/auth.json",
        source: "adapter",
      }),
    ).toMatchObject({ value: "[REDACTED] <absolute-path>" });
  });

  test("registry validation catches duplicates and incomplete supported entries", () => {
    expect(validateCapabilityRegistry(LIVE_CAPABILITIES)).toEqual([]);
    expect(validateCapabilityRegistry([LIVE_CAPABILITIES[0], LIVE_CAPABILITIES[0]])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "duplicate-id", adapterId: "codex-exec" }),
      ]),
    );
  });

  test("matrix projection is deterministic and drift is loud", () => {
    const block = renderCapabilityMatrix(LIVE_CAPABILITIES, []);
    expect(block).toContain("<!-- AMADEUS_LIVE_E2E_MATRIX:START -->");
    expect(block).toContain("| codex-exec | codex | exec |");
    expect(block).toContain("UNVERIFIED");
    expect(checkCapabilityMatrix(`before\n${block}\nafter\n`, block)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(checkCapabilityMatrix("manually edited", block)).toMatchObject({
      ok: false,
      error: { kind: "generated-block-missing" },
    });
  });
});
