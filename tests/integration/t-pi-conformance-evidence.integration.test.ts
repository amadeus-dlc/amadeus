// Machine closure for the Pi M1-M10 trace and formal evidence contract.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PI_MILESTONE_IDS,
  validatePiFormalEvidence,
} from "../../scripts/pi-conformance-evidence.ts";
import { dispatchPiLiveChild, runPiLiveRpc } from "../../scripts/pi-live-rpc.ts";

const ROOT = join(import.meta.dir, "..", "..");
const TRACE_PATH = join(ROOT, "tests", "conformance", "pi-m1-m10-trace.md");
const SCHEMA_PATH = join(ROOT, "tests", "conformance", "pi-formal-evidence.schema.json");

const REQUIREMENTS = {
  M1: ["FR-HAR-001", "FR-HAR-002", "FR-HAR-003"],
  M2: ["FR-LIF-001", "FR-LIF-002", "FR-LIF-003", "FR-LIF-004", "FR-LIF-005", "FR-LIF-006"],
  M3: ["FR-GAT-001", "FR-GAT-002", "FR-GAT-003", "FR-GAT-004", "FR-LIF-003", "FR-LIF-004", "FR-LIF-005"],
  M4: ["FR-SUB-001", "FR-SUB-002", "FR-SUB-003", "FR-SUB-004", "FR-SUB-005"],
  M5: ["FR-DOC-001", "FR-DOC-002", "FR-DOC-003"],
  M6: ["FR-DST-001"],
  M7: ["FR-DST-002", "FR-DST-003"],
  M8: ["FR-DST-004", "FR-DST-005", "NFR-REL-001"],
  M9: ["FR-VAL-001", "FR-VAL-002"],
  M10: ["FR-VAL-003", "FR-VAL-004"],
} as const;

function assertions(): Record<string, true> {
  return Object.fromEntries(PI_MILESTONE_IDS.map((id) => [id, true] as const));
}

function run(platform: "darwin" | "linux") {
  return {
    platform,
    piVersion: "0.83.0",
    providerId: "anthropic/claude-test",
    executedAt: "2026-08-04T00:00:00.000Z",
    rpc: {
      status: "passed",
      driverTerminal: "succeeded",
      humanTurnCount: 0,
      gateApprovedCount: 0,
      outputDigest: "a".repeat(64),
    },
    tui: {
      status: "passed",
      humanTurnCount: 1,
      gateApprovedCount: 1,
      transcriptDigest: "b".repeat(64),
    },
    assertions: assertions(),
  };
}

function evidence() {
  return {
    schemaVersion: 1,
    candidate: { verificationCommit: "c".repeat(40), catalogDigest: "d".repeat(64) },
    runs: [run("darwin"), run("linux")],
    windowsNegative: { platform: "win32", doctorCheckId: "pi.os", rejected: true },
  };
}

describe("Pi M1-M10 trace", () => {
  test("contains every milestone once with its approved requirement mapping and existing evidence paths", () => {
    const trace = readFileSync(TRACE_PATH, "utf8");
    const rows = trace.split("\n").filter((line) => /^\| M(?:[1-9]|10) \|/.test(line));
    expect(rows).toHaveLength(10);
    expect(rows.map((row) => row.split("|")[1]?.trim())).toEqual([...PI_MILESTONE_IDS]);
    for (const id of PI_MILESTONE_IDS) {
      const row = rows.find((candidate) => candidate.startsWith(`| ${id} |`));
      expect(row).toBeDefined();
      for (const requirement of REQUIREMENTS[id]) expect(row).toContain(requirement);
    }
    for (const path of [...trace.matchAll(/`((?:tests|scripts|docs)\/[A-Za-z0-9._/-]+\.(?:ts|json|md))`/g)].map((match) => match[1])) {
      expect(existsSync(join(ROOT, path))).toBe(true);
    }
  });

  test("schema names the same closed assertions and platform evidence", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.runs.minItems).toBe(2);
    expect(schema.properties.runs.maxItems).toBe(2);
    expect(Object.keys(schema.$defs.assertions.properties)).toEqual([...PI_MILESTONE_IDS]);
    expect(schema.properties.windowsNegative.properties.platform.const).toBe("win32");
    expect(schema.properties.windowsNegative.properties.doctorCheckId.const).toBe("pi.os");
  });
});

describe("Pi formal evidence admission", () => {
  test("dispatches the live child through the lifecycle that owns its parent operation", async () => {
    const lifecycle = {} as Parameters<typeof dispatchPiLiveChild>[1];
    let receivedLifecycle: unknown;
    let receivedProviderId: unknown;
    let receivedModelId: unknown;
    const result = await dispatchPiLiveChild(
      {},
      lifecycle,
      "openai-codex",
      "gpt-5.4-mini",
      async (_request, options) => {
        receivedLifecycle = options?.lifecycle;
        receivedProviderId = options?.providerId;
        receivedModelId = options?.modelId;
        return { kind: "dispatch-not-started", reason: "test-stop", output: "", replayed: false };
      },
    );

    expect(receivedLifecycle).toBe(lifecycle);
    expect(receivedProviderId).toBe("openai-codex");
    expect(receivedModelId).toBe("gpt-5.4-mini");
    expect(result.kind).toBe("dispatch-not-started");
  });

  test("admits exactly one macOS and Linux green run plus the Windows negative", () => {
    expect(validatePiFormalEvidence(evidence()).status).toBe("green");
  });

  test("rejects missing platforms, old Pi, credential-like provider ids, RPC presence, and incomplete milestones", () => {
    const missingPlatform = evidence();
    missingPlatform.runs = [run("linux"), run("linux")];
    expect(validatePiFormalEvidence(missingPlatform).status).toBe("invalid");

    const oldPi = evidence();
    oldPi.runs[0]!.piVersion = "0.82.9";
    expect(validatePiFormalEvidence(oldPi).status).toBe("invalid");

    const credential = evidence();
    credential.runs[0]!.providerId = "https://user:secret@example.test";
    expect(validatePiFormalEvidence(credential).status).toBe("invalid");

    const rpcPresence = evidence();
    rpcPresence.runs[0]!.rpc.humanTurnCount = 1;
    expect(validatePiFormalEvidence(rpcPresence).status).toBe("invalid");

    const incomplete = evidence();
    delete incomplete.runs[0]!.assertions.M10;
    expect(validatePiFormalEvidence(incomplete).status).toBe("invalid");
  });

  test("does not promote an ordinary non-opted-in live check to formal evidence", async () => {
    expect(await runPiLiveRpc({})).toEqual({ status: "skipped", reason: "opt-in-disabled" });
    expect(validatePiFormalEvidence({ status: "skipped", reason: "opt-in-disabled" }).status).toBe("invalid");
  });
});
