import { describe, expect, test } from "bun:test";
import {
  IdentityDigest,
} from "../../plugins/formal-model-check/tools/tla-evidence.ts";

// U1 C2 pin (business-rules.md BR-U1-06/07/10..13, business-logic-model.md §1..§3).
// Pure layer only: no filesystem, so this stays a unit-size test
// (cid:code-generation:fs-tests-integration-first).

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

describe("IdentityDigest.normalizeStableId", () => {
  test.each(["FR-006", "NFR-002", "AC-003", "ADR-7", "ADR-12"])("accepts %s", (raw) => {
    expect(String(unwrap(IdentityDigest.normalizeStableId(raw)))).toBe(raw);
  });

  test.each(["FR-6", "FR-0006", "cid:code-generation:c1", "ADR-", "FR006", "fr-006", ""])(
    "rejects %p as invalid-grammar",
    (raw) => {
      expect(failure(IdentityDigest.normalizeStableId(raw))).toEqual({
        kind: "invalid-grammar",
        tokens: [raw],
      });
    },
  );
});

describe("IdentityDigest digests", () => {
  const id = unwrap(IdentityDigest.normalizeStableId("FR-006"));
  const other = unwrap(IdentityDigest.normalizeStableId("FR-007"));

  test("content digest is sha256:<hex64>", () => {
    expect(IdentityDigest.contentDigest(id, "body")).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("content digest separates id from body with a 0x00 boundary", () => {
    // "ADR-1" + "2body" and "ADR-12" + "body" concatenate to the same string,
    // so only the separator keeps these digests apart.
    const a = IdentityDigest.contentDigest(unwrap(IdentityDigest.normalizeStableId("ADR-1")), "2body");
    const b = IdentityDigest.contentDigest(unwrap(IdentityDigest.normalizeStableId("ADR-12")), "body");
    expect(a).not.toBe(b);
  });

  test("aggregate digest ignores input order", () => {
    const entries: ReadonlyArray<readonly [typeof id, ReturnType<typeof IdentityDigest.contentDigest>]> = [
      [id, IdentityDigest.contentDigest(id, "a")],
      [other, IdentityDigest.contentDigest(other, "b")],
    ];
    expect(IdentityDigest.aggregateDigest(entries)).toBe(
      IdentityDigest.aggregateDigest([...entries].reverse()),
    );
  });

  test("aggregate digest changes when any member body changes", () => {
    const before = IdentityDigest.aggregateDigest([[id, IdentityDigest.contentDigest(id, "a")]]);
    const after = IdentityDigest.aggregateDigest([[id, IdentityDigest.contentDigest(id, "b")]]);
    expect(after).not.toBe(before);
  });
});

describe("IdentityDigest.compareIdentity", () => {
  const id = unwrap(IdentityDigest.normalizeStableId("FR-006"));
  const recorded = IdentityDigest.aggregateDigest([[id, IdentityDigest.contentDigest(id, "a")]]);
  const current = IdentityDigest.aggregateDigest([[id, IdentityDigest.contentDigest(id, "b")]]);

  test("equal digests are current", () => {
    expect(IdentityDigest.compareIdentity(recorded, recorded)).toEqual({ kind: "current" });
  });

  test("differing digests are stale and carry both sides", () => {
    expect(IdentityDigest.compareIdentity(recorded, current)).toEqual({ kind: "stale", recorded, current });
  });
});

describe("IdentityDigest.extractStableSections", () => {
  const doc = [
    "# Requirements",
    "",
    "### FR-006  \tidentity",
    "",
    "本文 A   ",
    "",
    "内部空行を保持する",
    "",
    "### FR-007",
    "本文 B\r",
    "",
    "## その他",
    "無関係",
  ].join("\n");

  test("extracts heading-driven sections with canonical bodies", () => {
    const sections = unwrap(IdentityDigest.extractStableSections(doc, "requirements"));
    expect(sections.map((s) => String(s.id))).toEqual(["FR-006", "FR-007"]);
    expect(sections[0]?.canonicalBody).toBe("本文 A\n\n内部空行を保持する");
    expect(sections[1]?.canonicalBody).toBe("本文 B");
  });

  test("extracts ADR sections from the decisions grammar", () => {
    const decisions = ["## ADR-1 タイトル", "決定", "", "## ADR-12", "別の決定"].join("\n");
    const sections = unwrap(IdentityDigest.extractStableSections(decisions, "decisions"));
    expect(sections.map((s) => String(s.id))).toEqual(["ADR-1", "ADR-12"]);
  });

  test("accepts the colon and em-dash title suffixes used by real records", () => {
    const decisions = ["## ADR-1: タイトル", "決定", "", "## ADR-2 — 別タイトル", "別の決定"].join("\n");
    const sections = unwrap(IdentityDigest.extractStableSections(decisions, "decisions"));
    expect(sections.map((s) => String(s.id))).toEqual(["ADR-1", "ADR-2"]);

    const requirements = ["### FR-006: 適用判定", "本文"].join("\n");
    const reqSections = unwrap(IdentityDigest.extractStableSections(requirements, "requirements"));
    expect(reqSections.map((s) => String(s.id))).toEqual(["FR-006"]);
  });

  test("ignores headings inside fenced code blocks", () => {
    const doc = [
      "```",
      "### FR-006 フェンス内の例",
      "```",
      "### FR-007",
      "本文",
    ].join("\n");
    const sections = unwrap(IdentityDigest.extractStableSections(doc, "requirements"));
    expect(sections.map((s) => String(s.id))).toEqual(["FR-007"]);
  });

  // Revised with FR-2 of #2766 (user-ruled grammar widening, Q1=A): a digit run
  // of any length is a valid id under the corpus grammar, so FR-0061 now
  // extracts; a non-digit suffix still breaks the word boundary and never
  // matches.
  test("accepts any digit-run length but not a non-digit suffix", () => {
    const requirements = ["### FR-0061 過剰桁", "本文", "", "### FR-006x 接尾辞", "本文2"].join("\n");
    const sections = unwrap(IdentityDigest.extractStableSections(requirements, "requirements"));
    expect(sections.map((s) => String(s.id))).toEqual(["FR-0061"]);
  });

  test("rejects duplicate ids, enumerating every duplicate", () => {
    const duplicated = ["### FR-006", "a", "### FR-007", "b", "### FR-006", "c", "### FR-007", "d"].join("\n");
    expect(failure(IdentityDigest.extractStableSections(duplicated, "requirements"))).toEqual({
      kind: "duplicate-id",
      ids: ["FR-006", "FR-007"],
    });
  });

  test("rejects a section whose canonical body is empty", () => {
    const hollow = ["### FR-006", "   ", "", "### FR-007", "b"].join("\n");
    expect(failure(IdentityDigest.extractStableSections(hollow, "requirements"))).toEqual({
      kind: "invalid-grammar",
      tokens: ["FR-006"],
    });
  });

  test("normalization is insensitive to CRLF and trailing whitespace", () => {
    const crlf = "### FR-006\r\n本文 A\t\r\n\r\n";
    const lf = "### FR-006\n本文 A\n";
    const a = unwrap(IdentityDigest.extractStableSections(crlf, "requirements"));
    const b = unwrap(IdentityDigest.extractStableSections(lf, "requirements"));
    expect(a[0]?.canonicalBody).toBe(b[0]?.canonicalBody);
  });
});

describe("IdentityDigest.resolveDeclaredIds", () => {
  const doc = ["### FR-006", "a", "### FR-007", "b"].join("\n");

  test("passes when every declared id is present", () => {
    const sections = unwrap(IdentityDigest.extractStableSections(doc, "requirements"));
    expect(unwrap(IdentityDigest.resolveDeclaredIds(sections, ["FR-006"])).map((s) => String(s.id))).toEqual(["FR-006"]);
  });

  test("rejects declared ids that the document does not resolve, enumerating all", () => {
    const sections = unwrap(IdentityDigest.extractStableSections(doc, "requirements"));
    expect(failure(IdentityDigest.resolveDeclaredIds(sections, ["FR-006", "FR-008", "AC-001"]))).toEqual({
      kind: "unresolvable-id",
      ids: ["FR-008", "AC-001"],
    });
  });
});
