// covers: file:packages/framework/core/tools/amadeus-election.ts
// size: medium
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import type {
  CanonicalElectionDefinition,
  CanonicalQuestionResult,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { nextElection } from "../../packages/framework/core/tools/amadeus-election.ts";
import { ElectionStore } from "../../packages/framework/core/tools/amadeus-election-store.ts";

const reasons = ["tie", "block", "quorum-short", "discussion-needed", "split"] as const;

describe("t554 election mixed lifecycle CLI properties", () => {
  test("every mixed partition yields exactly its held IDs and reasons deterministically", () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 5 }),
      fc.integer({ min: 1, max: 30 }),
      fc.array(fc.constantFrom(...reasons), { minLength: 5, maxLength: 5 }),
      (size, rawMask, selectedReasons) => {
        const mask = rawMask % (2 ** size);
        fc.pre(mask > 0 && mask < (2 ** size) - 1);
        const definition: CanonicalElectionDefinition = {
          schemaVersion: 2,
          electionId: "E-PBT-MIXED",
          kind: "decision",
          questions: Array.from({ length: size }, (_, index) => ({
            questionId: `q-${index}`,
            text: `Question ${index}?`,
            choices: [{ internalNo: 1, label: "yes" }],
          })),
          voters: ["alice", "bob"],
        };
        const results: CanonicalQuestionResult[] = definition.questions.map((question, index) =>
          (mask & (1 << index)) !== 0
            ? { questionId: question.questionId, kind: "hold", reason: selectedReasons[index]!, counts: { favor: 1, against: 1, abstain: 0, discuss: 0 } }
            : { questionId: question.questionId, kind: "established", winner: { internalNo: 1, label: "yes" }, choiceCounts: [{ internalNo: 1, label: "yes", count: 2 }], goa: { favor: 2, against: 0, abstain: 0, discuss: 0 } },
        );
        const tally: CanonicalTally = {
          schemaVersion: 2,
          runId: "run-1",
          targetQuestionIds: definition.questions.map((question) => question.questionId),
          results,
          preservedResultDigest: null,
          talliedAt: "2026-08-13T00:00:00Z",
        };
        const root = mkdtempSync(join(tmpdir(), "election-v2-cli-pbt-"));
        try {
          expect(ElectionStore.create(root, definition).ok).toBe(true);
          expect(ElectionStore.setState(root, definition.electionId, "collecting").ok).toBe(true);
          expect(ElectionStore.commitTally(root, definition.electionId, tally, { expectedState: "collecting", nextState: "partial" }).ok).toBe(true);
          const first = nextElection(root, definition.electionId);
          const second = nextElection(root, definition.electionId);
          expect(second).toEqual(first);
          if (!first.ok || first.value.kind !== "hold") throw new Error("expected hold");
          const expected = results.flatMap((result) => result.kind === "hold" ? [{ questionId: result.questionId, reason: result.reason }] : []);
          expect(first.value.targetQuestionIds).toEqual(expected.map((entry) => entry.questionId));
          expect(first.value.held).toEqual(expected);
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      },
    ), { seed: 0x28_1554, numRuns: 100 });
  });
});
