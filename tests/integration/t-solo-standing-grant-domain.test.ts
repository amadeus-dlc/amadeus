// covers: function:findSoloStandingGrant, function:validateSoloStandingGrantById, function:findStandingGrantRouteReceiptById
//
// Filesystem-backed (Medium) half of the U1 grant-authorization-domain suite:
// every assertion here scans a real temp workspace's audit shards and intent
// registry, so it lives in the integration layer (test-size purity). The pure
// policy/dispatch assertions stay in
// tests/unit/t-solo-standing-grant-domain.test.ts.

// covers: function:resolveOperatingMode, function:findSoloStandingGrant, function:validateSoloStandingGrantById

import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateStandingGrantGateEligibility,
  resolveOperatingMode,
  StandingGrant,
  type StageEntry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  createStandingGrantTestObserver,
  dispatchStandingGrantQuery,
  findStandingGrantRouteReceiptById,
  findSoloStandingGrant,
  validateSoloStandingGrantById,
} from "../../packages/framework/core/tools/amadeus-grant-authorization.ts";

const tmpRoots: string[] = [];
const GRAPH: StageEntry[] = [
  stage("application-design", "2.4", "inception"),
  stage("units-generation", "2.5", "inception"),
  stage("functional-design", "3.1", "construction"),
  stage("nfr-requirements", "3.2", "construction"),
];
const ORDINARY_STAGE = "application-design";
const STATE = "# AI-DLC State\n\n- **Scope**: amadeus-feature\n- **Skeleton Stance**: off\n";
const HUMAN_TS = "2026-07-25T00:00:00.000Z";
const SHARD = "fixture-clone.md";

function stage(slug: string, number: string, phase: string): StageEntry {
  return {
    slug,
    number,
    name: slug,
    phase,
    execution: "ALWAYS",
    lead_agent: "test",
    support_agents: [],
    mode: "inline",
    scopes: ["amadeus-feature"],
  };
}

afterAll(() => {
  for (const root of tmpRoots) rmSync(root, { recursive: true, force: true });
});

function auditBlock(event: string, timestamp: string, fields: Record<string, string> = {}): string {
  let block = `\n## ${event}\n**Timestamp**: ${timestamp}\n**Event**: ${event}\n`;
  for (const [name, value] of Object.entries(fields)) block += `**${name}**: ${value}\n`;
  return `${block}\n---\n`;
}

function grantBlock(
  intent: string,
  grantId: string,
  issuedAt: string,
  expiresAt: string,
  overrides: Record<string, string> = {},
): string {
  return auditBlock("GRANT_ISSUED", issuedAt, {
    "Grant Id": grantId,
    Scope: "stage-gates",
    "Expires At": expiresAt,
    "Includes Phase Boundary": "false",
    "Issuer Space": "default",
    "Issuer Intent": intent,
    "Issuer Shard": SHARD,
    "Issuer Human Ts": HUMAN_TS,
    ...overrides,
  });
}

function fixture(
  activeAudit: string,
  extraIntents: Array<{
    intent: string;
    audit: string;
    registered?: boolean;
    status?: "in-flight" | "parked" | "complete" | "archived";
  }> = [],
): { root: string; intent: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-solo-grant-domain-"));
  tmpRoots.push(root);
  const intentsDir = join(root, "amadeus", "spaces", "default", "intents");
  const intent = "solo-intent-abcd1234";
  for (const entry of [{ intent, audit: activeAudit }, ...extraIntents]) {
    const record = join(intentsDir, entry.intent);
    mkdirSync(join(record, "audit"), { recursive: true });
    writeFileSync(join(record, "amadeus-state.md"), STATE, "utf-8");
    writeFileSync(
      join(record, "audit", SHARD),
      `# AI-DLC Audit Log\n${auditBlock("HUMAN_TURN", HUMAN_TS)}${entry.audit}`,
      "utf-8",
    );
  }
  const registry = [
    { uuid: "11111111-1111-4111-8111-111111111111", slug: "solo-intent", dirName: intent, status: "in-flight" },
    ...extraIntents
      .filter((entry) => entry.registered !== false)
      .map((entry, index) => ({
        uuid: `22222222-2222-4222-8222-${String(index).padStart(12, "0")}`,
        slug: entry.intent,
        dirName: entry.intent,
        status: entry.status ?? "in-flight",
      })),
  ];
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf-8",
  );
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(join(root, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(intentsDir, "active-intent"), `${intent}\n`, "utf-8");
  return { root, intent };
}

describe("audit-derived solo standing grant selection", () => {
  test.each([0, 1, 10, 100])(
    "uses at most G-1 comparisons and linear memory for G=%d candidates",
    (grantCount) => {
      let audit = "";
      for (let index = 0; index < grantCount; index++) {
        audit += grantBlock(
          intentName(),
          index.toString(16).padStart(8, "0"),
          "2026-07-25T01:00:00.000Z",
          "2026-07-26T01:00:00.000Z",
        );
      }
      const { root, intent } = fixture(audit);
      const observer = createStandingGrantTestObserver();

      findSoloStandingGrant(
        root,
        intent,
        ORDINARY_STAGE,
        STATE,
        GRAPH,
        Date.parse("2026-07-25T12:00:00.000Z"),
        observer,
      );

      const counts = observer.snapshot("candidate-selection");
      expect(counts.candidateCompared).toBe(Math.max(0, grantCount - 1));
      const eventCount = 1 + grantCount;
      expect(counts.memoryItemAdded).toBeLessThanOrEqual(2 * eventCount);
      expect(counts.shardOpened).toBe(1);
      expect(counts.eventVisited).toBe(1 + grantCount);
    },
  );

  test("does not select from a non-active intent even when its issue is valid", () => {
    const other = "other-intent-ef567890";
    const { root } = fixture("", [
      {
        intent: other,
        audit: grantBlock(
          other,
          "99999999",
          "2026-07-25T01:00:00.000Z",
          "2026-07-26T01:00:00.000Z",
        ),
      },
    ]);
    expect(
      findSoloStandingGrant(
        root,
        other,
        ORDINARY_STAGE,
        STATE,
        GRAPH,
        Date.parse("2026-07-25T12:00:00.000Z"),
      ),
    ).toBeNull();
  });

  test("accepts a rounded positive TTL fact but treats expiry equality as inactive", () => {
    const rounded = StandingGrant.parse(
      grantBlock(
        intentName(),
        "00000001",
        "2026-07-25T01:00:00.000Z",
        "2026-07-25T01:00:00.000Z",
      ),
    );
    expect(rounded).not.toBeNull();
    expect(rounded?.isExpired(Date.parse("2026-07-25T01:00:00.000Z"))).toBe(true);
  });

  test("selects by expiry, then issued timestamp, then Grant Id", () => {
    const { root, intent } = fixture(
      grantBlock(intentName(), "bbbbbbbb", "2026-07-25T01:00:00.000Z", "2026-07-26T00:00:00.000Z") +
        grantBlock(intentName(), "cccccccc", "2026-07-25T02:00:00.000Z", "2026-07-26T00:00:00.000Z") +
        grantBlock(intentName(), "aaaaaaaa", "2026-07-25T02:00:00.000Z", "2026-07-26T00:00:00.000Z") +
        grantBlock(intentName(), "dddddddd", "2026-07-25T03:00:00.000Z", "2026-07-25T23:00:00.000Z"),
    );

    const selected = findSoloStandingGrant(
      root,
      intent,
      ORDINARY_STAGE,
      STATE,
      GRAPH,
      Date.parse("2026-07-25T12:00:00.000Z"),
    );

    expect(selected?.grantId).toBe("aaaaaaaa");
    expect(selected?.issuedAtMs).toBe(Date.parse("2026-07-25T02:00:00.000Z"));
  });

  test("excludes expired, revoked, cross-intent, malformed, and ambiguous issue ids", () => {
    const other = "other-intent-ef567890";
    const activeAudit =
      grantBlock(intentName(), "11111111", "2026-07-25T01:00:00.000Z", "2026-07-25T12:00:00.000Z") +
      grantBlock(intentName(), "22222222", "2026-07-25T01:00:00.000Z", "2026-07-26T12:00:00.000Z") +
      grantBlock(intentName(), "33333333", "2026-07-25T01:00:00.000Z", "2026-07-27T12:00:00.000Z") +
      grantBlock(intentName(), "33333333", "2026-07-25T02:00:00.000Z", "2026-07-27T12:00:00.000Z") +
      grantBlock(intentName(), "44444444", "not-a-time", "2026-07-28T12:00:00.000Z") +
      grantBlock(other, "55555555", "2026-07-25T03:00:00.000Z", "2026-07-29T12:00:00.000Z");
    const revoke = auditBlock("GRANT_REVOKED", "2026-07-25T04:00:00.000Z", {
      "Grant Id": "22222222",
      "Issuer Space": "default",
      "Issuer Intent": other,
      "Issuer Shard": SHARD,
      "Issuer Human Ts": HUMAN_TS,
    });
    const { root, intent } = fixture(activeAudit, [{ intent: other, audit: revoke }]);

    expect(
      findSoloStandingGrant(
        root,
        intent,
        ORDINARY_STAGE,
        STATE,
        GRAPH,
        Date.parse("2026-07-25T12:00:00.000Z"),
      ),
    ).toBeNull();
  });

  test("exact lookup distinguishes not-found, ambiguous, and expected invalidity", () => {
    const { root, intent } = fixture(
      grantBlock(intentName(), "abcdef01", "2026-07-25T01:00:00.000Z", "2026-07-26T00:00:00.000Z") +
        grantBlock(intentName(), "abcdef01", "2026-07-25T02:00:00.000Z", "2026-07-27T00:00:00.000Z") +
        grantBlock(intentName(), "abcdef02", "2026-07-25T03:00:00.000Z", "2026-07-25T04:00:00.000Z"),
    );
    const args = [root, intent, ORDINARY_STAGE, STATE, GRAPH, Date.parse("2026-07-25T12:00:00.000Z")] as const;

    expect(validateSoloStandingGrantById(args[0], args[1], "00000000", args[2], args[3], args[4], args[5]))
      .toEqual({ kind: "invalid", reason: "not-found" });
    expect(validateSoloStandingGrantById(args[0], args[1], "abcdef01", args[2], args[3], args[4], args[5]))
      .toEqual({ kind: "invalid", reason: "ambiguous-id" });
    expect(validateSoloStandingGrantById(args[0], args[1], "abcdef02", args[2], args[3], args[4], args[5]))
      .toEqual({ kind: "invalid", reason: "expired" });
  });

  test("ignores revocations from unregistered and archived intent directories", () => {
    const revoke = auditBlock("GRANT_REVOKED", "2026-07-25T04:00:00.000Z", {
      "Grant Id": "abcdef12",
      "Issuer Space": "default",
      "Issuer Intent": "ignored-intent-12345678",
      "Issuer Shard": SHARD,
      "Issuer Human Ts": HUMAN_TS,
    });
    const { root, intent } = fixture(
      grantBlock(
        intentName(),
        "abcdef12",
        "2026-07-25T01:00:00.000Z",
        "2026-07-26T01:00:00.000Z",
      ),
      [
        {
          intent: "ignored-intent-12345678",
          audit: revoke,
          registered: false,
        },
        {
          intent: "archived-intent-87654321",
          audit: revoke.replaceAll("ignored-intent-12345678", "archived-intent-87654321"),
          status: "archived",
        },
      ],
    );

    expect(
      findSoloStandingGrant(
        root,
        intent,
        ORDINARY_STAGE,
        STATE,
        GRAPH,
        Date.parse("2026-07-25T12:00:00.000Z"),
      )?.grantId,
    ).toBe("abcdef12");
  });
});

function intentName(): string {
  return "solo-intent-abcd1234";
}

describe("authorization selection receipt lookup", () => {
  const routeId = "12345678-1234-4abc-8def-1234567890ab";

  function receipt(
    route = routeId,
    stageSlug = ORDINARY_STAGE,
    grantId = "abcdef12",
  ): string {
    return auditBlock("GATE_AUTHORIZATION_SELECTED", "2026-07-25T05:00:00.000Z", {
      "Route Id": route,
      Stage: stageSlug,
      "Grant Id": grantId,
    });
  }

  test("returns the exact single receipt with its owner intent", () => {
    const { root, intent } = fixture(receipt());
    expect(findStandingGrantRouteReceiptById(root, routeId)).toEqual({
      intent,
      receipt: {
        routeId,
        stage: ORDINARY_STAGE,
        grantId: "abcdef12",
        timestamp: "2026-07-25T05:00:00.000Z",
      },
    });
  });

  test("returns null for absent, malformed, or duplicated receipts", () => {
    const duplicateOwner = "duplicate-intent-12345678";
    const { root } = fixture(receipt(), [{ intent: duplicateOwner, audit: receipt() }]);
    expect(findStandingGrantRouteReceiptById(root, routeId)).toBeNull();
    expect(findStandingGrantRouteReceiptById(root, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"))
      .toBeNull();

    const malformed = fixture(
      receipt("12345678-1234-1abc-8def-1234567890ab") +
        receipt("87654321-4321-4abc-8def-1234567890ab", "", "NOT-HEX"),
    );
    expect(
      findStandingGrantRouteReceiptById(
        malformed.root,
        "12345678-1234-1abc-8def-1234567890ab",
      ),
    ).toBeNull();
    expect(
      findStandingGrantRouteReceiptById(
        malformed.root,
        "87654321-4321-4abc-8def-1234567890ab",
      ),
    ).toBeNull();
  });

  test.each([0, 1, 25])("visits exactly E=%d receipt-ledger events in one pass", (extraEvents) => {
    let audit = receipt();
    for (let index = 0; index < extraEvents; index++) {
      audit += auditBlock("ERROR_LOGGED", "2026-07-25T05:00:00.000Z", {
        Sequence: String(index),
      });
    }
    const { root } = fixture(audit);
    const observer = createStandingGrantTestObserver();

    expect(findStandingGrantRouteReceiptById(root, routeId, observer)).not.toBeNull();

    const counts = observer.snapshot("receipt-lookup");
    expect(counts.shardOpened).toBe(1);
    expect(counts.eventVisited).toBe(2 + extraEvents);
    expect(counts.memoryItemAdded).toBe(1);
    expect(counts.candidateCompared).toBe(0);
  });

  test("rejects a duplicate canonical shard open reported in one pass", () => {
    const observer = createStandingGrantTestObserver();
    observer.shardOpened("receipt-lookup", "/tmp/same-shard.md");
    expect(() =>
      observer.shardOpened("receipt-lookup", "/tmp/same-shard.md")
    ).toThrow(/duplicate canonical shard open/);
  });

  test("does not mix receipts from unregistered or archived directories", () => {
    const { root, intent } = fixture(receipt(), [
      {
        intent: "unregistered-intent-12345678",
        audit: receipt(),
        registered: false,
      },
      {
        intent: "archived-intent-87654321",
        audit: receipt(),
        status: "archived",
      },
    ]);

    expect(findStandingGrantRouteReceiptById(root, routeId)?.intent).toBe(intent);
  });

  test("looks up one receipt across 100 intents and 100,000 events within 5 seconds", () => {
    function errorEvents(count: number): string {
      let audit = "";
      for (let index = 0; index < count; index++) {
        audit += auditBlock("ERROR_LOGGED", "2026-07-25T05:00:00.000Z", {
          Sequence: String(index),
        });
      }
      return audit;
    }

    const extras = Array.from({ length: 99 }, (_, index) => ({
      intent: `performance-intent-${String(index).padStart(8, "0")}`,
      audit: errorEvents(999),
    }));
    const { root } = fixture(receipt() + errorEvents(998), extras);
    const observer = createStandingGrantTestObserver();

    const startedAt = performance.now();
    expect(findStandingGrantRouteReceiptById(root, routeId, observer)).not.toBeNull();
    const elapsedMs = performance.now() - startedAt;

    const counts = observer.snapshot("receipt-lookup");
    expect(counts.shardOpened).toBe(100);
    expect(counts.eventVisited).toBe(100_000);
    expect(elapsedMs).toBeLessThanOrEqual(5_000);
  }, 15_000);
});

// ---------------------------------------------------------------------------
// Scan integrity. The grant scan walks whatever the intent registry names, so a
// corrupt registry row or an unreadable shard must stop the scan loudly instead
// of silently narrowing the ledger it derives authority from.
// ---------------------------------------------------------------------------
describe("standing grant scan integrity", () => {
  const routeId = "12345678-1234-4abc-8def-1234567890ab";

  function receiptAudit(): string {
    return auditBlock("GATE_AUTHORIZATION_SELECTED", "2026-07-25T05:00:00.000Z", {
      "Route Id": routeId,
      Stage: ORDINARY_STAGE,
      "Grant Id": "abcdef12",
    });
  }

  function rewriteRegistry(root: string, rows: Array<Record<string, unknown>>): void {
    writeFileSync(
      join(root, "amadeus", "spaces", "default", "intents", "intents.json"),
      `${JSON.stringify(rows, null, 2)}\n`,
      "utf-8",
    );
  }

  test.each([
    ["a path segment", ".."],
    ["a path separator", "escape/../../etc"],
  ] as const)("refuses a registered intent directory containing %s", (_label, dirName) => {
    const { root } = fixture(receiptAudit());
    rewriteRegistry(root, [
      { uuid: "11111111-1111-4111-8111-111111111111", slug: "solo-intent", dirName, status: "in-flight" },
    ]);
    expect(() => findStandingGrantRouteReceiptById(root, routeId)).toThrow(
      /Invalid registered intent directory/,
    );
  });

  test("refuses a registry that names the same directory twice", () => {
    const { root, intent } = fixture(receiptAudit());
    rewriteRegistry(root, [
      { uuid: "11111111-1111-4111-8111-111111111111", slug: "solo-intent", dirName: intent, status: "in-flight" },
      { uuid: "33333333-3333-4333-8333-333333333333", slug: "clone", dirName: intent, status: "in-flight" },
    ]);
    expect(() => findStandingGrantRouteReceiptById(root, routeId)).toThrow(
      /Duplicate registered intent directory/,
    );
  });

  test("refuses to scan a shard whose path cannot be resolved", () => {
    const { root, intent } = fixture(receiptAudit());
    symlinkSync(
      join(root, "amadeus", "spaces", "default", "intents", intent, "audit", "gone.md"),
      join(root, "amadeus", "spaces", "default", "intents", intent, "audit", "dangling.md"),
    );
    expect(() => findStandingGrantRouteReceiptById(root, routeId)).toThrow(
      /Cannot resolve standing grant audit shard/,
    );
  });

  test("refuses two registered directories that resolve to the same shard file", () => {
    const { root, intent } = fixture(receiptAudit());
    const intents = join(root, "amadeus", "spaces", "default", "intents");
    const alias = "alias-intent-11111111";
    mkdirSync(join(intents, alias), { recursive: true });
    symlinkSync(join(intents, intent, "audit"), join(intents, alias, "audit"));
    rewriteRegistry(root, [
      { uuid: "11111111-1111-4111-8111-111111111111", slug: "solo-intent", dirName: intent, status: "in-flight" },
      { uuid: "33333333-3333-4333-8333-333333333333", slug: "alias", dirName: alias, status: "in-flight" },
    ]);
    expect(() => findStandingGrantRouteReceiptById(root, routeId)).toThrow(
      /duplicate canonical shard open/,
    );
  });
});

// ---------------------------------------------------------------------------
// Exact-id validation rejections that the selection scan cannot reach: a grant
// whose provenance is not in the ledger, and a grant that is live but does not
// cover the requested gate.
// ---------------------------------------------------------------------------
describe("exact grant validation rejections", () => {
  test("rejects a grant whose Issuer Human Ts is not in the ledger", () => {
    const { root, intent } = fixture(
      grantBlock(
        "solo-intent-abcd1234",
        "abcdef12",
        "2026-07-25T01:00:00.000Z",
        "2026-07-26T01:00:00.000Z",
        { "Issuer Human Ts": "2026-07-25T23:59:59.000Z" },
      ),
    );
    expect(
      validateSoloStandingGrantById(
        root, intent, "abcdef12", ORDINARY_STAGE, STATE, GRAPH,
        Date.parse("2026-07-25T02:00:00.000Z"),
      ),
    ).toEqual({ kind: "invalid", reason: "invalid-provenance" });
  });

  test("rejects a live grant that does not cover the requested gate", () => {
    const { root, intent } = fixture(
      grantBlock(
        "solo-intent-abcd1234",
        "abcdef12",
        "2026-07-25T01:00:00.000Z",
        "2026-07-26T01:00:00.000Z",
      ),
    );
    // "Includes Phase Boundary": "false" — nfr-requirements is the last
    // in-scope stage, so its gate crosses a phase boundary the grant excludes.
    expect(
      validateSoloStandingGrantById(
        root, intent, "abcdef12", "nfr-requirements", STATE, GRAPH,
        Date.parse("2026-07-25T02:00:00.000Z"),
      ),
    ).toEqual({ kind: "invalid", reason: "gate-out-of-scope" });
  });
});
