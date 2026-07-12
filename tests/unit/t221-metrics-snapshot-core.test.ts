import { describe, expect, test } from "bun:test";
import { collectSnapshot, runSnapshot, serializeSnapshot, type CollectEnv, type Collector } from "../../scripts/metrics-snapshot.ts";

const env: CollectEnv = { repoRoot: "/tmp", readFile: () => "", listFiles: () => [], exec: () => "a".repeat(40) };
const ok = (name: string): Collector => ({ name, collect: () => ({ ok: true, name, tool: name, tool_version: "1", values: { value: 1 } }) });
describe("t221 metrics snapshot core", () => {
  test("builds schema, UTC, commit and tool metadata", () => {
    const snapshot = runSnapshot(env, [ok("one")], new Date("2026-01-01T00:00:00Z"));
    expect(snapshot).toMatchObject({ schema_version: 1, captured_at: "2026-01-01T00:00:00.000Z", commit: "a".repeat(40) });
    expect(snapshot.collectors.one.tool).toBe("one");
  });
  test("collector addition is array-local", () => expect(Object.keys(runSnapshot(env, [ok("a"), ok("b")]).collectors)).toEqual(["a", "b"]));
  test("stops on first failure and preserves discriminated result", () => {
    const calls: string[] = [];
    const bad: Collector = { name: "bad", collect: () => { calls.push("bad"); return { ok: false, name: "bad", error: "boom" }; } };
    const later: Collector = { name: "later", collect: () => { calls.push("later"); return ok("later").collect(env); } };
    expect(collectSnapshot(env, [bad, later])).toEqual({ ok: false, name: "bad", error: "boom" });
    expect(calls).toEqual(["bad"]);
  });
  test("serialized output remains within 16KB", () => expect(Buffer.byteLength(serializeSnapshot(runSnapshot(env, [ok("one")])))).toBeLessThanOrEqual(16_384));
  test("oversized output is rejected", () => expect(() => serializeSnapshot(runSnapshot(env, [{ name: "big", collect: () => ({ ok: true, name: "big", tool: "x", tool_version: "1", values: Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`v${i}`, i])) }) }]))).toThrow("exceeds"));
  test("commit failure is classified", () => expect(collectSnapshot({ ...env, exec: () => { throw new Error("git down"); } }, [])).toEqual({ ok: false, name: "commit", error: "git down" }));
});
