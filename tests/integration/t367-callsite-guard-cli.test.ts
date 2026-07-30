// covers: function:runCheck function:runUpdate function:parseAllowlist function:scanRepository
//
// U7 (callsite-migration) — the call-site guard's CLI surface (VER-4).
//
// Driven IN PROCESS (not through a spawned CLI) so the wiring lines are
// measured: bun --coverage does not instrument a spawned subprocess
// (cid:code-generation:bun-coverage-spawn-blindspot). The allowlist and report
// paths are injectable for exactly that reason — a test must never rewrite the
// committed allowlist.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCensus,
  buildResidualReport,
  main,
  parseAllowlist,
  renderAllowlist,
  runCheck,
  runUpdate,
  scanRepository,
  totalSites,
} from "../callsite-guard.ts";

const scratch: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "callsite-guard-"));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop() as string, { recursive: true, force: true });
});

describe("scanRepository — the live corpus", () => {
  test("the real scan is non-vacuous and every match names a scanned root", () => {
    const matches = scanRepository();

    // A guard that measures nothing would pass vacuously forever.
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match.file.startsWith("packages/framework/core/") || match.file.startsWith("scripts/")).toBe(true);
      expect(match.line).toBeGreaterThan(0);
    }
  });

  test("the committed allowlist matches the live corpus (no drift)", () => {
    const verdict = runCheck({});
    expect(verdict).toBe(0);
  });
});

describe("runCheck — verdicts and the residual report", () => {
  test("a census larger than the allowlist is rejected, and the report still lands", () => {
    const dir = tempDir();
    const allowlist = join(dir, "allowlist.json");
    const report = join(dir, "residual.json");
    // An empty allowlist cannot admit the live corpus: every measured site is new.
    writeFileSync(allowlist, renderAllowlist({}), "utf-8");

    const code = runCheck({ allowlistPath: allowlist, reportPath: report });

    expect(code).toBe(1);
    const parsed = JSON.parse(readFileSync(report, "utf-8"));
    expect(parsed.total).toBeGreaterThan(0);
    expect(typeof parsed.generatedAt).toBe("string");
  });

  test("an over-counting allowlist passes — shrinkage is the allowed direction", () => {
    const dir = tempDir();
    const allowlist = join(dir, "allowlist.json");
    const census = buildCensus(scanRepository());
    const inflated = { ...census, "packages/framework/core/does-not-exist.ts": { appendAuditEntry: 5 } };
    writeFileSync(allowlist, renderAllowlist(inflated), "utf-8");

    expect(runCheck({ allowlistPath: allowlist })).toBe(0);
  });

  test("a missing allowlist fails closed", () => {
    expect(runCheck({ allowlistPath: join(tempDir(), "absent.json") })).toBe(1);
  });

  test("a malformed allowlist fails closed rather than passing vacuously", () => {
    const dir = tempDir();
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{ not json", "utf-8");
    expect(runCheck({ allowlistPath: bad })).toBe(1);

    const wrongDirection = join(dir, "grow.json");
    writeFileSync(wrongDirection, JSON.stringify({ direction: "grow-ok", sites: {} }), "utf-8");
    expect(runCheck({ allowlistPath: wrongDirection })).toBe(1);
  });
});

describe("parseAllowlist", () => {
  test("rejects non-object, wrong direction and non-object sites", () => {
    expect(parseAllowlist("[]").kind).toBe("failed");
    expect(parseAllowlist("null").kind).toBe("failed");
    expect(parseAllowlist('{"direction":"shrink-only"}').kind).toBe("failed");
    expect(parseAllowlist('{"direction":"shrink-only","sites":{}}').kind).toBe("loaded");
  });
});

describe("runUpdate", () => {
  test("writes the freshly scanned census to the given path", () => {
    const path = join(tempDir(), "written.json");

    expect(runUpdate(path)).toBe(0);

    const doc = JSON.parse(readFileSync(path, "utf-8"));
    expect(doc.direction).toBe("shrink-only");
    expect(doc.total).toBe(totalSites(buildCensus(scanRepository())));
  });
});

describe("buildResidualReport", () => {
  test("per-file totals sum to the overall total and stay stable at zero sites", () => {
    const report = buildResidualReport({ "a.ts": { appendAuditEntry: 2 }, "b.ts": { observe: 1 } }, "2026-07-30T00:00:00Z");
    expect(report).toEqual({
      generatedAt: "2026-07-30T00:00:00Z",
      total: 3,
      byFile: { "a.ts": 2, "b.ts": 1 },
    });

    // The shape a zero-site (deletion-gate-ready) run reports.
    expect(buildResidualReport({}, "2026-07-30T00:00:00Z")).toEqual({
      generatedAt: "2026-07-30T00:00:00Z",
      total: 0,
      byFile: {},
    });
  });
});

describe("main — argument handling", () => {
  test("--check with the committed allowlist passes", () => {
    expect(main(["--check"])).toBe(0);
  });

  test("unknown or malformed arguments are a usage error, not a silent pass", () => {
    expect(main([])).toBe(2);
    expect(main(["--nope"])).toBe(2);
    expect(main(["--check", "--report"])).toBe(2);
  });

  test("--check --report <path> writes the residual report", () => {
    const path = join(tempDir(), "residual.json");

    expect(main(["--check", "--report", path])).toBe(0);

    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    expect(parsed.total).toBeGreaterThan(0);
  });

  test("an unexpected error is reported and fails closed rather than escaping", () => {
    // An unwritable report path makes writeFileSync throw inside runCheck; main
    // must translate that into exit 1, not an unhandled stack trace.
    expect(main(["--check", "--report", join(tempDir(), "no-such-dir", "residual.json")])).toBe(1);
  });
});
