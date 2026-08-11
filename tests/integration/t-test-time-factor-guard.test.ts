import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateTimingSinks,
  scanTimingSource,
  validateTimingAllowlist,
  type TimingAllowlistEntry,
} from "../lib/test-time-factor-guard.ts";
import { runTestTimeFactorGuard } from "../test-time-factor-guard.ts";

describe("test timing sink guard", () => {
  test("the failing fixture is detected while helper-routed timing is accepted", () => {
    const path = "tests/unit/raw-timing.test.ts";
    expect(scanTimingSource(path, "await Bun.sleep(500);")).toEqual([
      expect.objectContaining({ path, sink: "sleep" }),
    ]);
    expect(
      scanTimingSource("tests/unit/scaled.test.ts", "await Bun.sleep(scaleTestTime(500));"),
    ).toEqual([]);
  });

  test("multiline fixed timers are detected through the syntax tree", () => {
    const findings = scanTimingSource(
      "tests/unit/multiline-timer.test.ts",
      `
        setTimeout(
          () => cleanup(),
          500,
        );
        setInterval(callback, dynamicDelay);
      `,
    );
    expect(findings).toEqual([expect.objectContaining({ sink: "timer" })]);
  });

  test("qualified fixed timers are detected through the property access", () => {
    const findings = scanTimingSource(
      "tests/unit/qualified-timer.test.ts",
      `
        globalThis.setTimeout(() => cleanup(), 500);
        window.setInterval(callback, 500);
        globalThis.setTimeout(() => cleanup(), scaleTestTime(500));
      `,
    );
    expect(findings.map(({ sink }) => sink)).toEqual(["timer", "timer"]);
  });

  test("explicit test timeouts and suite defaults are detected", () => {
    const findings = scanTimingSource(
      "tests/unit/example.test.ts",
      'setDefaultTimeout(15000); test("case", () => {}, TEST_TIMEOUT_MS);',
    );
    expect(findings.map(({ sink }) => sink)).toEqual(["test-timeout", "test-timeout"]);
    expect(
      scanTimingSource(
        "tests/unit/scaled.test.ts",
        'setDefaultTimeout(scaleTestTime(15000)); test("case", () => {}, scaleTestTime(30000));',
      ),
    ).toEqual([]);
  });

  test("rescaling an AMADEUS_TEST_TIMEOUT final override fails closed", () => {
    const source = `
      const TIMEOUT_S = Number.parseInt(process.env.AMADEUS_TEST_TIMEOUT ?? "120", 10);
      const TEST_TIMEOUT_MS = TIMEOUT_S * 1000;
      const DRIVE_TIMEOUT_MS = TEST_TIMEOUT_MS - 15000;
      test("case", () => {}, scaleTestTime(TEST_TIMEOUT_MS));
      drive({ timeoutMs: scaleTestTime(DRIVE_TIMEOUT_MS) });
    `;
    expect(scanTimingSource("tests/integration/final-override.test.ts", source)).toEqual([
      expect.objectContaining({ sink: "final-timeout-rescale" }),
      expect.objectContaining({ sink: "final-timeout-rescale" }),
    ]);
  });

  test("direct final overrides and nested scaling cannot evade the guard", () => {
    const path = "tests/integration/rescale.test.ts";
    const source = `
      test("direct", () => {}, scaleTestTime(Number(process.env.AMADEUS_TEST_TIMEOUT)));
      test("nested", () => {}, scaleTestTime(scaleTestTime(30000)));
      await Bun.sleep(scaleTestTime(scaleTestTime(500)));
    `;
    expect(scanTimingSource(path, source).map(({ sink }) => sink)).toEqual([
      "final-timeout-rescale",
      "test-time-rescale",
      "test-time-rescale",
    ]);
  });

  test("rescale findings cannot be allowlisted", () => {
    const path = "tests/integration/rescale.test.ts";
    const findings = scanTimingSource(
      path,
      'test("case", () => {}, scaleTestTime(scaleTestTime(30000)));',
    );
    const allowlist: TimingAllowlistEntry[] = [
      { path, sink: "test-time-rescale", count: 1, reason: "must never be accepted" },
    ];
    expect(validateTimingAllowlist(allowlist, new Set([path]))).toContain(
      `allowlist cannot classify prohibited timing sink: ${path} (test-time-rescale)`,
    );
    expect(evaluateTimingSinks(findings, allowlist)).toEqual({
      ok: false,
      errors: [expect.stringContaining("prohibited timing sink")],
    });
  });

  test("an unclassified fixed timing sink fails closed", () => {
    const findings = scanTimingSource("tests/unit/example.test.ts", "await Bun.sleep(500);");
    expect(evaluateTimingSinks(findings, [])).toEqual({
      ok: false,
      errors: [expect.stringContaining("tests/unit/example.test.ts")],
    });
  });

  test("a reasoned exact-count exception is accepted", () => {
    const path = "tests/unit/slow-fixture.test.ts";
    const findings = scanTimingSource(path, "await Bun.sleep(500);");
    const allowlist: TimingAllowlistEntry[] = [
      { path, sink: "sleep", count: 1, reason: "FR-7 slow fixture intentionally triggers timeout" },
    ];
    expect(validateTimingAllowlist(allowlist, new Set([path]))).toEqual([]);
    expect(evaluateTimingSinks(findings, allowlist)).toEqual({ ok: true, errors: [] });
  });

  test("missing paths, duplicates, blank reasons, and count drift fail closed", () => {
    const path = "tests/unit/slow-fixture.test.ts";
    const malformed: TimingAllowlistEntry[] = [
      { path, sink: "sleep", count: 1, reason: "" },
      { path, sink: "sleep", count: 1, reason: "duplicate" },
      { path: "tests/unit/missing.test.ts", sink: "timer", count: 1, reason: "missing" },
      { path, sink: "deadline", count: 0, reason: "invalid count" },
    ];
    expect(validateTimingAllowlist(malformed, new Set([path]))).toHaveLength(4);

    const findings = scanTimingSource(path, "await Bun.sleep(500); await Bun.sleep(600);");
    expect(
      evaluateTimingSinks(findings, [
        { path, sink: "sleep", count: 1, reason: "FR-7 intentional fixture" },
      ]),
    ).toEqual({ ok: false, errors: [expect.stringContaining("count")] });
  });

  test("the CLI reports classified violations and malformed input", () => {
    const root = mkdtempSync(join(tmpdir(), "test-time-factor-guard-"));
    const testsDir = join(root, "tests");
    const unitDir = join(testsDir, "unit");
    try {
      mkdirSync(unitDir, { recursive: true });
      writeFileSync(join(unitDir, "raw.test.ts"), `await Bun.${"sleep"}(500);\n`);
      writeFileSync(join(testsDir, ".test-time-factor-allowlist.json"), "[]\n");
      expect(runTestTimeFactorGuard(root)).toBe(1);

      writeFileSync(join(testsDir, ".test-time-factor-allowlist.json"), "not-json\n");
      expect(runTestTimeFactorGuard(root)).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
