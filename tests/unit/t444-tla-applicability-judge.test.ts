import { describe, expect, test } from "bun:test";
import { ApplicabilityJudge } from "../../plugins/formal-model-check/tools/tla-applicability.ts";

// U2 C1 pin (business-rules.md BR-U2-01/02/07/09..12, business-logic-model.md §1..§2).
// Pure layer only: no filesystem, so this stays a unit-size test
// (cid:code-generation:fs-tests-integration-first).

type Judged = ReturnType<typeof ApplicabilityJudge.judge>;

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

const IDENTITY = `sha256:${"a".repeat(64)}` as never;
const OTHER_IDENTITY = `sha256:${"b".repeat(64)}` as never;

// The registered model traces FR-001; FR-900 is outside every registered model.
function input(kind: string, subjects: readonly string[]): Parameters<typeof ApplicabilityJudge.judge>[0] {
  return {
    subjectIdentity: IDENTITY,
    declaration: { subjects: subjects as never, kind: kind as never, rationale: "because" },
    registeredModels: {
      models: [{ name: "FormalElection", subjectIdentity: IDENTITY, traceSubjects: ["FR-001"] as never }],
    },
  };
}

describe("ApplicabilityJudge.judge — the closed J1..J6 table (BR-U2-01)", () => {
  test("J1: an empty subject set is undecidable, never a route", () => {
    expect(failure(ApplicabilityJudge.judge(input("new-subject", []))).kind).toBe("undecidable");
  });

  test("J1: an unreadable model map is missing-evidence", () => {
    const judged: Judged = ApplicabilityJudge.judge({ ...input("new-subject", ["FR-900"]), registeredModels: null });
    expect(failure(judged).kind).toBe("missing-evidence");
  });

  // The 8 (ChangeKind x intersection) combinations of business-logic-model.md §1.
  const contradictions: Array<[string, string[], string]> = [
    ["new-subject", ["FR-001"], "J2a"],
    ["semantic-change", ["FR-900"], "J2b"],
    ["impl-only", ["FR-900"], "J2c"],
    ["non-target", ["FR-001"], "J2d"],
  ];
  test.each(contradictions)("J2: %s with the contradicting state is undecidable (%p)", (kind, subjects, form) => {
    const error = failure(ApplicabilityJudge.judge(input(kind, subjects))) as {
      kind: string;
      conflicts: readonly string[];
    };
    expect(error.kind).toBe("undecidable");
    expect(error.conflicts).toEqual([form]);
  });

  const consistent: Array<[string, string[], string]> = [
    ["non-target", ["FR-900"], "non-target"],
    ["impl-only", ["FR-001"], "impl-only"],
    ["semantic-change", ["FR-001"], "revise-model"],
    ["new-subject", ["FR-900"], "author-new"],
  ];
  test.each(consistent)("%s with a consistent state routes to %p", (kind, subjects, route) => {
    expect(String(unwrap(ApplicabilityJudge.judge(input(kind, subjects))))).toBe(route);
  });

  test("an unrelated registered model's existence never decides the route (BR-U2-02)", () => {
    // FR-900 is untraced either way; adding a second registered model that
    // traces something else must not move the verdict.
    const withExtra = input("new-subject", ["FR-900"]);
    const models = withExtra.registeredModels?.models ?? [];
    const extended = {
      ...withExtra,
      registeredModels: { models: [...models, { name: "Other", subjectIdentity: IDENTITY, traceSubjects: ["AC-004"] as never }] },
    };
    expect(unwrap(ApplicabilityJudge.judge(extended))).toBe("author-new");
  });

  test("does not match a same-name subject from another requirements document (#3250)", () => {
    const declaration = input("non-target", ["FR-001"]);
    const withDifferentDocument = {
      ...declaration,
      subjectIdentity: OTHER_IDENTITY,
    };
    expect(unwrap(ApplicabilityJudge.judge(withDifferentDocument))).toBe("non-target");
  });

  test("routes the reproduced FR-1..FR-4,FR-6 collision to non-target (#3250)", () => {
    const subjects = ["FR-1", "FR-2", "FR-3", "FR-4", "FR-6"] as never;
    const judged = ApplicabilityJudge.judge({
      subjectIdentity: OTHER_IDENTITY,
      declaration: { subjects, kind: "non-target", rationale: "separate requirements document" },
      registeredModels: {
        models: [{ name: "Registered", subjectIdentity: IDENTITY, traceSubjects: subjects }],
      },
    });
    expect(unwrap(judged)).toBe("non-target");
  });

  test("is deterministic across repeated calls (BR-U2-07)", () => {
    const once = ApplicabilityJudge.judge(input("semantic-change", ["FR-001"]));
    const twice = ApplicabilityJudge.judge(input("semantic-change", ["FR-001"]));
    expect(once).toEqual(twice);
  });
});

const APPROVAL = {
  shard: "clone-a.jsonl",
  timestamp: "2026-08-05T00:00:00Z",
  eventIdentity: "b".repeat(64),
};

const RECEIPT_META = {
  judgedBy: "tla-authoring",
  generatedAt: "2026-08-05T01:00:00Z",
  predecessor: { kind: "root" } as const,
};

describe("ApplicabilityJudge.buildReceipt (BR-U2-03/11)", () => {
  const terminal = input("impl-only", ["FR-001"]);

  test("refuses a terminal route without an approval", () => {
    const built = ApplicabilityJudge.buildReceipt("impl-only", terminal, null, {
      ...RECEIPT_META,
      verifyApproval: () => true,
    });
    expect(failure(built)).toEqual({ kind: "approval-missing", route: "impl-only" });
  });

  test("refuses a terminal route whose approval fails provenance verification", () => {
    const built = ApplicabilityJudge.buildReceipt("non-target", input("non-target", ["FR-900"]), APPROVAL, {
      ...RECEIPT_META,
      verifyApproval: () => false,
    });
    expect(failure(built)).toEqual({ kind: "approval-missing", route: "non-target" });
  });

  test("records the series, the subjects and the deciding row on a verified terminal receipt", () => {
    const receipt = unwrap(
      ApplicabilityJudge.buildReceipt("impl-only", terminal, APPROVAL, {
        ...RECEIPT_META,
        verifyApproval: () => true,
      }),
    );
    expect(receipt.route).toBe("impl-only");
    expect(receipt.subjectSeries).toBe(ApplicabilityJudge.subjectSeriesKey(["FR-001"]));
    expect(receipt.subjects as readonly string[]).toEqual(["FR-001"]);
    expect(receipt.reason).toContain("J4");
    expect(receipt.humanApproval).toEqual(APPROVAL);
  });

  test("authoring routes need no approval", () => {
    const receipt = unwrap(
      ApplicabilityJudge.buildReceipt("revise-model", input("semantic-change", ["FR-001"]), null, {
        ...RECEIPT_META,
        verifyApproval: () => false,
      }),
    );
    expect(receipt.humanApproval).toBeNull();
    expect(receipt.reason).toContain("J5");
  });
});

describe("ApplicabilityJudge.subjectSeriesKey", () => {
  test("is a sha256 digest of the subject id set alone", () => {
    expect(ApplicabilityJudge.subjectSeriesKey(["FR-001", "AC-002"])).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("ignores declaration order (the set, not the sequence, is the series)", () => {
    expect(ApplicabilityJudge.subjectSeriesKey(["FR-001", "AC-002"])).toBe(
      ApplicabilityJudge.subjectSeriesKey(["AC-002", "FR-001"]),
    );
  });

  test("separates subject sets that differ by one id (BR-U2-22b)", () => {
    expect(ApplicabilityJudge.subjectSeriesKey(["FR-001"])).not.toBe(
      ApplicabilityJudge.subjectSeriesKey(["FR-001", "FR-002"]),
    );
  });
});
