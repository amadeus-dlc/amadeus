import { describe, expect, test } from "bun:test";
import {
  advisoryFromEvaluatorRun,
  parseAdvisoryDeclarations,
  resolveArgvTokens,
} from "../../packages/framework/core/tools/amadeus-advisory-declaration.ts";

// U2 declaration-driven advisory supply (ADR-6 revision, business-rules.md
// BR-U2-18/19/20). Pure layer: no filesystem and no process spawn.

const DECLARATION = {
  advisories: [
    {
      code: "spec-change",
      checkpoints: ["requirements-analysis", "functional-design"],
      evaluator: { argv: ["bun", "plugins/conformance-fixture/tools/conformance-fixture-tool.ts", "hold"] },
    },
  ],
};

describe("parseAdvisoryDeclarations", () => {
  test("reads a well-formed declaration", () => {
    const parsed = parseAdvisoryDeclarations(JSON.stringify(DECLARATION));
    expect(parsed.invalid).toEqual([]);
    expect(parsed.declarations).toHaveLength(1);
    expect(String(parsed.declarations[0]?.code)).toBe("spec-change");
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
    ["an entry that is not an object", JSON.stringify({ advisories: ["spec-change"] })],
  ])("reports %s as invalid rather than dropping it", (_label, text) => {
    const parsed = parseAdvisoryDeclarations(text);
    expect(parsed.declarations).toEqual([]);
    expect(parsed.invalid.length).toBeGreaterThan(0);
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

describe("advisoryFromEvaluatorRun (BR-U2-20: stdout is the authority)", () => {
  const declaration = parseAdvisoryDeclarations(JSON.stringify(DECLARATION)).declarations[0] as NonNullable<
    ReturnType<typeof parseAdvisoryDeclarations>["declarations"][number]
  >;

  function advisory(run: { status: number; stdout: string }) {
    return advisoryFromEvaluatorRun("conformance-fixture", declaration, "requirements-analysis", run);
  }

  test("a no-hold verdict raises nothing", () => {
    expect(advisory({ status: 0, stdout: JSON.stringify({ ok: true, verdict: { kind: "no-hold" } }) })).toBeNull();
  });

  test("a hold verdict raises the declared code with its reasons in the message", () => {
    const raised = advisory({
      status: 1,
      stdout: JSON.stringify({ ok: false, verdict: { kind: "hold", reasons: [{ kind: "stale-evidence" }] } }),
    });
    expect(String(raised?.code)).toBe("spec-change");
    expect(raised?.plugin).toBe("conformance-fixture");
    expect(raised?.stage).toBe("requirements-analysis");
    expect(raised?.message).toContain("stale-evidence");
  });

  test("a plugin-provided hold message is preserved verbatim", () => {
    const message = "advisory: plugin-owned explanation";
    const raised = advisory({
      status: 1,
      stdout: JSON.stringify({ verdict: { kind: "hold", reasons: [{ kind: "changed" }], message } }),
    });
    expect(raised?.message).toBe(message);
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
