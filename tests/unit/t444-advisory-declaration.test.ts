import { describe, expect, test } from "bun:test";
import {
  advisoryFromEvaluatorRun,
  parseAdvisoryDeclarations,
  resolveArgvTokens,
  resolveEvaluatorArgv,
  resolvePluginManifest,
  type DeclarationFs,
} from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";

// U2 declaration-driven advisory supply (ADR-6 revision, business-rules.md
// BR-U2-18/19/20). Pure layer: no filesystem and no process spawn.

const DECLARATION = {
  advisories: [
    {
      code: "authoring-hold",
      checkpoints: ["requirements-analysis", "functional-design"],
      evaluator: { argv: ["bun", "plugins/formal-model-check/tools/tla-authoring.ts", "hold"] },
      formalCheck: null,
    },
  ],
};

describe("parseAdvisoryDeclarations", () => {
  test("reads a well-formed declaration", () => {
    const parsed = parseAdvisoryDeclarations(JSON.stringify(DECLARATION));
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations).toHaveLength(1);
    expect(String(parsed.declarations[0]?.code)).toBe("authoring-hold");
    expect(parsed.declarations[0]?.formalCheckArgv).toBeNull();
  });

  test("a manifest without advisories declares none, and that is not an error", () => {
    const parsed = parseAdvisoryDeclarations(JSON.stringify({ name: "x", tools: [] }));
    expect(parsed).toEqual({ declarations: [], invalid: [] });
  });

  // BR-U2-18: a broken declaration is not "no advisory".
  test.each([
    ["unparseable json", "{ not json"],
    ["a non-slug code", JSON.stringify({ advisories: [{ ...DECLARATION.advisories[0], code: "Bad Code" }] })],
    ["an empty checkpoint list", JSON.stringify({ advisories: [{ ...DECLARATION.advisories[0], checkpoints: [] }] })],
    [
      "a string command instead of an argv array",
      JSON.stringify({ advisories: [{ ...DECLARATION.advisories[0], evaluator: { argv: "bun hold" } }] }),
    ],
    ["advisories that are not a list", JSON.stringify({ advisories: {} })],
    ["an entry that is not an object", JSON.stringify({ advisories: ["authoring-hold"] })],
    [
      "a formalCheck that is neither an object nor null",
      JSON.stringify({ advisories: [{ ...DECLARATION.advisories[0], formalCheck: "bun run.ts" }] }),
    ],
    [
      "a formalCheck without an argv array",
      JSON.stringify({ advisories: [{ ...DECLARATION.advisories[0], formalCheck: { argv: [] } }] }),
    ],
  ])("reports %s as invalid rather than dropping it", (_label, text) => {
    const parsed = parseAdvisoryDeclarations(text);
    expect(parsed.declarations).toEqual([]);
    expect(parsed.invalid.length).toBeGreaterThan(0);
  });

  test("reads a declaration whose formalCheck carries an argv vector", () => {
    const parsed = parseAdvisoryDeclarations(JSON.stringify({
      advisories: [{ ...DECLARATION.advisories[0], formalCheck: { argv: ["bun", "check.ts", "{out}"] } }],
    }));
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations[0]?.formalCheckArgv).toEqual(["bun", "check.ts", "{out}"]);
  });
});

describe("resolveArgvTokens", () => {
  test("substitutes every reserved token", () => {
    expect(resolveArgvTokens(["bun", "run.ts", "--out", "{out}", "--id", "{advisory-instance}"], {
      out: "docs/out",
      "advisory-instance": "abc",
    })).toEqual(["bun", "run.ts", "--out", "docs/out", "--id", "abc"]);
  });

  test("refuses an unresolved token instead of passing it through literally", () => {
    expect(resolveArgvTokens(["bun", "--out", "{unknown}"], { out: "docs/out" })).toBeNull();
  });

  test("a prototype-inherited name is unknown, not a resolved value", () => {
    expect(resolveArgvTokens(["bun", "{constructor}"], { out: "docs/out" })).toBeNull();
  });
});

// FR-2: a relative path-like argv element resolves against the located plugin
// root; flags, their values, bare commands, absolute paths, and reserved
// tokens pass through untouched.
describe("resolveEvaluatorArgv", () => {
  const root = "/workspace/plugins/demo";

  test("joins a relative path-like element to the plugin root", () => {
    expect(resolveEvaluatorArgv(["bun", "tools/evaluate.ts", "hold"], root))
      .toEqual(["bun", "/workspace/plugins/demo/tools/evaluate.ts", "hold"]);
  });

  test("leaves flags and their values untouched", () => {
    expect(resolveEvaluatorArgv(["bun", "tools/check.ts", "--model", "MirrorLifecycle"], root))
      .toEqual(["bun", "/workspace/plugins/demo/tools/check.ts", "--model", "MirrorLifecycle"]);
  });

  test("leaves an absolute path untouched", () => {
    expect(resolveEvaluatorArgv(["bun", "/opt/tools/evaluate.ts"], root))
      .toEqual(["bun", "/opt/tools/evaluate.ts"]);
  });

  test("leaves bare words and reserved tokens untouched (no path separator)", () => {
    expect(resolveEvaluatorArgv(["bun", "evaluate.ts", "{out}", "--out"], root))
      .toEqual(["bun", "evaluate.ts", "{out}", "--out"]);
  });
});

// FR-1: the manifest is located on the authoring face first, the staging face
// second; the plugin root is the located manifest's own directory.
describe("resolvePluginManifest", () => {
  const fsFor = (existing: readonly string[]): DeclarationFs => ({
    existsSync: (path) => existing.includes(path),
    readFileSync: () => {
      throw new Error("not needed for location");
    },
  });

  test("the authoring face wins when both faces carry a manifest", () => {
    const resolved = resolvePluginManifest("/repo", "/repo/.harness/.amadeus-plugin-src", "demo", fsFor([
      "/repo/plugins/demo/plugin.json",
      "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
    ]));
    expect(resolved).toEqual({
      manifestPath: "/repo/plugins/demo/plugin.json",
      pluginRoot: "/repo/plugins/demo",
    });
  });

  test("falls back to the staging face when the authoring face is absent", () => {
    const resolved = resolvePluginManifest("/repo", "/repo/.harness/.amadeus-plugin-src", "demo", fsFor([
      "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
    ]));
    expect(resolved).toEqual({
      manifestPath: "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
      pluginRoot: "/repo/.harness/.amadeus-plugin-src/demo",
    });
  });

  test("returns null when neither face carries a manifest", () => {
    expect(resolvePluginManifest("/repo", "/repo/.harness/.amadeus-plugin-src", "demo", fsFor([]))).toBeNull();
  });

  test("no staging root means the authoring face only (backward compatible)", () => {
    expect(resolvePluginManifest("/repo", undefined, "demo", fsFor([
      "/repo/.harness/.amadeus-plugin-src/demo/plugin.json",
    ]))).toBeNull();
    expect(resolvePluginManifest("/repo", undefined, "demo", fsFor([
      "/repo/plugins/demo/plugin.json",
    ]))?.pluginRoot).toBe("/repo/plugins/demo");
  });
});

describe("advisoryFromEvaluatorRun (BR-U2-20: stdout is the authority)", () => {
  const declaration = parseAdvisoryDeclarations(JSON.stringify(DECLARATION)).declarations[0] as NonNullable<
    ReturnType<typeof parseAdvisoryDeclarations>["declarations"][number]
  >;

  function advisory(run: { status: number; stdout: string }) {
    return advisoryFromEvaluatorRun("formal-model-check", declaration, "requirements-analysis", run);
  }

  test("a no-hold verdict raises nothing", () => {
    expect(advisory({ status: 0, stdout: JSON.stringify({ ok: true, verdict: { kind: "no-hold" } }) })).toBeNull();
  });

  test("a hold verdict raises the declared code with its reasons in the message", () => {
    const raised = advisory({
      status: 1,
      stdout: JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "stale-evidence" }] } }),
    });
    expect(String(raised?.code)).toBe("authoring-hold");
    expect(raised?.plugin).toBe("formal-model-check");
    expect(raised?.stage).toBe("requirements-analysis");
    expect(raised?.message).toContain("stale-evidence");
  });

  test("a typed failure raises rather than releasing (fail-closed)", () => {
    const raised = advisory({
      status: 1,
      stdout: JSON.stringify({ ok: false, failure: { kind: "corrupted-evidence" } }),
    });
    expect(raised?.message).toContain("corrupted-evidence");
  });

  const raising: Array<[string, { status: number; stdout: string }]> = [
    ["unparseable stdout", { status: 0, stdout: "boom" }],
    ["an exit code with no verdict at all", { status: 2, stdout: "" }],
    ["a success exit code carrying a hold verdict", {
      status: 0,
      stdout: JSON.stringify({ ok: true, verdict: { kind: "hold", reasons: [{ kind: "authoring-incomplete" }] } }),
    }],
  ];
  test.each(raising)("%s still raises the advisory", (_label, run) => {
    expect(advisory(run)).not.toBeNull();
  });

  test("gives a changed verdict a different spec identity, so it opens a new instance", () => {
    const first = advisory({
      status: 1,
      stdout: JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "stale-evidence" }] } }),
    });
    const second = advisory({
      status: 1,
      stdout: JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "authoring-incomplete" }] } }),
    });
    expect(first?.specIdentity).not.toBe(second?.specIdentity);
  });
});
