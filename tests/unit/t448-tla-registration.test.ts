import { describe, expect, test } from "bun:test";
import { parseTlaModelMap } from "../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";

// U4 C6 pin (business-rules.md BR-U4-01..18, business-logic-model.md §1/§2).
// Pure layer only: no filesystem, so this stays a unit-size test
// (cid:code-generation:fs-tests-integration-first).

const MODEL_IDENTITY = "a".repeat(64);
const CFG_IDENTITY = "b".repeat(64);
const IMPL_SHA = "c".repeat(64);
const BUNDLE_DIGEST = `sha256:${"d".repeat(64)}`;

function modelEntry(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name,
    model: { path: `specs/tla/${name}.tla`, identity: MODEL_IDENTITY },
    cfg: { path: `specs/tla/${name}.cfg`, identity: CFG_IDENTITY },
    entries: [{ implPath: "packages/framework/core/tools/amadeus-election.ts", sha256: IMPL_SHA }],
    ...extra,
  };
}

function mapBytes(models: readonly Record<string, unknown>[]): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ schemaVersion: 2, models }, null, 2));
}

describe("model-map validator: optional evidenceBundle key (Q1 ruling A)", () => {
  test("accepts an entry carrying an evidenceBundle reference", () => {
    const parsed = parseTlaModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST } })]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.models[0]?.evidenceBundle).toEqual({ digest: BUNDLE_DIGEST });
  });

  test("still accepts an entry without evidenceBundle (existing four key sets)", () => {
    const parsed = parseTlaModelMap(mapBytes([modelEntry("Sample")]));
    expect(parsed.ok).toBe(true);
  });

  test("rejects a malformed evidenceBundle digest", () => {
    const parsed = parseTlaModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: "sha256:xyz" } })]));
    expect(parsed.ok).toBe(false);
  });

  test("rejects extra keys inside evidenceBundle (exactObject semantics unchanged)", () => {
    const parsed = parseTlaModelMap(
      mapBytes([modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST, note: "x" } })]),
    );
    expect(parsed.ok).toBe(false);
  });
});
