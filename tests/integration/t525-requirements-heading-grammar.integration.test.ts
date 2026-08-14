import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IdentityDigest } from "../../plugins/formal-model-check/tools/tla-evidence.ts";

// FR-2 (#2766): the requirements heading grammar has to match the corpus this
// repository actually writes. Before the widening only the zero-padded three
// digit form was extractable, so 131 of 134 intent requirements documents
// resolved to `unresolvable-id` and the authoring hold could never govern them.

const REPO_ROOT = join(import.meta.dir, "..", "..");
const MODEL_MAP = join(REPO_ROOT, "amadeus", "spaces", "default", "specs", "tla", "model-map.json");

function ids(markdown: string): readonly string[] {
  const sections = IdentityDigest.extractStableSections(markdown, "requirements");
  if (!sections.ok) throw new Error(`extraction failed: ${JSON.stringify(sections.error)}`);
  return sections.value.map((section) => section.id as string);
}

describe("t525 requirements heading grammar", () => {
  test("the corpus heading forms extract instead of failing as unresolvable ids", () => {
    const corpus = [
      "### FR-1",
      "the plain corpus form",
      "",
      "### NFR-1",
      "the non-functional form",
      "",
      "### AC-1",
      "the acceptance form",
      "",
      "### FR-CROSS-1",
      "the qualified form",
      "",
      "### FR-1-1: a titled sub requirement",
      "the nested numbering form",
      "",
      "### FR-001",
      "the zero padded form the grammar already accepted",
      "",
    ].join("\n");
    expect(ids(corpus)).toEqual(["FR-1", "NFR-1", "AC-1", "FR-CROSS-1", "FR-1-1", "FR-001"]);
  });

  test("every extracted corpus form is also accepted as an explicit trace subject", () => {
    for (const id of ["FR-1", "NFR-1", "AC-1", "FR-CROSS-1", "FR-1-1", "FR-001"]) {
      const normalized = IdentityDigest.normalizeStableId(id);
      expect(normalized.ok).toBe(true);
      if (!normalized.ok) continue;
      expect(String(normalized.value)).toBe(id);
    }
  });

  test("a heading that ends in no digit stays outside the grammar", () => {
    const corpus = ["### FR-NA", "no digit terminates this id", "", "### FR-2", "kept", ""].join("\n");
    expect(ids(corpus)).toEqual(["FR-2"]);
  });

  test("the zero padded ids keep their content digests", () => {
    const sections = IdentityDigest.extractStableSections("### FR-001\ngoverned body\n", "requirements");
    expect(sections.ok).toBe(true);
    if (!sections.ok) return;
    expect(IdentityDigest.contentDigest(sections.value[0]?.id as never, "governed body")).toBe(
      "sha256:c62a967e98d92c12832567e214617b2b207ca22fefb99a577327ca83d917424f" as never,
    );
  });

  test("no registered model records evidence the widened grammar could invalidate", () => {
    const map = JSON.parse(readFileSync(MODEL_MAP, "utf8")) as {
      models: ReadonlyArray<Record<string, unknown>>;
    };
    expect(map.models.length).toBe(4);
    // Only evidence minted under the *old* grammar could be invalidated by the
    // widening. BoltPrAttestationGate and PrConvergenceGate were authored and
    // registered afterwards, so their bundles are bound to identities the widened grammar already produced.
    // Every other model must still carry none.
    const withEvidence = map.models.filter((model) => model.evidenceBundle !== undefined);
    expect(withEvidence.map((model) => model.name)).toEqual(["BoltPrAttestationGate", "PrConvergenceGate"]);
  });
});
