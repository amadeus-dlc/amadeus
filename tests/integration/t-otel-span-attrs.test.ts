// covers: otel:span-context
// size: medium
//
// U2 (span-attrs) — the workflow context every span carries (FR-SPAN-1/2/3).
// Six keys resolved once per process and merged UNDER the caller's explicit
// attributes, so a span says which intent/space/stage/phase/agent produced it
// without every call site passing them.
//
// The assertions run against the STORED JSONL text, not only the in-memory
// span record: span attributes pass a default-deny redaction allow-list on the
// way to the store (E-OMSB2A-DEV), so a record-only assertion would stay green
// while every one of the six keys was dropped at the boundary.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { birthIntent, docsRoot, getField, readStateFile, setField, stateFilePath } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createLocalSpanExporter } from "../../dist/claude/.claude/otel/local-span-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetResourceForTests } from "../../dist/claude/.claude/otel/resource.ts";
import { resetSuppliersForTests } from "../../dist/claude/.claude/otel/resource-suppliers.ts";
import {
  resetSpanContextForTests,
  spanContextAttributes,
} from "../../dist/claude/.claude/otel/span-context.ts";
import {
  getAmadeusTracer,
  registerTracerProvider,
  resetTracerProviderForTests,
} from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

const ENV_KEYS = ["AMADEUS_AGENT_TYPE", "AMADEUS_AGENT_ID"];
const INTENT_SLUG = "otel-u2-span";

let proj: string;
let savedEnv: Record<string, string | undefined>;

function resetAll(): void {
  resetSpanContextForTests();
  resetResourceForTests();
  resetSuppliersForTests();
  resetTracerProviderForTests();
}

beforeEach(() => {
  proj = createTestProject();
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  resetAll();
  ensureContextManager();
});
afterEach(() => {
  cleanupTestProject(proj);
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetAll();
});

// The record dir name read straight off the intents directory. Deliberately
// NOT via activeIntent(): that is the function under test, and comparing the
// resolver against itself would pass no matter what it resolved.
function recordDirName(): string {
  const intents = join(proj, "amadeus", "spaces", "default", "intents");
  return readdirSync(intents).filter((name) => name.endsWith(`-${INTENT_SLUG}`))[0]!;
}

// The raw JSONL text of the span store — asserted as TEXT where the point is
// that a key survived the export boundary at all.
function spanStoreText(): string {
  const dir = join(docsRoot(proj), ".amadeus-otel");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return "";
  }
  return names
    .sort()
    .filter((name) => name.startsWith("spans-") && name.endsWith(".jsonl"))
    .map((name) => readFileSync(join(dir, name), "utf-8"))
    .join("");
}

function spanStoreRecords(): Record<string, unknown>[] {
  return spanStoreText()
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function storedAttributes(name: string): Record<string, unknown> {
  const record = spanStoreRecords().find((r) => r.name === name);
  expect(record, `no stored span named ${name}`).toBeDefined();
  return record!.attributes as Record<string, unknown>;
}

// Put the two state-file fields the resolver reads at the given values. The
// seeded fixture state file carries no field bullets at all, so setField (which
// no-ops on an absent field by design) cannot introduce them — the bullets are
// written in the canonical `- **Field**: value` form and then read back, so a
// fixture that failed to write cannot pass itself off as one that did.
function setStage(stage: string, phase: string): void {
  const path = stateFilePath(proj);
  let content = readStateFile(proj);
  for (const [field, value] of [["Lifecycle Phase", phase], ["Current Stage", stage]] as const) {
    content = getField(content, field) === null ? `${content.trimEnd()}\n- **${field}**: ${value}\n` : setField(content, field, value);
  }
  writeFileSync(path, content, "utf-8");
  expect(getField(readStateFile(proj), "Current Stage")).toBe(stage);
  expect(getField(readStateFile(proj), "Lifecycle Phase")).toBe(phase);
}

function standUpTracer(): void {
  registerTracerProvider({ projectDir: proj, spanExporter: createLocalSpanExporter({ projectDir: proj }) });
}

describe("the six keys reach the STORE, not just the span record (FR-SPAN-1)", () => {
  test("every resolved key survives the export boundary and carries its measured value", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    setStage("code-generation", "CONSTRUCTION");
    process.env.AMADEUS_AGENT_TYPE = "builder";
    process.env.AMADEUS_AGENT_ID = "b2-spanattrs";
    resetSpanContextForTests();
    standUpTracer();

    getAmadeusTracer().startSpan("context-check").end();

    const stored = storedAttributes("context-check");
    expect(stored["amadeus.intent.id"]).toBe(recordDirName());
    expect(stored["amadeus.space"]).toBe("default");
    expect(stored["amadeus.stage"]).toBe("code-generation");
    expect(stored["amadeus.phase"]).toBe("CONSTRUCTION");
    expect(stored["amadeus.agent.type"]).toBe("builder");
    expect(stored["amadeus.agent.id"]).toBe("b2-spanattrs");
  });

  test("a credential-shaped agent id is scrubbed in the stored text, never persisted raw", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    process.env.AMADEUS_AGENT_ID = "ghp_0123456789abcdefghijklmnopqrstuvwxyz";
    resetSpanContextForTests();
    standUpTracer();

    getAmadeusTracer().startSpan("scrub-check").end();

    expect(storedAttributes("scrub-check")["amadeus.agent.id"]).toBe("[REDACTED]");
    expect(spanStoreText()).not.toContain("ghp_0123456789abcdefghijklmnopqrstuvwxyz");
  });
});

describe("fail-open absence (NFR-1) — omitted, never a fallback value", () => {
  test("an unresolvable intent omits BOTH intent and space, with no journal-style fallback", () => {
    // No birthIntent: zero records, so the intent does not resolve. The journal
    // writer would stamp "workspace"/"default" here; a span attribute must not.
    const attrs = spanContextAttributes(proj);
    expect("amadeus.intent.id" in attrs).toBe(false);
    expect("amadeus.space" in attrs).toBe(false);
    expect(Object.values(attrs)).not.toContain("workspace");
    expect(Object.values(attrs)).not.toContain("default");
  });

  test("the omission holds through the export boundary — neither key nor fallback is stored", () => {
    const storeDir = mkdtempSync(join(tmpdir(), "amadeus-span-nointent-"));
    try {
      registerTracerProvider({
        projectDir: proj,
        spanExporter: createLocalSpanExporter({ projectDir: proj, storeDir }),
      });
      getAmadeusTracer().startSpan("no-intent").end();
      const line = readdirSync(storeDir)
        .filter((name) => name.startsWith("spans-"))
        .map((name) => readFileSync(join(storeDir, name), "utf-8"))
        .join("");
      const attributes = (JSON.parse(line.trim()) as { attributes: Record<string, unknown> }).attributes;
      expect("amadeus.intent.id" in attributes).toBe(false);
      expect("amadeus.space" in attributes).toBe(false);
      expect(line).not.toContain("workspace");
    } finally {
      rmSync(storeDir, { recursive: true, force: true });
    }
  });

  test("a state file without the fields omits stage and phase, leaving intent and space intact", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    resetSpanContextForTests();
    const attrs = spanContextAttributes(proj);
    expect("amadeus.stage" in attrs).toBe(false);
    expect("amadeus.phase" in attrs).toBe(false);
    expect(attrs["amadeus.intent.id"]).toBe(recordDirName());
  });

  test("an absent state file resolves to an empty bag rather than throwing", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    // Deleting the state file also un-records the intent: a record dir IS a dir
    // holding amadeus-state.md (listIntentDirs, amadeus-lib.ts:1163-1166). So
    // all four workspace keys drop together here — the point of the case is
    // that the unreadable state file produces absence, not an exception.
    rmSync(stateFilePath(proj), { force: true });
    resetSpanContextForTests();
    expect(spanContextAttributes(proj)).toEqual({});
  });

  test("neither agent key appears when the env supplies neither", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    resetSpanContextForTests();
    standUpTracer();
    getAmadeusTracer().startSpan("no-agent").end();
    const stored = storedAttributes("no-agent");
    expect("amadeus.agent.type" in stored).toBe(false);
    expect("amadeus.agent.id" in stored).toBe(false);
  });
});

describe("merge precedence (FR-SPAN-2) — the caller always wins", () => {
  test("an explicit setAttributes overrides the resolved value for the same key", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    setStage("code-generation", "CONSTRUCTION");
    resetSpanContextForTests();
    standUpTracer();

    const span = getAmadeusTracer().startSpan("explicit-wins");
    span.setAttributes({ "amadeus.stage": "caller-supplied" });
    span.end();

    const stored = storedAttributes("explicit-wins");
    expect(stored["amadeus.stage"]).toBe("caller-supplied");
    // The keys the caller did NOT override still come from the resolver.
    expect(stored["amadeus.phase"]).toBe("CONSTRUCTION");
  });

  test("attributes passed at startSpan also win over the resolver", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    setStage("code-generation", "CONSTRUCTION");
    resetSpanContextForTests();
    standUpTracer();

    getAmadeusTracer().startSpan("options-win", { attributes: { "amadeus.phase": "OPERATION" } }).end();

    expect(storedAttributes("options-win")["amadeus.phase"]).toBe("OPERATION");
  });

  test("unrelated caller attributes are untouched by the merge", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    setStage("code-generation", "CONSTRUCTION");
    resetSpanContextForTests();
    standUpTracer();

    const span = getAmadeusTracer().startSpan("coexist");
    span.setAttributes({ ExitCode: "0" });
    span.end();

    const stored = storedAttributes("coexist");
    expect(stored.ExitCode).toBe("0");
    expect(stored["amadeus.stage"]).toBe("code-generation");
  });
});

describe("process memo (FR-SPAN-3) — resolved once, not per span", () => {
  test("repeated reads return the identical object", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    resetSpanContextForTests();
    expect(spanContextAttributes(proj)).toBe(spanContextAttributes(proj));
  });

  test("n spans read the workspace once — a stage change mid-process does not reach later spans", () => {
    birthIntent(proj, INTENT_SLUG, "default", "feature");
    setStage("code-generation", "CONSTRUCTION");
    resetSpanContextForTests();
    standUpTracer();
    const tracer = getAmadeusTracer();

    tracer.startSpan("first").end();
    // Rewriting the source the resolver reads from is the counter: a resolver
    // that re-read per span would report the new stage on the later spans.
    setStage("build-and-test", "OPERATION");
    tracer.startSpan("second").end();
    tracer.startSpan("third").end();

    for (const name of ["first", "second", "third"]) {
      expect(storedAttributes(name)["amadeus.stage"], `${name} stage`).toBe("code-generation");
      expect(storedAttributes(name)["amadeus.phase"], `${name} phase`).toBe("CONSTRUCTION");
    }
  });
});
