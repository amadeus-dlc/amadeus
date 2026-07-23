// t239 — U4 election-transport pure/type-face tests (Bolt 3 io-record-transport).
// Layer: unit (no fs, no spawn — the real transports touch fs/spawn and are
// covered by t240 integration; fs-tests-integration-first).
import { describe, expect, test } from "bun:test";
import {
  buildNotificationBody,
  buildShortNotification,
  type DeliveryOutcome,
  type DeliveryRecord,
  distribute,
  reportDelivery,
  type ShortNotification,
  type VoterId,
  type VoterTransport,
  normalizeAt,
} from "../../packages/framework/core/tools/amadeus-election-transport";

describe("BR-T1 — ShortNotification is structurally blind", () => {
  test("built payload carries only electionId + viewPath (key-set assert)", () => {
    // Falling proof: adding a question/choice field to buildShortNotification
    // makes this key-set assert go red, then revert (design BR-T1).
    const payload = buildShortNotification("E-T1", "/tmp/view.json");
    expect(Object.keys(payload).sort()).toEqual(["electionId", "viewPath"]);
    expect(payload).toEqual({ electionId: "E-T1", viewPath: "/tmp/view.json" });
  });

  test("notification body never leaks question/choice text (only id + path)", () => {
    const body = buildNotificationBody({ electionId: "E-T1", viewPath: "/tmp/view.json" });
    expect(body).toContain("E-T1");
    expect(body).toContain("/tmp/view.json");
  });

  test("@ts-expect-error — ShortNotification rejects a question field", () => {
    // @ts-expect-error question is not a ShortNotification field (BR-T1 type face)
    const bad: ShortNotification = { electionId: "E-T1", viewPath: "/v", question: "leak" };
    void bad;
  });
});

describe("BR-T2 — DeliveryRecord construction is factory-only", () => {
  test("reportDelivery mints a subagent record single-stage (reported-by-conductor)", () => {
    const record = reportDelivery("alice", "2026-07-19T00:00:00Z");
    expect(record.voter).toBe("alice");
    expect(record.at).toBe("2026-07-19T00:00:00Z");
    expect(record.transport).toBe("subagent");
    expect(record.provenance).toBe("reported-by-conductor");
    // No stray runtime keys — the phantom brand never materialises.
    expect(Object.keys(record).sort()).toEqual(["at", "provenance", "transport", "voter"]);
  });

  test("@ts-expect-error — an external DeliveryRecord literal cannot be built", () => {
    // The brand key is module-private, so no outside literal satisfies the type.
    // @ts-expect-error missing module-private brand (BR-T2 generation-origin type constraint)
    const forged: DeliveryRecord = {
      voter: "mallory",
      at: "2026-07-19T00:00:00Z",
      transport: "agmsg",
      provenance: "spawn-exit",
    };
    void forged;
  });
});

// A fake transport implements the port on the test side (no production test
// branch — construction guardrail). It exercises the DeliveryOutcome union
// value+type without touching fs/spawn.
function fakeDirectiveTransport(voters: ReadonlySet<VoterId>): VoterTransport {
  return {
    notify(voter, payload) {
      if (!voters.has(voter)) return { ok: false, error: "voter-unknown" };
      return {
        ok: true,
        value: {
          kind: "directive",
          directive: { voter, viewPath: payload.viewPath, spawnInstruction: "spawn" },
        },
      };
    },
  };
}

describe("port + DeliveryOutcome union", () => {
  test("directive outcome carries no record; discriminant narrows the union", () => {
    const transport = fakeDirectiveTransport(new Set(["alice"]));
    const res = transport.notify("alice", buildShortNotification("E-T1", "/v"));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    const outcome: DeliveryOutcome = res.value;
    expect(outcome.kind).toBe("directive");
    if (outcome.kind !== "directive") throw new Error("expected directive");
    expect(outcome.directive.voter).toBe("alice");
    // A directive branch has no `record` member — asserted structurally.
    expect(Object.keys(outcome).sort()).toEqual(["directive", "kind"]);
  });

  test("unknown voter is rejected fail-closed", () => {
    const transport = fakeDirectiveTransport(new Set(["alice"]));
    const res = transport.notify("bob", buildShortNotification("E-T1", "/v"));
    expect(res).toEqual({ ok: false, error: "voter-unknown" });
  });
});

describe("distribute — per-voter results over the voter set", () => {
  test("each voter gets its own view path and an independent result", () => {
    const transport = fakeDirectiveTransport(new Set(["alice", "bob"]));
    const results = distribute(transport, "E-T1", ["alice", "bob"], (v) => `/views/${v}.json`);
    expect(results.map((r) => r.voter)).toEqual(["alice", "bob"]);
    for (const r of results) {
      expect(r.result.ok).toBe(true);
      if (!r.result.ok) throw new Error("expected ok");
      if (r.result.value.kind !== "directive") throw new Error("expected directive");
      expect(r.result.value.directive.viewPath).toBe(`/views/${r.voter}.json`);
    }
  });

  test("partial: an unknown voter yields a fail-closed entry beside delivered ones", () => {
    const transport = fakeDirectiveTransport(new Set(["alice"]));
    const results = distribute(transport, "E-T1", ["alice", "ghost"], (v) => `/views/${v}.json`);
    expect(results[0].result.ok).toBe(true);
    expect(results[1].result).toEqual({ ok: false, error: "voter-unknown" });
  });
});

describe("t239 timestamp contract (PR #1231 minor 3)", () => {
  test("normalizeAt pins seconds-precision ISO-8601 UTC at the mint funnel", () => {
    expect(normalizeAt("2026-07-19T00:01:00.123Z")).toBe("2026-07-19T00:01:00Z");
    expect(normalizeAt("2026-07-19T09:01:00+09:00")).toBe("2026-07-19T00:01:00Z");
    expect(normalizeAt("2026-07-19T00:01:00Z")).toBe("2026-07-19T00:01:00Z");
    expect(normalizeAt("not-a-date")).toBe("not-a-date"); // unparseable stays visible
  });
});
