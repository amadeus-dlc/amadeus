import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectors, countTextLines, defaultEnv, summarizeCcn } from "../../scripts/metrics-snapshot.ts";

const byName = (name: string) => collectors.find((collector) => collector.name === name)!;
const roots: string[] = [];
afterEach(() => { delete process.env.AMADEUS_COMPLEXITY_LIZARD_CMD; delete process.env.AMADEUS_COMPLEXITY_ROOTS; while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "t221-collectors-")); roots.push(root);
  mkdirSync(join(root, "coverage"), { recursive: true }); mkdirSync(join(root, "dist")); mkdirSync(join(root, "tests", "unit"), { recursive: true }); mkdirSync(join(root, "scripts"));
  writeFileSync(join(root, "coverage", "coverage-totals.json"), '{"hits":5,"lines":10}');
  writeFileSync(join(root, "coverage", "tests-totals.json"), '{"files":2,"failedFiles":0,"assertions":9,"failedAssertions":0}');
  writeFileSync(join(root, "dist", "x"), "1234");
  writeFileSync(join(root, "tests", "unit", "x.test.ts"), 'import { test } from "bun:test"; test("x",()=>{});');
  writeFileSync(join(root, "scripts", "x.ts"), "export function x(v:number){ return v > 0 ? v : 0; }");
  return root;
}

describe("t221 six collectors", () => {
  test("LOC counts trailing newline, no trailing newline, CRLF and empty text exactly", () => {
    expect(countTextLines("one\ntwo\n")).toBe(2);
    expect(countTextLines("one\ntwo")).toBe(2);
    expect(countTextLines("one\r\ntwo\r\n")).toBe(2);
    expect(countTextLines("")).toBe(0);
  });
  test("CCN p50, p90 and over-threshold values are numerically fixed", () => {
    const records = [1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((ccn) => ({ ccn }));
    expect(summarizeCcn(records)).toMatchObject({ functions: 10, p50: 5, p90: 9, max: 20, over_threshold: 1, threshold: 15 });
  });
  test("coverage happy path", () => expect(byName("coverage").collect(defaultEnv(fixture()))).toMatchObject({ ok: true, values: { hits: 5, lines: 10, percent: 50 } }));
  test("tests happy path", () => expect(byName("tests").collect({ ...defaultEnv(fixture()), exec: () => "rev" })).toMatchObject({ ok: true, values: { files: 2, assertions: 9 } }));
  test("loc happy path splits tracked surfaces", () => {
    const root = fixture(); const env = defaultEnv(root);
    env.exec = (command) => command.includes("ls-files") ? "scripts/x.ts\ntests/unit/x.test.ts" : "git version 2";
    expect(byName("loc").collect(env)).toMatchObject({ ok: true, values: { core: 0, scripts: 1, tests: 1 } });
  });
  test("test pyramid derives tier and size", () => expect(byName("test_pyramid").collect({ ...defaultEnv(fixture()), exec: () => "rev" })).toMatchObject({ ok: true, values: { unit_small: 1 } }));
  test("dist size happy path", () => expect(byName("dist_size").collect(defaultEnv(fixture()))).toMatchObject({ ok: true, values: { bytes: 4 } }));
  test("ccn exposes distribution and threshold counts", () => {
    const root = fixture(); process.env.AMADEUS_COMPLEXITY_ROOTS = join(root, "scripts");
    const result = byName("ccn").collect(defaultEnv(root));
    expect(result.ok).toBe(true);
    if (result.ok) for (const key of ["functions", "p50", "p90", "max", "over_threshold", "threshold"]) expect(result.values).toHaveProperty(key);
  });
  test("missing JSON becomes a fault result", () => expect(byName("coverage").collect({ ...defaultEnv(fixture()), readFile: () => { throw new Error("ENOENT"); } })).toEqual({ ok: false, name: "coverage", error: "ENOENT" }));
  test("malformed JSON becomes a fault result", () => expect(byName("tests").collect({ ...defaultEnv(fixture()), readFile: () => "{" })).toMatchObject({ ok: false, name: "tests" }));
  test("non-finite JSON value becomes a fault result", () => expect(byName("coverage").collect({ ...defaultEnv(fixture()), readFile: () => '{"hits":1e999,"lines":2}' })).toMatchObject({ ok: false, name: "coverage" }));
  test("git failure is attributed to loc", () => expect(byName("loc").collect({ ...defaultEnv(fixture()), exec: () => { throw new Error("git failed"); } })).toEqual({ ok: false, name: "loc", error: "git failed" }));
  test("lizard failure is attributed to ccn", () => {
    process.env.AMADEUS_COMPLEXITY_LIZARD_CMD = "/definitely/missing/lizard";
    expect(byName("ccn").collect(defaultEnv(fixture()))).toMatchObject({ ok: false, name: "ccn" });
  });
});
