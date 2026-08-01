// covers: otel:metrics-vocabulary
// size: small
//
// U5 (metrics) — the closed instrument set and its closed attribute vocabulary
// (#1868 §6). Cardinality is the whole point of the closure: a metric
// attribute is a dimension, so an out-of-set key would multiply the stored
// series rather than annotate one. Pure data and one pure admission function —
// no fs, no spawn.

import { describe, expect, test } from "bun:test";
import {
  admitInstrumentAttributes,
  INSTRUMENT_ATTRIBUTE_KEYS,
  INSTRUMENT_NAMES,
  INSTRUMENTS,
  instrumentDef,
  TOKEN_TYPES,
} from "../../dist/claude/.claude/otel/metrics-vocabulary.ts";
import { DEFAULT_REDACTION_POLICY, redactAttributes } from "../../dist/claude/.claude/otel/redaction.ts";

describe("the instrument set is the #1868 §6 five (FR-MET)", () => {
  test("names and kinds match the schema table exactly", () => {
    expect(INSTRUMENTS.map((def) => [def.name, def.kind])).toEqual([
      ["gen_ai.client.token.usage", "histogram"],
      ["amadeus.stage.duration", "histogram"],
      ["amadeus.gate.iterations", "counter"],
      ["amadeus.operation.failures", "counter"],
      ["amadeus.subagent.duration", "histogram"],
    ]);
    expect(INSTRUMENT_NAMES.length).toBe(5);
  });

  test("each instrument declares the schema's attribute set", () => {
    expect(instrumentDef("gen_ai.client.token.usage").attributeKeys).toEqual([
      "gen_ai.token.type",
      "gen_ai.request.model",
    ]);
    expect(instrumentDef("amadeus.stage.duration").attributeKeys).toEqual(["amadeus.stage", "amadeus.phase"]);
    expect(instrumentDef("amadeus.gate.iterations").attributeKeys).toEqual(["amadeus.stage"]);
    expect(instrumentDef("amadeus.operation.failures").attributeKeys).toEqual(["amadeus.operation"]);
    expect(instrumentDef("amadeus.subagent.duration").attributeKeys).toEqual(["amadeus.agent.type"]);
  });

  test("an unregistered instrument name is an invariant violation", () => {
    expect(() => instrumentDef("amadeus.made.up" as never)).toThrow(/not a registered instrument/);
  });

  test("token type is the two GenAI semconv values", () => {
    expect([...TOKEN_TYPES]).toEqual(["input", "output"]);
  });
});

describe("attribute admission is closed (cardinality control, #1868 §6)", () => {
  test("declared keys pass through", () => {
    expect(admitInstrumentAttributes("amadeus.stage.duration", { "amadeus.stage": "code-generation", "amadeus.phase": "construction" })).toEqual({
      "amadeus.stage": "code-generation",
      "amadeus.phase": "construction",
    });
  });

  test("a key outside the instrument's set throws rather than being dropped", () => {
    expect(() =>
      admitInstrumentAttributes("amadeus.gate.iterations", { "amadeus.stage": "x", "amadeus.phase": "construction" })
    ).toThrow(/not an attribute of amadeus.gate.iterations/);
  });

  test("the high-cardinality identifiers #1868 §6 excludes are refused on every instrument", () => {
    for (const name of INSTRUMENT_NAMES) {
      expect(() => admitInstrumentAttributes(name, { "amadeus.intent.id": "260801-otel" })).toThrow(/cardinality is closed/);
      expect(() => admitInstrumentAttributes(name, { "amadeus.agent.id": "agent-7" })).toThrow(/cardinality is closed/);
    }
  });

  test("an unresolvable dimension is omitted, not guessed (fail-open)", () => {
    expect(admitInstrumentAttributes("amadeus.stage.duration", { "amadeus.stage": "s", "amadeus.phase": null })).toEqual({ "amadeus.stage": "s" });
    expect(admitInstrumentAttributes("amadeus.stage.duration", { "amadeus.stage": "s", "amadeus.phase": undefined })).toEqual({ "amadeus.stage": "s" });
    expect(admitInstrumentAttributes("amadeus.stage.duration", { "amadeus.stage": "s", "amadeus.phase": "" })).toEqual({ "amadeus.stage": "s" });
  });
});

describe("the redaction policy admits the dimensions (export-boundary-redaction)", () => {
  test("every declared dimension survives the default-deny export boundary", () => {
    const attrs = Object.fromEntries(INSTRUMENT_ATTRIBUTE_KEYS.map((key) => [key, `value-of-${key}`]));
    expect(redactAttributes(attrs, DEFAULT_REDACTION_POLICY)).toEqual(attrs);
  });

  test("a dimension value carrying a credential is still scrubbed", () => {
    const redacted = redactAttributes({ "gen_ai.request.model": "model ghp_012345678901234567890123456789" });
    expect(redacted["gen_ai.request.model"]).toBe("model [REDACTED]");
  });

  test("an undeclared key is still denied at the boundary", () => {
    expect(redactAttributes({ "amadeus.intent.id": "260801-otel" })).toEqual({});
  });
});
