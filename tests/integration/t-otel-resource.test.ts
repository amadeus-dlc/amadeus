// covers: otel:resource
// size: medium
//
// U1 (resource-core) — the single resource assembly point (FR-RES-1/2/4,
// ADR-1). One bag, built once per process and re-built when a supplier lands,
// carrying the neutral attributes, the vcs pair, and whatever the harness
// supplied. Touches the real filesystem (clone id, git) so it lives here
// rather than in the unit layer.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { auditCloneId, birthIntent, docsRoot, recordDir } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import { createLocalMetricExporter } from "../../dist/claude/.claude/otel/local-metric-exporter.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { detectHarnessType } from "../../dist/claude/.claude/tools/amadeus-harness.ts";
import { AMADEUS_VERSION } from "../../dist/claude/.claude/tools/amadeus-version.ts";
import { buildResource, currentResource, resetResourceForTests } from "../../dist/claude/.claude/otel/resource.ts";
import { resetSuppliersForTests, supplyResourceAttribute } from "../../dist/claude/.claude/otel/resource-suppliers.ts";
import { AMADEUS_SRC, cleanupTestProject, createTestProject, FIXTURES_DIR } from "../harness/fixtures.ts";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;

let proj: string;
let savedEnv: Record<string, string | undefined>;

const ENV_KEYS = ["CI", "GITHUB_ACTIONS", "AMADEUS_OPERATING_MODE"];

beforeEach(() => {
  proj = createTestProject();
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  resetResourceForTests();
  resetSuppliersForTests();
  resetTracerProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-u1-resource", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetResourceForTests();
  resetSuppliersForTests();
  resetTracerProviderForTests();
});

// Every record written to one of the three telemetry stores, in file order.
function storeRecords(prefix: string): Record<string, unknown>[] {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith(prefix) || !name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf-8").split("\n")) {
      if (line !== "") records.push(JSON.parse(line));
    }
  }
  return records;
}

describe("neutral attributes (FR-RES-2)", () => {
  test("each neutral attribute resolves to its measured value", () => {
    const bag = buildResource(proj);
    expect(bag["service.name"]).toBe("amadeus");
    expect(bag["service.version"]).toBe(AMADEUS_VERSION);
    expect(bag["telemetry.sdk.language"]).toBe("typescript");
    expect(bag["host.name"]).toBe(hostname());
    expect(bag["amadeus.clone_id"]).toBe(auditCloneId(proj));
    expect(bag["amadeus.harness"]).toBe(detectHarnessType());
  });

  test("operating mode falls back to solo and honours the env when set", () => {
    expect(buildResource(proj)["amadeus.operating_mode"]).toBe("solo");
    process.env.AMADEUS_OPERATING_MODE = "team";
    expect(buildResource(proj)["amadeus.operating_mode"]).toBe("team");
  });

  test("deployment environment reads ci from either CI signal, else local", () => {
    expect(buildResource(proj)["deployment.environment.name"]).toBe("local");
    process.env.CI = "true";
    expect(buildResource(proj)["deployment.environment.name"]).toBe("ci");
    delete process.env.CI;
    process.env.GITHUB_ACTIONS = "true";
    expect(buildResource(proj)["deployment.environment.name"]).toBe("ci");
  });
});

describe("vcs attributes (FR-RES-2 — git measured, omitted on failure)", () => {
  test("inside a work tree both vcs attributes carry the measured head", () => {
    const bag = buildResource(REPO_ROOT);
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
    expect(bag["vcs.ref.head.revision"]).toBe(head);
    expect(bag["vcs.ref.head.name"]).toBe(branch);
  });

  test("outside a work tree BOTH vcs attributes are omitted rather than empty", () => {
    // The fixture project is a bare temp dir, not a repository.
    const bag = buildResource(proj);
    expect("vcs.ref.head.revision" in bag).toBe(false);
    expect("vcs.ref.head.name" in bag).toBe(false);
  });
});

describe("supplied attributes and the memoised getter (FR-RES-3, ADR-1)", () => {
  test("an unsupplied harness attribute is absent, a supplied one is composed in", () => {
    expect("session.id" in buildResource(proj)).toBe(false);
    supplyResourceAttribute("session.id", "sess-42");
    expect(buildResource(proj)["session.id"]).toBe("sess-42");
  });

  test("the getter memoises — repeated reads return the identical bag", () => {
    expect(currentResource(proj)).toBe(currentResource(proj));
  });

  test("a supply AFTER the first read invalidates the memo (no snapshot freeze)", () => {
    const before = currentResource(proj);
    expect("gen_ai.request.model" in before).toBe(false);
    supplyResourceAttribute("gen_ai.request.model", "sonnet-test");
    const after = currentResource(proj);
    expect(after).not.toBe(before);
    expect(after["gen_ai.request.model"]).toBe("sonnet-test");
    expect(after["service.name"]).toBe("amadeus");
  });

  test("asking about a different workspace rebuilds rather than reusing the memo", () => {
    const other = createTestProject();
    try {
      birthIntent(other, "otel-u1-other", "default", "feature");
      const first = currentResource(proj);
      const second = currentResource(other);
      expect(second).not.toBe(first);
      expect(second["amadeus.clone_id"]).toBe(auditCloneId(other));
    } finally {
      cleanupTestProject(other);
    }
  });
});

describe("one bag on all three signals (FR-RES-1)", () => {
  test("the span, log, and metric store records each carry the identical resource", () => {
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    const tracer = getAmadeusTracer();
    tracer.startSpan("resource-check").end();
    createLocalLogExporter({ projectDir: proj }).exportLog({
      name: "diag",
      timestamp: new Date().toISOString(),
      attributes: {},
      traceId: null,
      spanId: null,
    });
    createLocalMetricExporter({ projectDir: proj }).exportMetric({
      name: "amadeus.events.total",
      kind: "counter",
      value: 1,
      timestamp: new Date().toISOString(),
      attributes: {},
      traceId: null,
      spanId: null,
    });
    const expected = currentResource(proj);
    expect(Object.keys(expected).length).toBeGreaterThan(0);
    for (const prefix of ["spans-", "logs-", "metrics-"]) {
      const record = storeRecords(prefix)[0];
      expect(record, `${prefix} store had no record`).toBeDefined();
      expect(record!.resource, `${prefix} resource`).toEqual(expected);
    }
  });

  test("a supply landing after registration reaches the next span (getter, not snapshot)", () => {
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    const tracer = getAmadeusTracer();
    tracer.startSpan("before-supply").end();
    supplyResourceAttribute("amadeus.agent.role", "builder");
    tracer.startSpan("after-supply").end();
    const spans = storeRecords("spans-");
    const before = spans.find((r) => r.name === "before-supply")!.resource as Record<string, string>;
    const after = spans.find((r) => r.name === "after-supply")!.resource as Record<string, string>;
    expect("amadeus.agent.role" in before).toBe(false);
    expect(after["amadeus.agent.role"]).toBe("builder");
  });
});

describe("resource redaction, both layers (FR-RES-4)", () => {
  const GH_TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz012345";

  test("(a) write-time: a credential-shaped supplied value is masked in the bag itself", () => {
    supplyResourceAttribute("gen_ai.request.model", `model-for ${GH_TOKEN}`);
    const bag = buildResource(proj);
    expect(bag["gen_ai.request.model"]).not.toContain(GH_TOKEN);
    expect(bag["gen_ai.request.model"]).toContain("[REDACTED]");
  });

  test("(b) export boundary: a bag that skipped the write-time layer is still masked on every store", () => {
    // The getter injection models a producer reaching the exporter with an
    // unredacted bag — the layer-2 guarantee is that the store never sees it.
    const raw = (): Record<string, string> => ({ "session.id": `sess ${GH_TOKEN}`, Prompt: "secret prompt text" });
    registerTracerProvider({
      projectDir: proj,
      spanExporter: createLocalSpanExporter({ projectDir: proj }),
      resource: raw,
    });
    getAmadeusTracer().startSpan("unredacted-resource").end();
    createLocalLogExporter({ projectDir: proj, resource: raw }).exportLog({
      name: "diag",
      timestamp: new Date().toISOString(),
      attributes: {},
      traceId: null,
      spanId: null,
    });
    createLocalMetricExporter({ projectDir: proj, resource: raw }).exportMetric({
      name: "amadeus.events.total",
      kind: "counter",
      value: 1,
      timestamp: new Date().toISOString(),
      attributes: {},
      traceId: null,
      spanId: null,
    });
    for (const prefix of ["spans-", "logs-", "metrics-"]) {
      const record = storeRecords(prefix)[0]!;
      const resource = record.resource as Record<string, string>;
      const body = JSON.stringify(record);
      expect(body, `${prefix} store leaked a credential`).not.toContain(GH_TOKEN);
      expect(body, `${prefix} store admitted a denied key`).not.toContain("secret prompt text");
      expect(resource["session.id"], `${prefix} kept the admitted key`).toContain("[REDACTED]");
    }
  });
});

describe("walking skeleton — SessionStart supplies the conversation id (FR-RES-3)", () => {
  const HOOK = join(AMADEUS_SRC, "hooks", "amadeus-session-start.ts");

  function fireSessionStart(payload: Record<string, unknown>): { exitCode: number; stderr: string } {
    const result = Bun.spawnSync({
      cmd: [process.execPath, HOOK],
      stdin: new TextEncoder().encode(JSON.stringify(payload)),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
    });
    return { exitCode: result.exitCode, stderr: new TextDecoder().decode(result.stderr) };
  }

  test("the real hook still completes and journals its session event with the supply wired in", () => {
    writeFileSync(join(recordDir(proj)!, "amadeus-state.md"), readFileSync(join(FIXTURES_DIR, "state-mid-ideation.md"), "utf-8"));
    const fired = fireSessionStart({ session_id: "conv-walking-skeleton", source: "startup", cwd: proj });
    expect(fired.exitCode).toBe(0);
    expect(fired.stderr).not.toContain("already supplied");
    const auditDir = join(recordDir(proj)!, "audit");
    const journal = readdirSync(auditDir)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => readFileSync(join(auditDir, name), "utf-8"))
      .join("\n");
    expect(journal).toContain("SESSION_STARTED");
  });

  test("the id the hook supplies reaches all three stores through the same seam", () => {
    // Same key and same module the hook writes through — the seam is exercised,
    // not re-implemented.
    supplyResourceAttribute("session.id", "conv-walking-skeleton");
    registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
    getAmadeusTracer().startSpan("post-supply").end();
    createLocalLogExporter({ projectDir: proj }).exportLog({
      name: "diag",
      timestamp: new Date().toISOString(),
      attributes: {},
      traceId: null,
      spanId: null,
    });
    createLocalMetricExporter({ projectDir: proj }).exportMetric({
      name: "amadeus.events.total",
      kind: "counter",
      value: 1,
      timestamp: new Date().toISOString(),
      attributes: {},
      traceId: null,
      spanId: null,
    });
    for (const prefix of ["spans-", "logs-", "metrics-"]) {
      const resource = storeRecords(prefix)[0]!.resource as Record<string, string>;
      expect(resource["session.id"], `${prefix} store`).toBe("conv-walking-skeleton");
    }
  });
});
