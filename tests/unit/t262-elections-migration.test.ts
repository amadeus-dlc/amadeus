import { describe, expect, test } from "bun:test";
import {
  checkExecutePreconditions,
  planMigration,
  sha256,
  type ExecutePreconditionInput,
  type MigrationCandidate,
} from "../../scripts/amadeus-election-migrate";

function candidate(overrides: Partial<MigrationCandidate> = {}): MigrationCandidate {
  return {
    dirName: "E-A",
    electionId: "E-A",
    status: "recorded",
    timelineInstants: ["2026-07-20T10:00:00Z", "2026-07-19T09:00:00Z"],
    gitFirstCommit: "2026-07-18T08:00:00Z",
    ...overrides,
  };
}

describe("planMigration", () => {
  test("uses timeline oldest, then git first commit, then freezes dry-run time", () => {
    const plan = planMigration(
      [
        candidate(),
        candidate({
          dirName: "E-B",
          electionId: "E-B",
          timelineInstants: [],
        }),
        candidate({
          dirName: "E-C",
          electionId: "E-C",
          timelineInstants: [],
          gitFirstCommit: null,
        }),
      ],
      [],
      "2026-07-23T01:02:03Z",
    );
    expect(plan.renames.map((entry) => [entry.electionId, entry.createdAtSource, entry.createdAt])).toEqual([
      ["E-A", "timeline-oldest", "2026-07-19T09:00:00Z"],
      ["E-B", "git-first-commit", "2026-07-18T08:00:00Z"],
      ["E-C", "unknown", "2026-07-23T01:02:03Z"],
    ]);
    expect(plan.degraded).toEqual(["E-C"]);
  });

  test("uses election.json identity and skips an already indexed physical directory", () => {
    const row = {
      electionId: "E-A",
      dirName: "260719-e-a",
      createdAt: "2026-07-19T09:00:00Z",
      status: "recorded" as const,
    };
    const plan = planMigration(
      [candidate({ dirName: "260719-e-a" })],
      [row],
      "2026-07-23T01:02:03Z",
    );
    expect(plan.renames).toEqual([]);
    expect(plan.skipped).toEqual(["E-A"]);
    expect(plan.registry).toEqual([row]);
  });

  test("reports duplicate identities and registry mismatches as conflicts", () => {
    const plan = planMigration(
      [candidate(), candidate({ dirName: "other" })],
      [{
        electionId: "E-A",
        dirName: "registered",
        createdAt: "2026-07-19T09:00:00Z",
        status: "recorded",
      }],
      "2026-07-23T01:02:03Z",
    );
    expect(plan.conflicts).toEqual([
      "registry mismatch: E-A maps to registered, found E-A",
      "duplicate electionId: E-A",
    ]);
  });
});

describe("execute preconditions and approval binding", () => {
  const good: ExecutePreconditionInput = {
    fullClone: true,
    s2Landed: true,
    statuses: ["recorded", "tallied"],
    removalIssueRef: "https://github.com/amadeus-dlc/amadeus/issues/9999",
    removalIssueExists: true,
    userApproval: "granted",
    expectedPlanHash: sha256("plan"),
    actualPlanHash: sha256("plan"),
    approvalProvenance: "agmsg:2026-07-23T05:00:00Z",
  };

  test("passes only when every precondition and plan hash match", () => {
    expect(checkExecutePreconditions(good)).toMatchObject({ ok: true, failures: [] });
  });

  test.each([
    ["full clone", { fullClone: false }],
    ["S2 landed", { s2Landed: false }],
    ["no collecting election", { statuses: ["collecting"] }],
    ["removal issue", { removalIssueExists: false }],
    ["user approval", { userApproval: "pending" }],
    ["approved plan binding", { actualPlanHash: sha256("changed") }],
    ["approval provenance", { approvalProvenance: null }],
  ] as const)("fails closed when %s is absent", (_name, patch) => {
    expect(checkExecutePreconditions({ ...good, ...patch } as ExecutePreconditionInput).ok).toBe(false);
  });
});
