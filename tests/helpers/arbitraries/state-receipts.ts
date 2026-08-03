// Arbitraries for the Mirror Boundary Receipts codec (#1980). Vocabularies,
// normalization and rejection rules stay in amadeus-state.ts — this module only
// produces inputs at the codec's boundary.
//
// The rejection generator yields RAW TEXT, not values: the first rejection
// branch scans the text for a repeated key, which stringifying an object can
// never produce. Rejection is ordered (duplicate → invalid JSON → non-object →
// unknown phase → invalid status) and an earlier branch masks the later ones, so
// each constructor is built so it cannot trip an earlier one — hence the key and
// status alphabet excludes `"` and `:`, and nothing emits null, "" or blank text
// (which the reader reads as the empty set, not as a rejection).

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

// Random insertion order: the writer reorders, so P-ST1 only exercises that
// normalization if the generated key order is free (BR-ST-2). Empty set included.
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

// Key/status alphabet. Excludes `"`, `:` and `\` so no generated token can forge
// a second `"<phase>":` occurrence and divert the input to the duplicate branch.
const SAFE_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-.#/é".split("");

const safeTokenArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...SAFE_CHARS), { minLength: 0, maxLength: 10 })
  .map((chars) => chars.join(""));

// Branch 1 — the same phase key twice. Expressible only as text; JSON.parse
// itself would silently keep the last write.
const duplicatePhaseArb: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom(...MIRROR_BOUNDARY_PHASES), statusArb, statusArb)
  .map(([phase, first, second]) => `{"${phase}":"${first}","${phase}":"${second}"}`);

// Branch 2 — JSON.parse throws. At most one `"<phase>":` per fragment, so
// branch 1 stays untouched.
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

// Branch 3 — valid JSON that is not a plain object.
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

// Branch 4 — one key that is not a known phase. The "-unknown" suffix makes
// membership impossible by construction (no phase contains "-"), so no filter.
const unknownPhaseArb: fc.Arbitrary<string> = fc
  .tuple(safeTokenArb, statusArb)
  .map(([token, status]) => JSON.stringify({ [`${token}-unknown`]: status }));

// Branch 5 — a known phase carrying a status outside the two-word vocabulary.
const invalidStatusArb: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom(...MIRROR_BOUNDARY_PHASES), safeTokenArb)
  .map(([phase, token]) => JSON.stringify({ [phase]: `${token}-invalid` }));

// Exported so BR-ST-4's self-check can drive each constructor alone and confirm
// it lands on its own branch. P-ST2 consumes only the union below.
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
