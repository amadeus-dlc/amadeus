// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: small
//
// U1 seam-bridge — the pure frontmatter seam bridge: parseStageFrontmatter
// (bytes -> StageFrontmatterDocument, parse-don't-validate smart constructor)
// and serializeStageFrontmatterSeams (document + seams -> bytes, produces-only
// rewrite with byte preservation everywhere else). Both are pure over byte
// fixtures, so they belong in the unit tier (fs-tests-integration-first); the
// real-stage corpus sweep and the compose end-to-end live in t445.
//
// Falling/passing evidence: a sensors-seam rewrite request is rejected with
// unsupported-target-seam (BR-U1-4, the falling proof of the minimal accepted
// set), an entry that cannot survive a re-parse is rejected with
// roundtrip-mismatch (BR-U1-3), and an unchanged rewrite is byte-identical to
// the original document (BR-U1-1).

import { describe, expect, test } from "bun:test";
import {
  parseStageFrontmatter,
  serializeStageFrontmatterSeams,
  type StageFrontmatterDocument,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";

// A stage document in the real shape: block-list produces/sensors, the
// `- artifact:` object list for consumes, no required_sections, and a body.
const REAL_STAGE = [
  "---",
  "slug: code-generation",
  "phase: construction",
  "produces:",
  "  - code-generation-plan",
  "  - code-summary",
  "consumes:",
  "  - artifact: business-rules",
  "    required: false",
  "  - artifact: requirements",
  "    required: true",
  "sensors:",
  "  - linter",
  "  - type-check",
  "---",
  "",
  "# Code Generation",
  "",
  "Body text with a `produces:` mention that must never be touched.",
  "",
].join("\n");

// The empty flow form the initialization stages use.
const FLOW_STAGE = ["---", "slug: state-init", "produces: []", "consumes: []", "sensors: []", "---", "", "# State Init", ""].join("\n");

function parseOk(text: string): StageFrontmatterDocument {
  const parsed = parseStageFrontmatter(Buffer.from(text, "utf-8"));
  if (!parsed.ok) throw new Error(`expected a parseable stage document, got ${parsed.error.kind}`);
  return parsed.value;
}

describe("t444 parseStageFrontmatter (pure)", () => {
  test("reads slug, all four seams and keeps the original bytes", () => {
    const doc = parseOk(REAL_STAGE);
    expect(doc.slug).toBe("code-generation");
    expect(doc.seams.produces).toEqual(["code-generation-plan", "code-summary"]);
    // A consumes entry is its artifact slug; the nested `required:` lines stay
    // inside the span and out of the entry list.
    expect(doc.seams.consumes).toEqual(["business-rules", "requirements"]);
    expect(doc.seams.sensors).toEqual(["linter", "type-check"]);
    expect(doc.seams.required_sections).toEqual([]);
    expect(doc.raw.toString("utf-8")).toBe(REAL_STAGE);
    expect(doc.seamSpans.produces?.style).toBe("block-list");
    expect(doc.seamSpans.required_sections).toBeNull();
  });

  test("bounds the produces span to its own key and item lines", () => {
    const doc = parseOk(REAL_STAGE);
    const span = doc.seamSpans.produces;
    expect(span).not.toBeNull();
    if (span === null) return;
    expect(doc.raw.subarray(span.start, span.end).toString("utf-8")).toBe(
      "produces:\n  - code-generation-plan\n  - code-summary",
    );
  });

  test("reads the single-line flow form", () => {
    const doc = parseOk(FLOW_STAGE);
    expect(doc.seams.produces).toEqual([]);
    expect(doc.seamSpans.produces?.style).toBe("flow-empty");
  });

  test("rejects a document without frontmatter", () => {
    const parsed = parseStageFrontmatter(Buffer.from("# Just markdown\n", "utf-8"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.kind).toBe("no-frontmatter");
  });

  test("rejects frontmatter without a slug", () => {
    const parsed = parseStageFrontmatter(Buffer.from("---\nname: agent\nproduces: []\n---\n", "utf-8"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.kind).toBe("no-slug");
  });

  test("rejects an ambiguous seam value (neither block list nor flow list)", () => {
    const parsed = parseStageFrontmatter(Buffer.from("---\nslug: s\nproduces: plain-scalar\n---\n", "utf-8"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toEqual({ kind: "seam-span-ambiguous", seam: "produces" });
  });

  test("rejects a block-list key with no item lines", () => {
    const parsed = parseStageFrontmatter(Buffer.from("---\nslug: s\nproduces:\nphase: construction\n---\n", "utf-8"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toEqual({ kind: "seam-span-ambiguous", seam: "produces" });
  });
});

describe("t444 serializeStageFrontmatterSeams (pure)", () => {
  test("an unchanged rewrite is byte-identical (BR-U1-1)", () => {
    const doc = parseOk(REAL_STAGE);
    const out = serializeStageFrontmatterSeams(doc, doc.seams);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.equals(doc.raw)).toBe(true);
  });

  test("appending to produces leaves every other byte unchanged (BR-U1-2)", () => {
    const doc = parseOk(REAL_STAGE);
    const out = serializeStageFrontmatterSeams(doc, {
      ...doc.seams,
      produces: [...doc.seams.produces, "pr-convergence-report"],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const text = out.value.toString("utf-8");
    expect(text).toBe(REAL_STAGE.replace("  - code-summary\n", "  - code-summary\n  - pr-convergence-report\n"));
    const back = parseOk(text);
    expect(back.seams.produces).toEqual(["code-generation-plan", "code-summary", "pr-convergence-report"]);
    expect(back.seams.consumes).toEqual(doc.seams.consumes);
    expect(back.seams.sensors).toEqual(doc.seams.sensors);
  });

  test("rewriting produces back to the base restores the original bytes (BR-U1-9)", () => {
    const doc = parseOk(REAL_STAGE);
    const composed = serializeStageFrontmatterSeams(doc, {
      ...doc.seams,
      produces: [...doc.seams.produces, "pr-convergence-report"],
    });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const composedDoc = parseOk(composed.value.toString("utf-8"));
    const dropped = serializeStageFrontmatterSeams(composedDoc, { ...composedDoc.seams, produces: doc.seams.produces });
    expect(dropped.ok).toBe(true);
    if (!dropped.ok) return;
    expect(dropped.value.equals(doc.raw)).toBe(true);
  });

  test("the flow form converts to a block list and back byte-identically", () => {
    const doc = parseOk(FLOW_STAGE);
    const composed = serializeStageFrontmatterSeams(doc, { ...doc.seams, produces: ["pr-convergence-report"] });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.value.toString("utf-8")).toBe(FLOW_STAGE.replace("produces: []", "produces:\n  - pr-convergence-report"));
    const composedDoc = parseOk(composed.value.toString("utf-8"));
    const dropped = serializeStageFrontmatterSeams(composedDoc, { ...composedDoc.seams, produces: [] });
    expect(dropped.ok).toBe(true);
    if (!dropped.ok) return;
    expect(dropped.value.equals(doc.raw)).toBe(true);
  });

  test("rejects a rewrite of any seam other than produces (BR-U1-4)", () => {
    const doc = parseOk(REAL_STAGE);
    const out = serializeStageFrontmatterSeams(doc, { ...doc.seams, sensors: [...doc.seams.sensors, "answer-evidence"] });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toEqual({ kind: "unsupported-target-seam", seam: "sensors" });
  });

  test("rejects an entry that cannot survive the re-parse check (BR-U1-3)", () => {
    const doc = parseOk(REAL_STAGE);
    const out = serializeStageFrontmatterSeams(doc, { ...doc.seams, produces: [...doc.seams.produces, "broken\n---\nslug: x"] });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error.kind).toBe("roundtrip-mismatch");
  });
});
