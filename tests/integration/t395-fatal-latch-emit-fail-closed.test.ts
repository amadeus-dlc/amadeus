// covers: otel:logger-provider otel:fatal-latch
// size: medium
//
// The fatal health latch must reach the EMIT path (#1856). The latch is set by
// the journal health probe (FR-EVT-5) and by a canonical write failure
// (FR-EVT-3); FR-EVT-4 says every canonical mutation refuses once it is set.
// Before this suite the enforcement reader was wired into two amadeus-log verbs
// only, so `emitEvent` kept appending canonical rows onto a ledger the process
// had already judged inconsistent.
//
// The ruling is fail-closed as a DROP: the canonical emit does not reach the
// journal, the outcome names why, and the process says so out loud exactly once
// (a silent drop would trade one integrity failure for another).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { auditFilePath, birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { clearIntentContextForTests, ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests, setFatal } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import {
  emitEvent,
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;

function register(): void {
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({ projectDir: proj }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
}

function shardLines(): number {
  const raw = readFileSync(auditFilePath(proj), "utf-8");
  return raw.split("\n").filter((l) => l.trim() !== "").length;
}

// Capture stderr for one call so the loud drop notice can be counted.
function captureStderr(run: () => void): string {
  const original = process.stderr.write.bind(process.stderr);
  let captured = "";
  (process.stderr as unknown as { write: (chunk: string) => boolean }).write = (chunk: string) => {
    captured += chunk;
    return true;
  };
  try {
    run();
  } finally {
    process.stderr.write = original;
  }
  return captured;
}

beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  clearIntentContextForTests();
  ensureContextManager();
  birthIntent(proj, "fatal-latch-emit", "default", "feature");
  register();
});
afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  clearIntentContextForTests();
});

describe("canonical emit under a set fatal latch (FR-EVT-4, #1856)", () => {
  test("a latched process appends no canonical row and names the refusal", () => {
    emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "seed" });
    const before = shardLines();
    expect(before).toBeGreaterThan(0);

    setFatal("journal health probe failed: unparseable journal line");
    const outcome = captureStderr(() => {
      const result = emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "after-latch" });
      expect(result.appended).toBe(false);
      if (result.appended === false) expect(result.reason).toBe("fatal-latch");
    });
    expect(outcome).toMatch(/fatal/i);
    expect(shardLines()).toBe(before);
    expect(readFileSync(auditFilePath(proj), "utf-8")).not.toContain("after-latch");
  });

  test("the drop notice is announced exactly once, however many emits follow", () => {
    setFatal("journal health probe failed: sequence regression at seq 3 after 7");
    const first = captureStderr(() => {
      emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "one" });
    });
    const rest = captureStderr(() => {
      emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "two" });
      emitEvent("amadeus.decision.recorded", { Stage: "s", Decision: "three" });
    });
    expect(first.split("\n").filter((l) => l.includes("fatal health latch")).length).toBe(1);
    expect(rest).toBe("");
  });

  test("an unlatched process emits exactly as before", () => {
    const outcome = emitEvent("amadeus.decision.recorded", { Stage: "code-generation", Decision: "approve" });
    expect(outcome.appended).toBe(true);
    expect(readFileSync(auditFilePath(proj), "utf-8")).toContain("approve");
  });

  test("telemetry stays fail-open under the latch (FR-EVT-6): it never touched the journal to begin with", () => {
    setFatal("journal health probe failed: unparseable journal line");
    const outcome = emitEvent("amadeus.diagnostic.note", { Detail: "probe" });
    expect(outcome.appended).toBe(false);
    if (outcome.appended === false) expect(outcome.reason).toBe("telemetry");
  });
});
