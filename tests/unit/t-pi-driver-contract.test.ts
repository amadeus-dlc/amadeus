import { describe, expect, test } from "bun:test";
import {
  createPiRpcCollector,
  fingerprintPiRequest,
  parsePiChildRequest,
} from "../../packages/framework/harness/pi/drivers/amadeus-pi-driver-contract.ts";

const request = {
  schemaVersion: 1,
  deliveryKey: "unit:1",
  role: "swarm",
  prompt: "do work",
  projectDir: "/project",
  parentExecution: { operationId: "parent", rootOperationId: "root" },
  childOrdinal: 1,
  timeoutMs: 1_000,
  outputLimitBytes: 1_024,
} as const;

describe("Pi child request contract", () => {
  test("accepts the closed schema and fingerprints it deterministically", () => {
    const parsed = parsePiChildRequest(request);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(fingerprintPiRequest(parsed.value)).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprintPiRequest(parsed.value)).toBe(fingerprintPiRequest(parsed.value));
  });

  test("rejects unknown keys, malformed roles, and credential-like extension fields", () => {
    expect(parsePiChildRequest({ ...request, extra: true })).toEqual({ ok: false, reason: "request-shape-invalid" });
    expect(parsePiChildRequest({ ...request, role: "admin" })).toEqual({ ok: false, reason: "role-invalid" });
    expect(parsePiChildRequest({ ...request, apiKey: "secret" })).toEqual({ ok: false, reason: "request-shape-invalid" });
  });
});

describe("Pi RPC collector", () => {
  test("correlates prompt and extracts assistant text blocks only", () => {
    const collector = createPiRpcCollector("request-1", 100);
    collector.acceptLine(JSON.stringify({ id: "request-1", type: "response", command: "prompt", success: true }));
    collector.acceptLine(JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "hidden" },
          { type: "text", text: "visible" },
          { type: "toolCall", name: "bash" },
        ],
        stopReason: "stop",
      },
    }));
    collector.acceptLine(JSON.stringify({ type: "agent_settled" }));
    expect(collector.observation()).toEqual({ output: "visible", semanticFailure: null, settled: true });
  });

  test("first semantic failure wins", () => {
    const collector = createPiRpcCollector("request-1", 3);
    collector.acceptLine(JSON.stringify({ id: "wrong", type: "response", command: "prompt", success: true }));
    collector.acceptLine("not-json");
    expect(collector.observation().semanticFailure).toBe("rpc-correlation-failed");
  });
});
