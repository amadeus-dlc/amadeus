import { describe, expect, test } from "bun:test";
import { runCli, type CollectEnv, type Collector } from "../../scripts/metrics-snapshot.ts";

const env: CollectEnv = { repoRoot: "/tmp", readFile: () => "", listFiles: () => [], exec: () => "a".repeat(40) };
const good: Collector = { name: "good", collect: () => ({ ok: true, name: "good", tool: "x", tool_version: "1", values: { n: 1 } }) };
const bad: Collector = { name: "bad", collect: () => ({ ok: false, name: "bad", error: "boom" }) };
describe("t221 metrics snapshot CLI", () => {
  test("--write reports OK, count and path", () => expect(runCli(["--write"], { env, collectors: [good], writer: () => "/tmp/metrics/x.json" })).toEqual({ code: 0, line: "OK 1 collectors /tmp/metrics/x.json", path: "/tmp/metrics/x.json" }));
  test("--check reports CHECK OK and count without writer", () => {
    let writes = 0;
    expect(runCli(["--check"], { env, collectors: [good], writer: () => { writes++; return "x"; } }).line).toBe("CHECK OK 1 collectors");
    expect(writes).toBe(0);
  });
  test("no arguments returns usage", () => expect(runCli([])).toEqual({ code: 1, line: "Usage: bun scripts/metrics-snapshot.ts --write|--check" }));
  test("unknown flag returns usage", () => expect(runCli(["--wat"])).toEqual({ code: 1, line: "Usage: bun scripts/metrics-snapshot.ts --write|--check" }));
  test("collector failure names collector", () => expect(runCli(["--write"], { env, collectors: [bad] }).line).toBe("FAILED [COLLECTOR: bad] boom"));
  test("check failure uses CHECK FAILED", () => expect(runCli(["--check"], { env, collectors: [bad] }).line).toBe("CHECK FAILED [COLLECTOR: bad] boom"));
  test("writer failure is loud and classified", () => expect(runCli(["--write"], { env, collectors: [good], writer: () => { throw new Error("disk full"); } })).toEqual({ code: 1, line: "FAILED [COLLECTOR: writer] disk full" }));
});
