// Arbitraries over the Mirror state codec's snapshot domain (#1980 U7).
//
// Every value is VALID BY CONSTRUCTION: each invariant is satisfied while the
// snapshot is assembled, and the receipt map key comes from `mirrorEventKey`
// itself. The codec's rejection rules are never re-implemented here and the
// parser is never used as a validity filter, so a defect in this generator
// cannot cancel out against a defect in the code under test.
//
// v1 covers revision, receipts (6 boundary kinds x 3 operations x 7 statuses
// with the fields each status requires, projectSyncHold, projectSyncVerified,
// createdRevision/projectSyncRevision) and the issueNumber+provenance pair.
// NOT covered — these are UNVERIFIED, not proven: receipt.authorization,
// receipt.createIdentity, warnings, repairChallenges, expectedPrompt,
// auditOutbox, the projectSync ledger, and timestamps with a numeric offset,
// fractional seconds, a leap second, or a day past 28.

import fc from "fast-check";
import { mirrorEventKey } from "../../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import type {
  MirrorBoundary,
  MirrorEventIdentity,
  MirrorOperationReceipt,
  MirrorProvenance,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "../../../packages/framework/core/tools/amadeus-mirror-types.ts";

type ReceiptRevisions = Pick<
  MirrorOperationReceipt,
  "createdRevision" | "projectSyncRevision"
>;
type ReceiptStatus = MirrorOperationReceipt["status"];

const REPOSITORIES: readonly RepositoryIdentity[] = [
  { owner: "acme", name: "widgets", canonical: "acme/widgets" },
  { owner: "octo", name: "demo", canonical: "octo/demo" },
];

const pad = (value: number): string => String(value).padStart(2, "0");

/** RFC 3339 UTC timestamps built constructively — the grammar is not
 *  re-implemented and no clock is read. Days stop at 28, keeping leap-year
 *  rules out of v1. */
export const mirrorTimestampArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 2020, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
  )
  .map(
    ([y, mo, d, h, mi, s]) =>
      `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}Z`,
  );

const boundaryArb: fc.Arbitrary<MirrorBoundary> = fc
  .tuple(
    fc.constantFrom(
      "intent-initialized",
      "intent-capture-approved",
      "phase-verified",
      "parked",
      "workflow-completed",
      "manual",
    ),
    fc.constantFrom("i1", "i2", "inception"),
    fc.constantFrom("construction", "requirements-analysis"),
  )
  .map(([kind, instance, label]): MirrorBoundary => {
    if (kind === "phase-verified") return { kind, phase: label, instance };
    if (kind === "parked") return { kind, stage: label, instance };
    return { kind, instance };
  });

export const mirrorEventArb: fc.Arbitrary<MirrorEventIdentity> = fc.record({
  intentUuid: fc.constantFrom("uuid-1", "uuid-2"),
  boundary: boundaryArb,
  operation: fc.constantFrom("create", "sync", "close"),
});

const provenanceArb: fc.Arbitrary<MirrorProvenance> = fc
  .record({
    v2: fc.boolean(),
    issueNumber: fc.integer({ min: 1, max: 999 }),
    createdAt: mirrorTimestampArb,
    createIdentity: fc.record({
      schema: fc.constant(1 as const),
      intentUuid: fc.constantFrom("uuid-1", "uuid-2"),
      intentDir: fc.constantFrom("intents/a-1", "intents/b-2"),
      repository: fc.constantFrom(...REPOSITORIES),
      operationId: fc.constantFrom("op-1", "op-2"),
      preparedAt: mirrorTimestampArb,
    }),
  })
  .map(({ v2, ...rest }): MirrorProvenance =>
    v2 ? { schema: 2, ...rest } : { schema: 1, ...rest },
  );

/** `1 <= createdRevision <= projectSyncRevision <= snapshot.revision`, drawn in
 *  one step so no rejection sampling is needed. */
const revisionsArb = (revision: number): fc.Arbitrary<ReceiptRevisions> =>
  revision < 1
    ? fc.constant({})
    : fc.oneof(
        fc.constant({}),
        fc
          .tuple(fc.integer({ min: 1, max: revision }), fc.integer({ min: 1, max: revision }))
          .map(([a, b]) => ({
            createdRevision: Math.min(a, b),
            projectSyncRevision: Math.max(a, b),
          })),
      );

/** The timestamps each status requires (codec: checkReceiptTimestampInvariants). */
const timestampFields = (status: ReceiptStatus, at: string): Partial<MirrorOperationReceipt> => ({
  ...(status === "attempted" || status === "pending" || status === "succeeded"
    ? { attemptedAt: at }
    : {}),
  ...(status === "succeeded" || status === "skipped-for-event" || status === "abandoned"
    ? { completedAt: at }
    : {}),
});

const receiptArb = (revision: number): fc.Arbitrary<MirrorOperationReceipt> =>
  fc
    .record({
      event: mirrorEventArb,
      operationId: fc.constantFrom("op-1", "op-2"),
      status: fc.constantFrom<ReceiptStatus[]>(
        "prepared",
        "attempted",
        "succeeded",
        "skipped-for-event",
        "pending",
        "safety-blocked",
        "abandoned",
      ),
      preparedAt: mirrorTimestampArb,
      at: mirrorTimestampArb,
      failureClass: fc.constantFrom("network", "api", "command"),
      lastEffect: fc.constantFrom("not-started", "no-effect-confirmed", "outcome-unknown"),
      wantsHold: fc.boolean(),
      wantsVerified: fc.boolean(),
      revisions: revisionsArb(revision),
    })
    .map((d): MirrorOperationReceipt => {
      // A Project-sync hold is the one way `pending` stands without the two
      // failure fields, so `held` and the failure pair are mutually exclusive.
      const held = d.status === "pending" && d.wantsHold;
      const failed = (d.status === "pending" && !held) || d.status === "safety-blocked";
      return {
        key: mirrorEventKey(d.event),
        event: d.event,
        operationId: d.operationId,
        status: d.status,
        preparedAt: d.preparedAt,
        ...d.revisions,
        ...timestampFields(d.status, d.at),
        ...(held
          ? { projectSyncHold: { reason: "project-sync-unsettled" as const, heldAt: d.at } }
          : {}),
        ...(failed ? { failureClass: d.failureClass } : {}),
        ...(d.status === "pending" && !held ? { lastEffect: d.lastEffect } : {}),
        ...(d.wantsVerified && d.status === "succeeded" && d.event.operation !== "close"
          ? { projectSyncVerified: true as const }
          : {}),
      };
    });

/** Snapshots the codec must accept. `revision` is drawn first because the
 *  receipt revision bounds are relative to it; `issueNumber` and `provenance`
 *  move as a pair (both null, or both set to the same Issue number). */
export const validMirrorSnapshotArb: fc.Arbitrary<MirrorStateSnapshot> = fc
  .nat({ max: 50 })
  .chain((revision) =>
    fc
      .record({
        receipts: fc.array(receiptArb(revision), { maxLength: 3 }),
        provenance: fc.option(provenanceArb, { nil: null }),
      })
      .map(({ receipts, provenance }): MirrorStateSnapshot => ({
        revision,
        issueNumber: provenance === null ? null : provenance.issueNumber,
        provenance,
        receipts: Object.fromEntries(receipts.map((r) => [r.key, r])),
        warnings: [],
        repairChallenges: {},
      })),
  );
