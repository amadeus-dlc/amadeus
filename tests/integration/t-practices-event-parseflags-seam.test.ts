// covers: function:handlePracticesEvent (amadeus-state.ts)
//
// In-process coverage seam for Issue #2763's --type/--field value-arm guard
// inside handlePracticesEvent. t81 (tests/unit/t81.test.ts) drives the same
// contract through the real shipped CLI via spawnSync (a deliberate
// CLI-contract port), so bun's coverage instrumentation cannot see the two
// new rejectFlagLikeValue call sites inside the handler (the spawn
// blindspot) despite t81 exercising the identical repro. This file drives
// handlePracticesEvent directly, in-process.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handlePracticesEvent } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { cleanupTestProject, createTestProject, seededStateFile } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { writeFileSync } from "node:fs";

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}
function captureExit(fn: () => void): { threw: boolean; stderr: string } {
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) threw = true;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
  }
  return { threw, stderr };
}

function auditEventCount(body: string, ev: string): number {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => normalizeAuditRecord(JSON.parse(l)) as unknown as Record<string, unknown>)
    .filter((r) => r.event === ev).length;
}

describe("t-practices-event-parseflags-seam: Issue #2763 --type/--field value-arm", () => {
  let proj: string;
  let prevPd: string | undefined;

  beforeEach(() => {
    resetOtelPerProject();
    proj = createTestProject();
    writeFileSync(seededStateFile(proj), "# AI-DLC State Tracking\n", "utf-8");
    prevPd = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = proj;
  });
  afterEach(() => {
    if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevPd;
    cleanupTestProject(proj);
  });

  test("--type immediately followed by --field is refused, not silently swallowed", () => {
    const r = captureExit(() => handlePracticesEvent(["--type", "--field", "Reason: x"]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain('--type expects a value, got another flag: \\"--field\\"');
    expect(auditEventCount(readAllAuditShards(proj), "PRACTICES_OVERRIDE")).toBe(0);
  });

  test("--field immediately followed by another flag is refused, not silently dropped", () => {
    const r = captureExit(() =>
      handlePracticesEvent(["--type", "affirmed", "--field", "--some-other-flag", "ignored-tail"]),
    );
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain('--field expects a value, got another flag: \\"--some-other-flag\\"');
    expect(auditEventCount(readAllAuditShards(proj), "PRACTICES_AFFIRMED")).toBe(0);
  });

  test("control: real --type/--field values still succeed", () => {
    handlePracticesEvent(["--field", "Reason: t2763-seam-control", "--type", "override"]);
    expect(auditEventCount(readAllAuditShards(proj), "PRACTICES_OVERRIDE")).toBe(1);
  });
});
