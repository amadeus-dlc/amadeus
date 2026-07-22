// covers: function:normalizeUnitKind, function:validateStageFrontmatter,
//         function:parseStageFrontmatter, function:emitStageFrontmatter,
//         function:requiredArtifactsForUnit, function:parseBoltDag

import { describe, expect, test } from "bun:test";
import {
  emitStageFrontmatter,
  normalizeUnitKind,
  parseBoltDag,
  parseStageFrontmatter,
  UNIT_KINDS,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { requiredArtifactsForUnit } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { validateStageFrontmatter } from "../../packages/framework/core/tools/amadeus-stage-schema.ts";

const BASE = {
  slug: "plugin-stage",
  phase: "construction",
  execution: "CONDITIONAL",
  condition: "Runs when selected",
  lead_agent: "amadeus-developer-agent",
  support_agents: [],
  mode: "inline",
  produces: ["required-a", "required-b", "required-global"],
  optional_produces: ["optional-ui", "optional-global"],
  consumes: [],
  requires_stage: [],
  inputs: "inputs",
  outputs: "outputs",
} as const;

describe("t248 closed UnitKind contract", () => {
  test("accepts exactly the five canonical values", () => {
    expect(UNIT_KINDS).toEqual([
      "service",
      "spec",
      "ui",
      "packaging",
      "library",
    ]);
    for (const kind of UNIT_KINDS) {
      expect(normalizeUnitKind(kind)).toEqual({ valid: true, data: kind });
    }
  });

  test.each(["worker", "Service", "", 42, null])(
    "rejects unknown or non-string kind %p",
    (raw) => {
      const result = normalizeUnitKind(raw);
      expect(result.valid).toBe(false);
      if (result.valid) throw new Error("unknown unit kind was accepted");
      expect(result.errors[0]).toContain("unit kind");
    },
  );
});

describe("t248 plugin stage frontmatter contract", () => {
  test("parses and round-trips all optional fields without reordering values", () => {
    const source = `---
slug: plugin-stage
number: 6.2
name: Plugin Stage
phase: construction
execution: CONDITIONAL
condition: Runs when selected
lead_agent: amadeus-developer-agent
support_agents: []
mode: inline
bundle: plugin
when: {producer-in-plan: required-a}
required_sections:
  - Zeta
  - Alpha
produces:
  - required-a
  - required-global
optional_produces:
  - optional-ui
produces_kinds:
  required-a: [service, library]
  optional-ui: [ui]
consumes: []
requires_stage: []
inputs: inputs
outputs: outputs
---
`;
    const parsed = parseStageFrontmatter(source);
    expect(parsed).toMatchObject({
      number: "6.2",
      name: "Plugin Stage",
      bundle: "plugin",
      when: { "producer-in-plan": "required-a" },
      required_sections: ["Zeta", "Alpha"],
      produces_kinds: {
        "required-a": ["service", "library"],
        "optional-ui": ["ui"],
      },
    });
    expect(validateStageFrontmatter(parsed).valid).toBe(true);
    expect(parseStageFrontmatter(emitStageFrontmatter(parsed))).toEqual(parsed);
  });

  test("block and inline when forms produce the same typed value", () => {
    const inline = parseStageFrontmatter(
      emitStageFrontmatter({ ...BASE, when: { "producer-in-plan": "required-a" } }),
    );
    const block = parseStageFrontmatter(
      emitStageFrontmatter(BASE).replace(
        "produces:\n",
        "when:\n  producer-in-plan: required-a\nproduces:\n",
      ),
    );
    expect(block.when).toEqual(inline.when);
  });

  test.each([
    ["number wrong type", { number: 2.1 }],
    ["number malformed", { number: "2" }],
    ["name empty", { name: "" }],
    ["name whitespace", { name: "   " }],
    ["bundle empty", { bundle: "" }],
    ["bundle whitespace", { bundle: "   " }],
    ["when empty", { when: {} }],
    ["when unknown", { when: { selected: "required-a" } }],
    [
      "when multiple",
      { when: { "producer-in-plan": "required-a", selected: "required-b" } },
    ],
    ["when empty value", { when: { "producer-in-plan": "" } }],
    ["required sections empty item", { required_sections: ["Overview", ""] }],
  ])("rejects %s", (_name, override) => {
    expect(validateStageFrontmatter({ ...BASE, ...override }).valid).toBe(false);
  });

  test.each([
    ["orphan artifact", { missing: ["service"] }],
    ["empty kind list", { "required-a": [] }],
    ["unknown kind", { "required-a": ["worker"] }],
    ["duplicate kind", { "required-a": ["service", "service"] }],
    ["non-list", { "required-a": "service" }],
  ])("rejects produces_kinds with %s", (_name, producesKinds) => {
    expect(
      validateStageFrontmatter({
        ...BASE,
        produces_kinds: producesKinds,
      }).valid,
    ).toBe(false);
  });

  test("does not add absent optional properties", () => {
    const parsed = parseStageFrontmatter(emitStageFrontmatter(BASE));
    for (const key of [
      "number",
      "name",
      "bundle",
      "when",
      "required_sections",
      "produces_kinds",
    ]) {
      expect(key in parsed).toBe(false);
    }
  });
});

describe("t248 artifact applicability", () => {
  const stage = {
    ...BASE,
    produces_kinds: {
      "required-a": ["service", "library"],
      "required-b": ["spec"],
      "optional-ui": ["ui"],
    } as const,
  };

  test("filters required artifacts while leaving untagged artifacts global", () => {
    expect(requiredArtifactsForUnit(stage, "service")).toEqual([
      "required-a",
      "required-global",
    ]);
    expect(requiredArtifactsForUnit(stage, "spec")).toEqual([
      "required-b",
      "required-global",
    ]);
    expect(requiredArtifactsForUnit(stage, "packaging")).toEqual([
      "required-global",
    ]);
  });

  test("returns the original required matrix when no map is authored", () => {
    expect(requiredArtifactsForUnit(BASE, "ui")).toEqual(BASE.produces);
  });
});

describe("t248 Bolt DAG unit kind", () => {
  test("parses valid tagged and untagged units", () => {
    const parsed = parseBoltDag(`\`\`\`yaml
units:
  - name: tagged
    kind: spec
    depends_on: []
  - name: legacy
    depends_on: [tagged]
\`\`\``);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.detail);
    expect(parsed.units).toEqual([
      { name: "tagged", kind: "spec", depends_on: [] },
      { name: "legacy", depends_on: ["tagged"] },
    ]);
  });

  test.each([
    ["unknown kind", "  - name: bad\n    kind: worker\n    depends_on: []"],
    ["kind before name", "  kind: spec\n  - name: bad\n    depends_on: []"],
  ])("rejects %s", (_name, edge) => {
    const parsed = parseBoltDag(`\`\`\`yaml\nunits:\n${edge}\n\`\`\``);
    expect(parsed).toMatchObject({ ok: false, reason: "malformed" });
  });
});
