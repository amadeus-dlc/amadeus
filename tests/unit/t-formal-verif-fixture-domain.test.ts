import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import { createDefectUniverse, denominatorReceiptIdentity } from "../../scripts/formal-verif/fixture-registry-domain.ts";

const sha = (digit: string) => digit.repeat(64);

function row(index: number) {
  return {
    defectId: `D${index}`,
    predicateId: `P${index}`,
    sourceRefs: [`issues/${1250 + index}`],
    fixCommit: sha(String(index)),
    baselineSha: sha("a"),
    targetRegression: `target-${index}`,
    nonTargetRegressions: [`other-${index}`],
    patchIdentity: sha("b"),
    allowedHunks: [{ path: `src/f${index}.ts`, oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, hunkHash: sha("c") }],
    affectedPaths: [`src/f${index}.ts`],
    rootCluster: `R${Math.min(index, 5)}`,
    proofIdentity: sha("123456789abcdef"[index]!),
  };
}

function fiveClusterUniverse() {
  const rows = Array.from({ length: 7 }, (_, index) => row(index + 1));
  const rootMappings = rows.map(({ defectId, rootCluster }) => ({ defectId, rootCluster }));
  const mappingIdentity = canonicalIdentity(rootMappings, "amadeus.formal-verif.root-mapping.v1").sha256;
  const receiptBody = { dCount: 5 as const, mappingIdentity, requirementsIdentity: sha("e"), matrixIdentity: sha("f") };
  return {
    kind: "FIVE_ROOT_CLUSTERS",
    revisionId: "revision-5",
    baselineSha: sha("a"),
    rows,
    rootMappings,
    representativeProofs: [1, 2, 3, 4, 5].map((index) => ({ rootCluster: `R${index}`, proofIdentity: rows.find((item) => item.rootCluster === `R${index}`)!.proofIdentity })),
    denominatorReceipt: { ...receiptBody, receiptIdentity: denominatorReceiptIdentity(receiptBody) },
  };
}

describe("formal verification sealed fixture domain", () => {
  test("accepts exactly seven independently proven predicates", () => {
    const result = createDefectUniverse({
      kind: "SEVEN_PREDICATES",
      revisionId: "revision-7",
      baselineSha: sha("a"),
      rows: Array.from({ length: 7 }, (_, index) => row(index + 1)),
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.dCount).toBe(7);
    expect(result.ok && result.value.universeIdentity).toMatch(/^[0-9a-f]{64}$/);
  });

  test("accepts a total seven-candidate mapping to exactly five proven roots", () => {
    const result = createDefectUniverse(fiveClusterUniverse());
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.dCount).toBe(5);
  });

  test("rejects a representative proof unrelated to every row in its root cluster", () => {
    const value = fiveClusterUniverse();
    value.representativeProofs[0] = { ...value.representativeProofs[0]!, proofIdentity: sha("0") };
    expect(createDefectUniverse(value).ok).toBe(false);
  });

  test.each([6, 8])("rejects a %i-row denominator", (count) => {
    const value = { kind: "SEVEN_PREDICATES", revisionId: "wrong", baselineSha: sha("a"), rows: Array.from({ length: count }, (_, index) => row(index + 1)) };
    expect(createDefectUniverse(value).ok).toBe(false);
  });

  test("rejects duplicate predicate and proof identities", () => {
    const rows = Array.from({ length: 7 }, (_, index) => row(index + 1));
    rows[1] = { ...rows[1]!, predicateId: rows[0]!.predicateId };
    expect(createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "duplicate", baselineSha: sha("a"), rows }).ok).toBe(false);
    rows[1] = { ...row(2), proofIdentity: rows[0]!.proofIdentity };
    expect(createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "duplicate", baselineSha: sha("a"), rows }).ok).toBe(false);
  });

  test("rejects partial root mapping and denominator receipt drift", () => {
    const partial = fiveClusterUniverse();
    partial.rootMappings = partial.rootMappings.slice(1);
    expect(createDefectUniverse(partial).ok).toBe(false);
    const drift = fiveClusterUniverse();
    drift.denominatorReceipt = { ...drift.denominatorReceipt, matrixIdentity: sha("0") };
    expect(createDefectUniverse(drift).ok).toBe(false);
  });

  test("rejects missing proof and unknown identity fields", () => {
    const rows = Array.from({ length: 7 }, (_, index) => row(index + 1));
    const missing = { ...rows[0] } as Record<string, unknown>;
    delete missing.proofIdentity;
    rows[0] = missing as ReturnType<typeof row>;
    expect(createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "missing", baselineSha: sha("a"), rows }).ok).toBe(false);
    expect(createDefectUniverse({ ...fiveClusterUniverse(), universeIdentity: sha("0") }).ok).toBe(false);
  });
});
