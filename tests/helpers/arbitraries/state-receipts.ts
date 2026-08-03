// Arbitraries for property-based tests over the Mirror Boundary Receipts codec
// (#1980, Bolt 2, unit state-pbt). The phase vocabulary, the status vocabulary,
// the normalization and the rejection rules all live in
// packages/framework/core/tools/amadeus-state.ts — this module never restates
// them, it only produces inputs at the codec's boundary.
//
// nonConformingReceiptsTextArb produces RAW TEXT rather than values, because
// parseMirrorBoundaryReceipts takes `string | null` and its first rejection
// branch scans the raw text with a regex: duplicate JSON keys simply cannot be
// expressed by stringifying an object, so a value-shaped generator could never
// reach that branch.
//
// The reader rejects in a fixed order (duplicate phase → invalid JSON →
// non-object → unknown phase → invalid status) and an earlier branch masks all
// later ones. Each constructor below is therefore built so that it CANNOT trip
// an earlier branch: the key/status alphabet excludes `"` and `:` so no
// generated text can accidentally grow a second `"<phase>":` occurrence, and no
// constructor emits null, "" or whitespace-only text (which the reader treats as
// the empty receipts set, not as a rejection).

import fc from "fast-check";
import {
  MIRROR_BOUNDARY_PHASES,
  type MirrorBoundaryReceiptStatus,
  type MirrorBoundaryReceipts,
} from "../../../packages/framework/core/tools/amadeus-state.ts";

const statusArb: fc.Arbitrary<MirrorBoundaryReceiptStatus> = fc.constantFrom(
  "pending",
  "completed",
);

// A phase subset in RANDOM insertion order: the writer reorders into
// MIRROR_BOUNDARY_PHASES order, so P-ST1 only exercises that normalization if
// the generated key order is free (BR-ST-2). The empty subset is included.
export const receiptsArb: fc.Arbitrary<MirrorBoundaryReceipts> = fc
  .shuffledSubarray([...MIRROR_BOUNDARY_PHASES])
  .chain((phases) =>
    fc
      .array(statusArb, { minLength: phases.length, maxLength: phases.length })
      .map((statuses) => {
        const receipts: MirrorBoundaryReceipts = {};
        phases.forEach((phase, index) => {
          receipts[phase] = statuses[index] as MirrorBoundaryReceiptStatus;
        });
        return receipts;
      }),
  );

// Alphabet for generated JSON keys and status values. Excludes `"` and `:` (so
// a generated token can never forge a second `"<phase>":` occurrence and divert
// the input to the duplicate-phase branch) and `\` (so JSON.stringify has no
// escaping work that could reintroduce either character).
const SAFE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-.#/é".split("");

const safeTokenArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...SAFE_CHARS), { minLength: 0, maxLength: 10 })
  .map((chars) => chars.join(""));

// Branch 1 (:248) — the same phase key twice in the raw text. Expressible only
// as text; JSON.parse itself would keep the last write.
const duplicatePhaseArb: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom(...MIRROR_BOUNDARY_PHASES), statusArb, statusArb)
  .map(([phase, first, second]) => `{"${phase}":"${first}","${phase}":"${second}"}`);

// Branch 2 (:257) — JSON.parse throws. Each fragment holds at most one
// `"<phase>":` occurrence so branch 1 stays untouched.
const invalidJsonArb: fc.Arbitrary<string> = fc.constantFrom(
  "{",
  "}",
  "[",
  "{,}",
  "not json",
  '{"ideation"}',
  '{"ideation":}',
  '{"inception":"pending"',
  '{"construction":"pending",}',
);

// Branch 3 (:261) — valid JSON that is not a plain object.
const nonObjectArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant("null"),
  fc.constant("true"),
  fc.constant("false"),
  fc.integer({ min: -9999, max: 9999 }).map((n) => JSON.stringify(n)),
  safeTokenArb.map((token) => JSON.stringify(token)),
  fc
    .array(fc.integer({ min: 0, max: 99 }), { maxLength: 4 })
    .map((numbers) => JSON.stringify(numbers)),
);

// Branch 4 (:266) — a well-formed object whose only key is not a known phase.
// The "-unknown" suffix makes membership impossible by construction (no phase
// name contains "-"), so no rejection-sampling filter is needed.
const unknownPhaseArb: fc.Arbitrary<string> = fc
  .tuple(safeTokenArb, statusArb)
  .map(([token, status]) => JSON.stringify({ [`${token}-unknown`]: status }));

// Branch 5 (:270) — a known phase carrying a status outside the two-word
// vocabulary. The "-invalid" suffix makes membership impossible by construction.
const invalidStatusArb: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom(...MIRROR_BOUNDARY_PHASES), safeTokenArb)
  .map(([phase, token]) => JSON.stringify({ [phase]: `${token}-invalid` }));

// Exported so BR-ST-4's generator self-check can drive each constructor on its
// own and confirm it lands on the branch it was written for. The property under
// test (P-ST2) consumes only the union below.
export const nonConformingBranchArbs = {
  duplicatePhase: duplicatePhaseArb,
  invalidJson: invalidJsonArb,
  nonObject: nonObjectArb,
  unknownPhase: unknownPhaseArb,
  invalidStatus: invalidStatusArb,
} as const;

export const nonConformingReceiptsTextArb: fc.Arbitrary<string> = fc.oneof(
  ...Object.values(nonConformingBranchArbs),
);
