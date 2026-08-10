import { scaleTestTime } from "../lib/test-time-factor.ts";
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
  timeoutMs: scaleTestTime(1_000),
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

  test("rejects every bounded identity and parent-execution field", () => {
    expect(parsePiChildRequest({ ...request, deliveryKey: "bad key" })).toEqual({ ok: false, reason: "delivery-key-invalid" });
    expect(parsePiChildRequest({ ...request, childOrdinal: 0 })).toEqual({ ok: false, reason: "child-ordinal-invalid" });
    expect(parsePiChildRequest({ ...request, outputLimitBytes: Number.MAX_SAFE_INTEGER })).toEqual({
      ok: false,
      reason: "output-limit-invalid",
    });
    expect(parsePiChildRequest({ ...request, parentExecution: [] })).toEqual({
      ok: false,
      reason: "parent-execution-invalid",
    });
    expect(parsePiChildRequest({ ...request, parentExecution: { operationId: "", rootOperationId: "root" } })).toEqual({
      ok: false,
      reason: "parent-execution-invalid",
    });
    expect(parsePiChildRequest({
      ...request,
      parentExecution: { operationId: "parent", rootOperationId: "root", parentOperationId: "" },
    })).toEqual({ ok: false, reason: "parent-execution-invalid" });
  });

  test("carries an optional persona slug and keeps it inside the fingerprint", () => {
    const parsed = parsePiChildRequest({ ...request, persona: "amadeus-architecture-reviewer-agent" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.persona).toBe("amadeus-architecture-reviewer-agent");

    const bare = parsePiChildRequest(request);
    expect(bare.ok).toBe(true);
    if (!bare.ok) return;
    expect(bare.value.persona).toBeUndefined();
    expect(fingerprintPiRequest(parsed.value)).not.toBe(fingerprintPiRequest(bare.value));
  });

  test("rejects a persona slug that could escape the charter directory", () => {
    for (const persona of [
      "../../etc/passwd",
      "amadeus-../-agent",
      "amadeus-Reviewer-agent",
      "reviewer",
      "amadeus-reviewer-agent.md",
      "",
      1,
    ]) {
      expect(parsePiChildRequest({ ...request, persona })).toEqual({ ok: false, reason: "persona-invalid" });
    }
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

  test("rejects an event without a string type", () => {
    const collector = createPiRpcCollector("request-1", 100);
    collector.acceptLine("{}");
    expect(collector.observation().semanticFailure).toBe("rpc-event-invalid");
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
