// Closed request and RPC contracts for the Pi child execution driver.

import { createHash } from "node:crypto";

declare const deliveryKeyBrand: unique symbol;
export type PiDeliveryKey = string & { readonly [deliveryKeyBrand]: true };

export type PiChildRole = "support" | "reviewer" | "swarm";

// Persona charters pin a model tier alias; Pi needs a concrete model id. This
// is the single alias-to-id table, shared by the child driver (which resolves a
// persona's pin at dispatch) and the Pi harness projection (which rewrites the
// pin when charters are packaged). It is closed on purpose: an unknown alias
// fails the build and fails dispatch rather than silently taking a default, so
// a persona always runs on the model its charter pins.
export const PI_MODEL_PINS: Readonly<Record<string, string>> = {
  opus: "claude-opus-5",
  sonnet: "claude-sonnet-5",
};

export interface PiParentExecution {
  readonly operationId: string;
  readonly rootOperationId: string;
  readonly parentOperationId?: string;
}

export interface PiChildRequest {
  readonly schemaVersion: 1;
  readonly deliveryKey: PiDeliveryKey;
  readonly role: PiChildRole;
  readonly prompt: string;
  readonly projectDir: string;
  readonly parentExecution: PiParentExecution;
  readonly childOrdinal: number;
  readonly timeoutMs: number;
  readonly outputLimitBytes: number;
  // Amadeus persona slug this child runs as. When present the driver resolves
  // the persona charter's `model:` pin and launches the child on that model, so
  // one driver serves every persona without a per-persona bridge.
  readonly persona?: string;
}

export type PiRequestParseResult =
  | { readonly ok: true; readonly value: PiChildRequest }
  | { readonly ok: false; readonly reason: string };

const REQUEST_KEYS = [
  "childOrdinal",
  "deliveryKey",
  "outputLimitBytes",
  "parentExecution",
  "persona",
  "projectDir",
  "prompt",
  "role",
  "schemaVersion",
  "timeoutMs",
] as const;
const PARENT_KEYS = ["operationId", "parentOperationId", "rootOperationId"] as const;
const DELIVERY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
// Closed persona slug shape. It is used to build a charter path, so no dot,
// separator, or traversal segment may appear in it.
const PERSONA_SLUG = /^amadeus-[a-z0-9]+(?:-[a-z0-9]+)*-agent$/;
const MAX_PROMPT_BYTES = 4 * 1024 * 1024;
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function nonEmptyString(value: unknown, maxBytes: number): value is string {
  return typeof value === "string" && value.length > 0 && Buffer.byteLength(value, "utf8") <= maxBytes;
}

function positiveInteger(value: unknown, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= maximum;
}

export function parsePiChildRequest(value: unknown): PiRequestParseResult {
  if (!isRecord(value) || !hasOnlyKeys(value, REQUEST_KEYS)) {
    return { ok: false, reason: "request-shape-invalid" };
  }
  if (value.schemaVersion !== 1) return { ok: false, reason: "schema-version-unsupported" };
  if (typeof value.deliveryKey !== "string" || !DELIVERY_KEY.test(value.deliveryKey)) {
    return { ok: false, reason: "delivery-key-invalid" };
  }
  if (value.role !== "support" && value.role !== "reviewer" && value.role !== "swarm") {
    return { ok: false, reason: "role-invalid" };
  }
  if (value.persona !== undefined && (typeof value.persona !== "string" || !PERSONA_SLUG.test(value.persona))) {
    return { ok: false, reason: "persona-invalid" };
  }
  if (!nonEmptyString(value.prompt, MAX_PROMPT_BYTES)) return { ok: false, reason: "prompt-invalid" };
  if (!nonEmptyString(value.projectDir, 4096)) return { ok: false, reason: "project-dir-invalid" };
  if (!positiveInteger(value.childOrdinal, Number.MAX_SAFE_INTEGER)) {
    return { ok: false, reason: "child-ordinal-invalid" };
  }
  if (!positiveInteger(value.timeoutMs, MAX_TIMEOUT_MS)) return { ok: false, reason: "timeout-invalid" };
  if (!positiveInteger(value.outputLimitBytes, MAX_OUTPUT_BYTES)) {
    return { ok: false, reason: "output-limit-invalid" };
  }
  if (!isRecord(value.parentExecution) || !hasOnlyKeys(value.parentExecution, PARENT_KEYS)) {
    return { ok: false, reason: "parent-execution-invalid" };
  }
  const parent = value.parentExecution;
  if (!nonEmptyString(parent.operationId, 256) || !nonEmptyString(parent.rootOperationId, 256)) {
    return { ok: false, reason: "parent-execution-invalid" };
  }
  if (parent.parentOperationId !== undefined && !nonEmptyString(parent.parentOperationId, 256)) {
    return { ok: false, reason: "parent-execution-invalid" };
  }
  return {
    ok: true,
    value: {
      schemaVersion: 1,
      deliveryKey: value.deliveryKey as PiDeliveryKey,
      role: value.role,
      prompt: value.prompt,
      projectDir: value.projectDir,
      parentExecution: {
        operationId: parent.operationId,
        rootOperationId: parent.rootOperationId,
        ...(parent.parentOperationId ? { parentOperationId: parent.parentOperationId } : {}),
      },
      childOrdinal: value.childOrdinal,
      timeoutMs: value.timeoutMs,
      outputLimitBytes: value.outputLimitBytes,
      ...(value.persona === undefined ? {} : { persona: value.persona as string }),
    },
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

export function fingerprintPiRequest(request: PiChildRequest): string {
  return createHash("sha256").update(JSON.stringify(canonical(request))).digest("hex");
}

export interface PiRpcObservation {
  readonly output: string;
  readonly semanticFailure: string | null;
  readonly settled: boolean;
  readonly providerId?: string;
  readonly modelId?: string;
}

export interface PiRpcCollector {
  acceptLine(line: string): void;
  observation(): PiRpcObservation;
}

export function createPiRpcCollector(
  correlationId: string,
  outputLimitBytes: number,
  lineLimitBytes = 1024 * 1024,
): PiRpcCollector {
  let promptAccepted = false;
  let settled = false;
  let protocolFailure: string | null = null;
  let agentFailure: string | null = null;
  let output = "";
  let providerId: string | undefined;
  let modelId: string | undefined;

  const failFirst = (reason: string): void => {
    if (protocolFailure === null) protocolFailure = reason;
  };

  return {
    acceptLine(line) {
      if (Buffer.byteLength(line, "utf8") > lineLimitBytes) {
        failFirst("rpc-line-cap-exceeded");
        return;
      }
      let event: unknown;
      try {
        event = JSON.parse(line);
      } catch {
        failFirst("rpc-json-invalid");
        return;
      }
      if (!isRecord(event) || typeof event.type !== "string") {
        failFirst("rpc-event-invalid");
        return;
      }
      if (event.type === "response") {
        if (event.id !== correlationId || event.command !== "prompt" || event.success !== true) {
          failFirst("rpc-correlation-failed");
          return;
        }
        if (promptAccepted) failFirst("rpc-duplicate-response");
        promptAccepted = true;
        return;
      }
      if (event.type === "agent_start") {
        settled = false;
        agentFailure = null;
        output = "";
        return;
      }
      if (event.type === "message_end") {
        const message = event.message;
        if (!isRecord(message) || message.role !== "assistant") return;
        if (typeof message.provider === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(message.provider)) {
          providerId = message.provider;
        }
        if (typeof message.model === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(message.model)) {
          modelId = message.model;
        }
        if (message.stopReason === "error" || typeof message.errorMessage === "string") {
          agentFailure = "agent-failed";
        } else {
          agentFailure = null;
        }
        if (!Array.isArray(message.content)) return;
        for (const block of message.content) {
          if (!isRecord(block) || block.type !== "text" || typeof block.text !== "string") continue;
          if (Buffer.byteLength(output + block.text, "utf8") > outputLimitBytes) {
            failFirst("output-cap-exceeded");
            return;
          }
          output += block.text;
        }
        return;
      }
      if (event.type === "agent_end") {
        if (!promptAccepted) failFirst("rpc-prompt-not-accepted");
        return;
      }
      if (event.type === "agent_settled") {
        if (!promptAccepted) failFirst("rpc-prompt-not-accepted");
        settled = true;
      }
    },
    observation() {
      return {
        output,
        semanticFailure: protocolFailure ?? agentFailure,
        settled,
        ...(providerId === undefined ? {} : { providerId }),
        ...(modelId === undefined ? {} : { modelId }),
      };
    },
  };
}
