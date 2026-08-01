// metrics-vocabulary.ts — the closed instrument set and its closed attribute
// vocabulary (#1868 §6).
//
// This module is a LEAF: it imports nothing. That is what lets BOTH the
// measurement side (metrics-instruments.ts) and the redaction policy
// (redaction.ts) read one catalogue without a cycle — the measurement side
// reaches the exporter, the exporter reaches redaction, and redaction reaching
// back into the measurement side would close the loop.
//
// CARDINALITY IS THE POINT. Metric attributes are dimensions: every distinct
// value multiplies the stored series. #1868 §6 pins each instrument to a
// low-cardinality set and states the exclusion outright — intent ids and agent
// ids are NOT metric attributes; the correlation they would give is the
// trace/log side's job. So the vocabulary is closed here and an out-of-set key
// is an invariant exception rather than a silently dropped dimension.

export const INSTRUMENT_NAMES = [
  "gen_ai.client.token.usage",
  "amadeus.stage.duration",
  "amadeus.gate.iterations",
  "amadeus.operation.failures",
  "amadeus.subagent.duration",
] as const;

export type InstrumentName = (typeof INSTRUMENT_NAMES)[number];

export type InstrumentKind = "counter" | "histogram";

export type InstrumentDef = {
  readonly name: InstrumentName;
  readonly kind: InstrumentKind;
  // Every attribute key this instrument may carry (#1868 §6). An emitter MAY
  // omit one — an unresolvable dimension is absent, never guessed (#1868
  // design principle 2, fail-open) — but it may never add one.
  readonly attributeKeys: readonly string[];
};

export const INSTRUMENTS: readonly InstrumentDef[] = [
  {
    name: "gen_ai.client.token.usage",
    kind: "histogram",
    attributeKeys: ["gen_ai.token.type", "gen_ai.request.model"],
  },
  {
    name: "amadeus.stage.duration",
    kind: "histogram",
    attributeKeys: ["amadeus.stage", "amadeus.phase"],
  },
  {
    name: "amadeus.gate.iterations",
    kind: "counter",
    attributeKeys: ["amadeus.stage"],
  },
  {
    name: "amadeus.operation.failures",
    kind: "counter",
    attributeKeys: ["amadeus.operation"],
  },
  {
    name: "amadeus.subagent.duration",
    kind: "histogram",
    attributeKeys: ["amadeus.agent.type"],
  },
];

// The union of every instrument's attribute keys. The redaction policy admits
// these as safe keys — derived from the catalogue rather than hand-listed, so
// an instrument cannot declare a dimension the default-deny policy then eats
// out of the stored record without a word.
export const INSTRUMENT_ATTRIBUTE_KEYS: readonly string[] = [
  ...new Set(INSTRUMENTS.flatMap((def) => def.attributeKeys)),
];

// The two values `gen_ai.token.type` may take (OTel GenAI semconv). Pinned
// because this is the one dimension whose cardinality depends on a value
// rather than on a key.
export const TOKEN_TYPES = ["input", "output"] as const;
export type TokenType = (typeof TOKEN_TYPES)[number];

export function instrumentDef(name: InstrumentName): InstrumentDef {
  const def = INSTRUMENTS.find((candidate) => candidate.name === name);
  if (def === undefined) {
    throw new Error(`${name} is not a registered instrument — invariant violation (#1868 §6)`);
  }
  return def;
}

// Admit one measurement's attributes. Keys outside the instrument's declared
// set throw (a caller bug, like the Metrics API subset's out-of-subset
// instruments); keys whose value is null/undefined are dropped, which is the
// fail-open shape for a dimension that could not be resolved.
export function admitInstrumentAttributes(
  name: InstrumentName,
  attributes: Readonly<Record<string, string | null | undefined>>
): Record<string, string> {
  const allowed = instrumentDef(name).attributeKeys;
  const admitted: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!allowed.includes(key)) {
      throw new Error(
        `${key} is not an attribute of ${name} — metric cardinality is closed (#1868 §6), invariant violation`
      );
    }
    if (value === null || value === undefined || value === "") continue;
    admitted[key] = value;
  }
  return admitted;
}
