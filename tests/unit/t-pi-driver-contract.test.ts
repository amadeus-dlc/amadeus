import { describe, expect, test } from "bun:test";
import {
  createPiRpcCollector,
  fingerprintPiRequest,
  parsePiChildRequest,
} from "../../packages/framework/harness/pi/drivers/amadeus-pi-driver-contract.ts";
import { parsePiDriverInput } from "../../packages/framework/harness/pi/drivers/amadeus-pi-driver.ts";

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
  test("narrows driver stdin JSON without throwing or widening malformed input", () => {
    expect(parsePiDriverInput(JSON.stringify(request))).toEqual(request);
    expect(parsePiDriverInput("{not-json")).toBeNull();
    expect(parsePiChildRequest(parsePiDriverInput("{not-json"))).toEqual({
      ok: false,
      reason: "request-shape-invalid",
    });
  });

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
        provider: "openai-codex-account-2",
        model: "gpt-5.6-sol",
        content: [
          { type: "thinking", thinking: "hidden" },
          { type: "text", text: "visible" },
          { type: "toolCall", name: "bash" },
        ],
        stopReason: "stop",
      },
    }));
    collector.acceptLine(JSON.stringify({ type: "agent_settled" }));
    expect(collector.observation()).toEqual({
      output: "visible",
      semanticFailure: null,
      settled: true,
      providerId: "openai-codex-account-2",
      modelId: "gpt-5.6-sol",
    });
  });

  test("admits a successful multi-account continuation after an exhausted account", () => {
    const collector = createPiRpcCollector("request-1", 100);
    collector.acceptLine(JSON.stringify({ id: "request-1", type: "response", command: "prompt", success: true }));
    collector.acceptLine(JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        provider: "openai-codex",
        model: "gpt-5.6-sol",
        content: [],
        stopReason: "error",
        errorMessage: "usage limit has been reached",
      },
    }));
    collector.acceptLine(JSON.stringify({ type: "agent_end", willRetry: false }));
    collector.acceptLine(JSON.stringify({ type: "agent_settled" }));
    collector.acceptLine(JSON.stringify({ type: "agent_start" }));
    collector.acceptLine(JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        provider: "openai-codex-account-2",
        model: "gpt-5.6-sol",
        content: [{ type: "text", text: "OK" }],
        stopReason: "stop",
      },
    }));
    collector.acceptLine(JSON.stringify({ type: "agent_end", willRetry: false }));
    collector.acceptLine(JSON.stringify({ type: "agent_settled" }));

    expect(collector.observation()).toEqual({
      output: "OK",
      semanticFailure: null,
      settled: true,
      providerId: "openai-codex-account-2",
      modelId: "gpt-5.6-sol",
    });
  });

  test("first semantic failure wins", () => {
    const collector = createPiRpcCollector("request-1", 3);
    collector.acceptLine(JSON.stringify({ id: "wrong", type: "response", command: "prompt", success: true }));
    collector.acceptLine("not-json");
    expect(collector.observation().semanticFailure).toBe("rpc-correlation-failed");
  });

  test("fails closed when one RPC line exceeds its byte cap", () => {
    const collector = createPiRpcCollector("request-1", 100, 4);
    collector.acceptLine("12345");
    expect(collector.observation().semanticFailure).toBe("rpc-line-cap-exceeded");
  });

  test("fails closed when assistant text exceeds the output byte cap", () => {
    const collector = createPiRpcCollector("request-1", 4);
    collector.acceptLine(JSON.stringify({
      type: "message_end",
      message: { role: "assistant", content: [{ type: "text", text: "12345" }] },
    }));
    expect(collector.observation().semanticFailure).toBe("output-cap-exceeded");
  });
});
