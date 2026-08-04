import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";
import {
  codeMatchesStatus,
  sanitizeEvidence,
  sanitizeText,
  stableJson,
} from "../harness/live-e2e/contract.ts";
import {
  buildChildEnvironment,
  evaluateLiveGate,
  selectPrimaryPreflightCode,
} from "../harness/live-e2e/policy.ts";
import {
  LIVE_CAPABILITIES,
  capabilityById,
  requireCapability,
  validateCapabilityRegistry,
} from "../harness/live-e2e/registry.ts";
import {
  checkCapabilityMatrix,
  renderCapabilityMatrix,
  updateCapabilityMatrix,
} from "../harness/live-e2e/projector.ts";
import {
  currentGitSha,
  LIVE_E2E_LEDGER,
  liveScratchLeakCheck,
} from "../harness/live-e2e/testing/live-kernel.ts";
import { collectBounded } from "../harness/live-e2e/stream.ts";
import { parseVersion, versionAtLeast } from "../harness/live-e2e/version.ts";

describe("live E2E production kernel", () => {
  test("live kernel helpers keep ledgers external and report scratch leaks", async () => {
    expect(LIVE_E2E_LEDGER.startsWith(REPO_ROOT)).toBe(false);
    expect(currentGitSha()).toMatch(/^[a-f0-9]{40}$/);
    const root = mkdtempSync(join(tmpdir(), "live-kernel-leak-"));
    const target = {
      scratch: { root, homeDir: join(root, "home"), projectDir: join(root, "project"), state: "ready" as const },
      registeredResources: [],
    };
    try {
      expect(await liveScratchLeakCheck(target)).toEqual(["scratch root remained after cleanup"]);
      rmSync(root, { recursive: true, force: true });
      expect(await liveScratchLeakCheck(target)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("shared stream and version helpers preserve bounds and comparison", async () => {
    const stream = new Response("abcdef").body;
    if (stream === null) throw new Error("fixture stream is unavailable");
    const collected = await collectBounded(stream, 3);
    expect(new TextDecoder().decode(collected.bytes)).toBe("abc");
    expect(collected).toMatchObject({ overflowed: true });
    expect(parseVersion("tool 2.1.220")).toEqual([2, 1, 220]);
    expect(parseVersion("missing")).toBeNull();
    expect(versionAtLeast([2, 1, 220], [2, 1, 220])).toBe(true);
    expect(versionAtLeast([2, 1, 219], [2, 1, 220])).toBe(false);
  });

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

  test.each([undefined, "", "0", "true", "yes", " 1", "1 "])(
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
    expect(sanitizeText(`token=sk-secret-${"x".repeat(600)}`, 16)).not.toContain(
      "sk-secret",
    );
    expect(JSON.parse(stableJson({ omitted: undefined, items: [undefined, "ok"] }))).toEqual({
      items: [null, "ok"],
    });
    expect(stableJson({ ä: 1, z: 2 })).toBe('{"z":2,"ä":1}');
  });

  test("registry validation catches duplicate identifiers", () => {
    expect(validateCapabilityRegistry(LIVE_CAPABILITIES)).toEqual([]);
    expect(validateCapabilityRegistry([LIVE_CAPABILITIES[0], LIVE_CAPABILITIES[0]])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "duplicate-id", adapterId: "codex-exec" }),
      ]),
    );
  });

  test("capability requirements resolve by identity and reject unknown IDs", () => {
    expect(requireCapability("codex-exec").id).toBe("codex-exec");
    expect(() => requireCapability("missing" as never)).toThrow(
      "missing capability is not registered",
    );
    expect(validateCapabilityRegistry([{ ...requireCapability("codex-exec"), status: "unverified" }]))
      .toEqual([{ kind: "missing-issue", adapterId: "codex-exec" }]);
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
    const escaped = renderCapabilityMatrix([{
      ...LIVE_CAPABILITIES[0],
      harness: "codex|fixture",
      transport: "exec|json",
      status: "unsupported",
      followUpIssue: "$&|issue",
    }], []);
    expect(escaped).toContain("codex\\|fixture");
    expect(escaped).toContain("$&\\|issue");
    expect(updateCapabilityMatrix(`before\n${block}\nafter`, "$& replacement")).toBe(
      "before\n$& replacement\nafter",
    );
  });
});
