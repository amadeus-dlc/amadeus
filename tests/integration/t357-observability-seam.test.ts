// covers: function:resolveObservabilityConfig, function:appendTelemetryEvent, function:observe, function:observeSubprocess
// size: medium
//
// The Core-facing observability seam (Issue #1628 Phase 2): layered opt-in
// config, the machine-local telemetry buffer, redaction filtering, and the
// fail-open contract. MEDIUM tier (real filesystem fixtures). Imports come
// from the shipped dist tree (t219 precedent).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendTelemetryEvent,
  attachProcessTraceContext,
  flushProcessObservation,
  initProcessObservability,
  observabilityEnabled,
  observe,
  observeSubprocess,
  resetObservabilityConfigCache,
  resolveObservabilityConfig,
  telemetryDir,
} from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import {
  clearIntentContextForTests,
  currentIntentContext,
  processParentSpanContext,
} from "../../dist/claude/.claude/otel/context.ts";
import {
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  cleanupTestProject,
  createTestProject,
  seedStateFile,
} from "../harness/fixtures.ts";

let proj: string | undefined;
let priorProjectDir: string | undefined;

beforeEach(() => {
  priorProjectDir = process.env.CLAUDE_PROJECT_DIR;
  resetObservabilityConfigCache();
});

afterEach(() => {
  if (priorProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = priorProjectDir;
  resetObservabilityConfigCache();
  cleanupTestProject(proj);
  proj = undefined;
});

function seedProject(): string {
  const p = createTestProject();
  seedStateFile(p, "state-init-active.md");
  process.env.CLAUDE_PROJECT_DIR = p;
  return p;
}

function writeConfig(p: string, layer: "project" | "space" | "intent", value: unknown): void {
  const path =
    layer === "project"
      ? join(p, "amadeus", "config.json")
      : layer === "space"
        ? join(p, "amadeus", "spaces", DEFAULT_SPACE, "config.json")
        : join(p, "amadeus", "spaces", DEFAULT_SPACE, "intents", DEFAULT_RECORD_DIR, "config.json");
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf-8");
}

const bufferGlobRead = (p: string): string => {
  const dir = telemetryDir(p);
  if (dir === null || !existsSync(dir)) return "";
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  return readdirSync(dir)
    .filter((f: string) => f.startsWith("buffer-"))
    .map((f: string) => readFileSync(join(dir, f), "utf-8"))
    .join("");
};

describe("layered opt-in config", () => {
  test("absent config -> disabled (the default is off)", () => {
    proj = seedProject();
    expect(observabilityEnabled(proj)).toBe(false);
  });

  test("project enables; the narrower intent layer wins whole", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true, otlp: { endpoint: "http://g:4318" } } });
    resetObservabilityConfigCache();
    expect(resolveObservabilityConfig(proj)).toMatchObject({ enabled: true, otlpEndpoint: "http://g:4318" });

    writeConfig(proj, "intent", { observability: { enabled: false } });
    resetObservabilityConfigCache();
    expect(observabilityEnabled(proj)).toBe(false);
  });

  test("a malformed observability value fails closed to disabled", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: "yes" } });
    resetObservabilityConfigCache();
    expect(observabilityEnabled(proj)).toBe(false);
  });

  test("local export defaults on with enabled and can be switched off", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true } });
    resetObservabilityConfigCache();
    expect(resolveObservabilityConfig(proj).localExport).toBe(true);
    writeConfig(proj, "project", { observability: { enabled: true, local: { enabled: false } } });
    resetObservabilityConfigCache();
    expect(resolveObservabilityConfig(proj).localExport).toBe(false);
  });

  test("the observability key does not break mirror config parsing", () => {
    proj = seedProject();
    writeConfig(proj, "project", {
      "intent-mirror": { github: { issue: { mode: "off" } } },
      observability: { enabled: true },
    });
    resetObservabilityConfigCache();
    const { resolveAmadeusConfig } = require("../../dist/claude/.claude/tools/amadeus-config.ts");
    const outcome = resolveAmadeusConfig(proj);
    expect(outcome.kind).toBe("resolved");
  });
});

describe("telemetry buffer (enabled path)", () => {
  test("append writes one JSON line with the identity envelope and filtered meta", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true } });
    resetObservabilityConfigCache();
    appendTelemetryEvent(proj, {
      kind: "operation",
      name: "unit-test",
      startMs: 1000,
      endMs: 1500,
      ok: true,
      meta: { stage: "code-generation", secretPath: "/home/me/private" },
    });
    const body = bufferGlobRead(proj);
    const lines = body.split("\n").filter((l) => l !== "");
    expect(lines.length).toBe(1);
    const record = JSON.parse(lines[0]!);
    expect(record).toMatchObject({
      v: 1,
      kind: "operation",
      name: "unit-test",
      ok: true,
      intentId: DEFAULT_RECORD_DIR,
    });
    expect(typeof record.cloneId).toBe("string");
    expect(typeof record.harness).toBe("string");
    // default-deny redaction: unknown keys are dropped, safe keys survive
    expect(record.meta).toEqual({ stage: "code-generation" });
  });

  test("redactionOptIn admits an extra meta key explicitly", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true, redactionOptIn: ["customKey"] } });
    resetObservabilityConfigCache();
    appendTelemetryEvent(proj, {
      kind: "operation",
      name: "opt-in",
      startMs: 1,
      endMs: 2,
      ok: true,
      meta: { customKey: "kept", otherKey: "dropped" },
    });
    const record = JSON.parse(bufferGlobRead(proj).trim());
    expect(record.meta).toEqual({ customKey: "kept" });
  });

  test("observe wraps a block, records ok:false on throw, and rethrows", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true } });
    resetObservabilityConfigCache();
    const p = proj as string;
    expect(observe(p, "op-ok", () => 42)).toBe(42);
    expect(() =>
      observe(p, "op-fail", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    const records = bufferGlobRead(proj)
      .split("\n")
      .filter((l) => l !== "")
      .map((l) => JSON.parse(l));
    expect(records.map((r) => [r.name, r.ok])).toEqual([
      ["op-ok", true],
      ["op-fail", false],
    ]);
  });

  test("observeSubprocess reads both node status and Bun exitCode shapes", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true } });
    resetObservabilityConfigCache();
    observeSubprocess(proj, "fake-node", () => ({ status: 0 }));
    observeSubprocess(proj, "fake-bun", () => ({ exitCode: 3 }));
    const records = bufferGlobRead(proj)
      .split("\n")
      .filter((l) => l !== "")
      .map((l) => JSON.parse(l));
    expect(records.map((r) => [r.name, r.ok, r.meta.exitCode])).toEqual([
      ["fake-node", true, "0"],
      ["fake-bun", false, "3"],
    ]);
  });
});

describe("process span (init + flush seam)", () => {
  test("init arms once and flush writes the process span with the exit code", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true } });
    resetObservabilityConfigCache();
    initProcessObservability("tool:test-entry", proj);
    initProcessObservability("tool:second-caller-ignored", proj);
    flushProcessObservation(0);
    flushProcessObservation(0); // idempotent: pending observation already cleared
    const records = bufferGlobRead(proj)
      .split("\n")
      .filter((l) => l !== "")
      .map((l) => JSON.parse(l));
    expect(records.length).toBe(1);
    expect(records[0]).toMatchObject({ kind: "process", name: "tool:test-entry", ok: true });
    expect(records[0].meta).toEqual({ exitCode: "0" });
  });

  test("a broken config file resolves to disabled (read-failure fail-closed)", () => {
    proj = seedProject();
    writeFileSync(join(proj, "amadeus", "config.json"), "{not json", "utf-8");
    resetObservabilityConfigCache();
    expect(observabilityEnabled(proj)).toBe(false);
  });
});

describe("disabled and fail-open contracts", () => {
  test("disabled: no telemetry dir is ever created (zero-cost guarantee)", () => {
    proj = seedProject();
    appendTelemetryEvent(proj, { kind: "operation", name: "x", startMs: 1, endMs: 2, ok: true });
    expect(observe(proj, "y", () => 7)).toBe(7);
    observeSubprocess(proj, "z", () => ({ status: 0 }));
    const dir = telemetryDir(proj);
    expect(dir === null || !existsSync(dir)).toBe(true);
  });

  test("fail-open: an unwritable telemetry dir drops the event without throwing", () => {
    proj = seedProject();
    writeConfig(proj, "project", { observability: { enabled: true } });
    resetObservabilityConfigCache();
    const dir = telemetryDir(proj)!;
    mkdirSync(dir, { recursive: true });
    chmodSync(dir, 0o500); // no write
    try {
      expect(() =>
        appendTelemetryEvent(proj as string, { kind: "operation", name: "drop", startMs: 1, endMs: 2, ok: true }),
      ).not.toThrow();
    } finally {
      chmodSync(dir, 0o700);
    }
    expect(bufferGlobRead(proj)).toBe("");
  });
});

describe("attachProcessTraceContext (FR-TRC-4/5 seam)", () => {
  test("disabled config is a pure no-op (BR-5)", async () => {
    const p = seedProject();
    proj = p;
    clearIntentContextForTests();
    await attachProcessTraceContext(p);
    expect(currentIntentContext()).toBeNull();
    expect(processParentSpanContext()).toBeNull();
  });

  test("enabled with no carrier: restores (mints) the intent anchor from the record (FR-TRC-4, BR-6)", async () => {
    const p = seedProject();
    proj = p;
    writeConfig(p, "project", { observability: { enabled: true, otlp: { endpoint: "http://g:4318" } } });
    resetObservabilityConfigCache();
    clearIntentContextForTests();
    try {
      await attachProcessTraceContext(p);
      expect(currentIntentContext()).not.toBeNull();
    } finally {
      clearIntentContextForTests();
    }
  });

  test("enabled with an injected traceparent: the remote parent from the env wins (FR-TRC-5)", async () => {
    const p = seedProject();
    proj = p;
    writeConfig(p, "project", { observability: { enabled: true, otlp: { endpoint: "http://g:4318" } } });
    resetObservabilityConfigCache();
    clearIntentContextForTests();
    process.env.TRACEPARENT = "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01";
    try {
      await attachProcessTraceContext(p);
      expect(processParentSpanContext()).toEqual({
        traceId: "0123456789abcdef0123456789abcdef",
        spanId: "0123456789abcdef",
        traceFlags: 1,
        isRemote: true,
      });
      expect(currentIntentContext()).toBeNull();
    } finally {
      delete process.env.TRACEPARENT;
      clearIntentContextForTests();
    }
  });

  test("enabled with a malformed traceparent: fail-open to the record path (BR-5)", async () => {
    const p = seedProject();
    proj = p;
    writeConfig(p, "project", { observability: { enabled: true, otlp: { endpoint: "http://g:4318" } } });
    resetObservabilityConfigCache();
    clearIntentContextForTests();
    process.env.TRACEPARENT = "not-a-traceparent";
    try {
      await attachProcessTraceContext(p);
      // Malformed carrier -> diagnostic + fall through to the record restore (BR-6 mints).
      expect(currentIntentContext()).not.toBeNull();
    } finally {
      delete process.env.TRACEPARENT;
      clearIntentContextForTests();
    }
  });
});
