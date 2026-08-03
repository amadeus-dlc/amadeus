// Arbitraries for property-based tests over the election definition domain
// (#1980). Like the setup CLI's semver arbitraries, these stop at the parser's
// input boundary: they build plain values that Election.parse accepts (or that
// break exactly one of its invariants) and never fabricate brand-typed values
// such as Goa, which only its smart constructor may produce.
//
// The invariants mirrored here are the ones Election.parse enforces
// (packages/framework/core/tools/amadeus-election-model.ts):
//   electionId non-empty string, kind/question strings, choices a non-empty
//   array with unique internalNo and string labels (description absent or a
//   string), voters a non-empty array of unique strings.
// Uniqueness is produced BY CONSTRUCTION (fc.uniqueArray), never by generating
// and filtering: a post-hoc filter would re-implement the parser's own
// rejection rule inside the generator.

import fc from "fast-check";
import type {
  Choice,
  Election,
  ElectionState,
} from "../../../packages/framework/core/tools/amadeus-election-model";

const labelArb: fc.Arbitrary<string> = fc.string({ maxLength: 12 });
const nonEmptyStringArb: fc.Arbitrary<string> = fc.string({ minLength: 1, maxLength: 12 });

// `description` is optional and, when absent, the KEY IS ABSENT — never present
// with an undefined value. JSON cannot express an undefined value, so a record
// carrying `description: undefined` would lose the key in transit and make the
// roundtrip property fail for a reason that has nothing to do with the parser.
function choiceArb(internalNo: number): fc.Arbitrary<Choice> {
  return fc.oneof(
    fc.record({ internalNo: fc.constant(internalNo), label: labelArb }),
    fc.record({ internalNo: fc.constant(internalNo), label: labelArb, description: labelArb }),
  );
}

const choicesArb: fc.Arbitrary<Choice[]> = fc
  .uniqueArray(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 5 })
  .chain((numbers) => fc.tuple(...numbers.map(choiceArb)));

const votersArb: fc.Arbitrary<string[]> = fc.uniqueArray(nonEmptyStringArb, {
  minLength: 1,
  maxLength: 5,
});

/** Election definitions that Election.parse accepts, shaped EXACTLY like the
 *  Election type. The parser rebuilds only its five known fields, so a value
 *  carrying extra keys could never survive a roundtrip — the generator stays
 *  inside the parser's own output shape. */
export const validElectionArb: fc.Arbitrary<Election> = fc.record({
  electionId: nonEmptyStringArb,
  kind: labelArb,
  question: labelArb,
  choices: choicesArb,
  voters: votersArb,
});

// The seven states election.json may carry. Typed as ElectionState so a change
// to the union is a compile error here rather than a silently narrower generator.
const electionStateArb: fc.Arbitrary<ElectionState> = fc.constantFrom<ElectionState[]>(
  "draft",
  "open",
  "collecting",
  "tallied",
  "rendered",
  "recorded",
  "hold",
);

/** A well-formed election.json payload: a valid definition plus a known state. */
export const validElectionFileArb: fc.Arbitrary<unknown> = fc
  .tuple(validElectionArb, electionStateArb)
  .map(([election, state]) => ({ ...election, state }));

// A string that cannot collide with the known state vocabulary: every value is
// prefixed, so the generator provably produces the class it intends without
// asking any validator whether the result is invalid.
const unknownStateArb: fc.Arbitrary<string> = labelArb.map((s) => `not-a-state-${s}`);

const nonStringArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.integer(),
  fc.constant(null),
  fc.array(fc.integer(), { maxLength: 2 }),
  fc.boolean(),
);

/** election.json payloads that must be rejected on read. Each is a valid payload
 *  with exactly ONE invariant broken by construction, so the property never has
 *  to decide invalidity itself (which would re-implement the parser). */
export const invalidElectionFileArb: fc.Arbitrary<unknown> = fc.oneof(
  // 1. duplicated choice internalNo (#1459 shape 1)
  fc
    .tuple(validElectionFileArb, labelArb)
    .map(([file, label]) => {
      const f = file as { choices: Choice[] };
      const first = f.choices[0] as Choice;
      return { ...f, choices: [...f.choices, { internalNo: first.internalNo, label }] };
    }),
  // 2. empty choice list (#1459 shape 2)
  validElectionFileArb.map((file) => ({ ...(file as object), choices: [] })),
  // 3. duplicated voter (#1459 shape 3)
  validElectionFileArb.map((file) => {
    const f = file as { voters: string[] };
    return { ...f, voters: [...f.voters, f.voters[0] as string] };
  }),
  // 4. empty voter list
  validElectionFileArb.map((file) => ({ ...(file as object), voters: [] })),
  // 5. empty electionId
  validElectionFileArb.map((file) => ({ ...(file as object), electionId: "" })),
  // 6. a state outside the known vocabulary — the only class that passes
  //    Election.parse and is caught by the state check alone
  fc
    .tuple(validElectionFileArb, unknownStateArb)
    .map(([file, state]) => ({ ...(file as object), state })),
  // 7. a required field replaced by a value of the wrong type
  fc
    .tuple(
      validElectionFileArb,
      fc.constantFrom("electionId", "kind", "question", "choices", "voters", "state"),
      nonStringArb,
    )
    .map(([file, field, value]) => ({ ...(file as object), [field]: value })),
  // 8. a non-string choice description
  fc.tuple(validElectionFileArb, nonStringArb).map(([file, value]) => {
    const f = file as { choices: Choice[] };
    const first = f.choices[0] as Choice;
    return {
      ...f,
      choices: [{ ...first, description: value }, ...f.choices.slice(1)],
    };
  }),
);
