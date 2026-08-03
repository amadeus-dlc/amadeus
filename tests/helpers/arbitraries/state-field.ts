// Arbitraries for property-based tests over the state file's `- **Field**: value`
// text layer (#1980, Bolt 2, unit state-pbt). The predicate for "this field
// exists" lives in packages/framework/core/tools/amadeus-lib.ts (fieldExists,
// backed by the fieldLineRegex that setField/setFieldStrict share) — this module
// never restates it. Instead the two content generators satisfy their domain
// CONSTRUCTIVELY: one always emits the field's line, the other never does, so
// the properties need no fc.pre filter that would quietly shrink the run count.
//
// Field names deliberately include regex metacharacters: all three functions run
// the name through escapeRegex, so a name like "Field.With*Meta" is legal and
// exercises that escaping. Line terminators in names are excluded for the same
// reason values exclude them (see fieldValueArb).

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

// Surrounding noise: headings and OTHER field lines. Derived from the same name
// pool with a suffix so a noise line can never be the target field's line —
// `- **Current Stage Other**:` does not match the anchored `- **Current Stage**:`
// matcher, which is exactly the near-miss the generator wants present.
const noiseLineArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom("# Amadeus State", "## Progress", "", "<!-- comment -->"),
  fieldNameArb.map((name) => `- **${name} Other**: noise`),
);

const noiseBlockArb: fc.Arbitrary<string[]> = fc.array(noiseLineArb, { maxLength: 4 });

// The value already sitting on the field line before the property overwrites it.
const initialValueArb: fc.Arbitrary<string> = fc.constantFrom("", "old", "pending", "  spaced  ");

// A content that CONTAINS the field's line, wrapped in noise on both sides.
export const stateContentWithFieldArb: fc.Arbitrary<{ content: string; field: string }> = fc
  .tuple(fieldNameArb, noiseBlockArb, noiseBlockArb, initialValueArb)
  .map(([field, before, after, initial]) => ({
    content: [...before, `- **${field}**: ${initial}`, ...after, ""].join("\n"),
    field,
  }));

// A content that OMITS the field's line. Near-miss lines (the name with a prefix
// or a suffix inside the bold markers) are included on purpose: they must not be
// mistaken for the field, so this generator also guards against a loosened
// matcher.
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

// Values that survive the write⇔read round-trip. Two exclusions, both measured
// against the implementation rather than assumed:
//   - the four JS line terminators (LF, CR, U+2028, U+2029), which `.` never
//     matches and which the m-flag `$` anchors before, so the tail is unreadable;
//   - `$`, because setField writes via String.prototype.replace, where $&, $`,
//     $', $n and $$ expand into something other than the value.
// Excluding `$` outright is stronger than strictly necessary ("$x" is harmless)
// and keeps the predicate a single-character test. Everything else stays in:
// the empty string, leading/trailing whitespace, tabs and non-ASCII all remain
// reachable so the property does not hollow out.
const EXCLUDED_FROM_VALUES = /[\n\r\u2028\u2029$]/g;

const valueBodyArb: fc.Arbitrary<string> = fc
  .string({ unit: "grapheme", maxLength: 24 })
  .map((body) => body.replace(EXCLUDED_FROM_VALUES, ""));

const padArb: fc.Arbitrary<string> = fc.constantFrom("", " ", "  ", "\t", " \t ");

// The empty and whitespace-only cases are drawn explicitly rather than left to
// the body generator: they are the boundary getField's trim collapses to "", and
// sampling showed the composed generator reaches them too rarely to rely on.
export const fieldValueArb: fc.Arbitrary<string> = fc.oneof(
  { arbitrary: fc.constantFrom("", " ", "   ", "\t"), weight: 1 },
  {
    arbitrary: fc
      .tuple(padArb, valueBodyArb, padArb)
      .map(([left, body, right]) => `${left}${body}${right}`),
    weight: 9,
  },
);
