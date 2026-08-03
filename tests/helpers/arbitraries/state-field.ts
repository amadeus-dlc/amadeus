// Arbitraries for the state file's `- **Field**: value` text layer (#1980). The
// "this field exists" predicate stays in amadeus-lib.ts (fieldExists) — this
// module never restates it. The two content generators satisfy their domain
// CONSTRUCTIVELY (one always emits the field's line, the other never does), so
// the properties need no fc.pre filter that would shrink the run count.
//
// Field names deliberately include regex metacharacters: all three functions run
// the name through escapeRegex, so those names are legal and exercise it.

import fc from "fast-check";

// Names drawn from the vocabulary real state files use, plus metacharacter-heavy
// names that only survive if escapeRegex is doing its job.
const FIELD_NAMES = [
  "Current Stage",
  "Bolt Refs",
  "Worktree Path",
  "Harness",
  "Construction Autonomy Mode",
  "Field.With*Meta",
  "A(B)[C]",
  "X+Y?",
  "Cost $ Estimate",
  "Backslash\\Name",
] as const;

const fieldNameArb: fc.Arbitrary<string> = fc.constantFrom(...FIELD_NAMES);

// Noise: headings and OTHER field lines, suffixed so a noise line can never be
// the target's — `- **X Other**:` misses the anchored `- **X**:` matcher.
const noiseLineArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom("# Amadeus State", "## Progress", "", "<!-- comment -->"),
  fieldNameArb.map((name) => `- **${name} Other**: noise`),
);

const noiseBlockArb: fc.Arbitrary<string[]> = fc.array(noiseLineArb, { maxLength: 4 });

// The value already sitting on the field line before the property overwrites it.
const initialValueArb: fc.Arbitrary<string> = fc.constantFrom("", "old", "pending", "  spaced  ");

// Contains the field's line, wrapped in noise on both sides.
export const stateContentWithFieldArb: fc.Arbitrary<{ content: string; field: string }> = fc
  .tuple(fieldNameArb, noiseBlockArb, noiseBlockArb, initialValueArb)
  .map(([field, before, after, initial]) => ({
    content: [...before, `- **${field}**: ${initial}`, ...after, ""].join("\n"),
    field,
  }));

// Omits the field's line. The near-miss lines are deliberate: they must not be
// mistaken for the field, so this also guards against a loosened matcher.
export const stateContentWithoutFieldArb: fc.Arbitrary<{ content: string; field: string }> = fc
  .tuple(fieldNameArb, noiseBlockArb, noiseBlockArb)
  .map(([field, before, after]) => ({
    content: [
      ...before,
      `- **${field}X**: near miss`,
      `- **X${field}**: near miss`,
      `- **${field} **: near miss`,
      ...after,
      "",
    ].join("\n"),
    field,
  }));

// Values that survive the round-trip. Two exclusions, both measured against the
// implementation: the four JS line terminators (`.` never matches them and the
// m-flag `$` anchors before them, so the tail is unreadable), and `$` (setField
// writes via String.prototype.replace, where $&, $`, $', $n and $$ expand into
// something other than the value). Excluding `$` outright is stronger than
// necessary but keeps the predicate a single-character test. Everything else
// stays: empty string, surrounding whitespace, tabs and non-ASCII.
const EXCLUDED_FROM_VALUES = /[\n\r\u2028\u2029$]/g;

const valueBodyArb: fc.Arbitrary<string> = fc
  .string({ unit: "grapheme", maxLength: 24 })
  .map((body) => body.replace(EXCLUDED_FROM_VALUES, ""));

const padArb: fc.Arbitrary<string> = fc.constantFrom("", " ", "  ", "\t", " \t ");

// Empty and whitespace-only drawn explicitly: they are the boundary trim
// collapses to "", and sampling showed the composed generator rarely reaches them.
export const fieldValueArb: fc.Arbitrary<string> = fc.oneof(
  { arbitrary: fc.constantFrom("", " ", "   ", "\t"), weight: 1 },
  {
    arbitrary: fc
      .tuple(padArb, valueBodyArb, padArb)
      .map(([left, body, right]) => `${left}${body}${right}`),
    weight: 9,
  },
);
