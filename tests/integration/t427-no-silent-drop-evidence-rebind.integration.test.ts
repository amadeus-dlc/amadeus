// covers: function:buildReboundBundle, function:applyReboundBundle, function:evidenceDigestForEntry, cli:no-silent-drop-evidence
import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyReboundBundle,
  buildReboundBundle,
  EVIDENCE_BUNDLE_PATHS,
  EVIDENCE_MANIFEST_PATH,
  EVIDENCE_REGISTRY_PATH,
  EVIDENCE_RUNS_PATH,
  errorEnvelope,
  successEnvelope,
} from "../no-silent-drop/evidence-rebind.ts";
import { validateEvidenceRegistry } from "../no-silent-drop/repository-adoption.ts";
import {
  evidenceMain,
  evidenceExitCode,
  parseEvidenceCommand,
  runEvidenceCommand,
  serializeEvidenceEnvelope,
} from "../../scripts/no-silent-drop-evidence.ts";

const ROOT = join(import.meta.dir, "../..");
const TARGET = "a".repeat(40);
const tempRoots: string[] = [];

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-evidence-rebind-unit-"));
  tempRoots.push(root);
  mkdirSync(join(root, "tests"), { recursive: true });
  cpSync(join(ROOT, "tests", "no-silent-drop"), join(root, "tests", "no-silent-drop"), { recursive: true });
  return root;
}

function readJson(root: string, path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as Record<string, unknown>;
}

function writeJson(root: string, path: string, value: unknown): void {
  writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("t427 deterministic no-silent-drop evidence rebind", () => {
  test("enumerates the complete schema population and produces only the three derived files", () => {
    const bundle = buildReboundBundle(fixture(), TARGET);
    expect(bundle.changed).toBeTrue();
    expect(bundle.counts).toEqual({
      registryRevisions: 24,
      manifestRevisions: 24,
      runRevisions: 25,
      artifactDigests: 25,
      receiptDigests: 23,
    });
    expect(bundle.paths).toEqual([...EVIDENCE_BUNDLE_PATHS]);
  });

  test("closes the three-layer fixed point with the canonical validator", () => {
    const root = fixture();
    const bundle = buildReboundBundle(root, TARGET);
    applyReboundBundle(root, bundle);
    const registry = readJson(root, EVIDENCE_REGISTRY_PATH);
    expect(validateEvidenceRegistry(registry, TARGET, root)).toEqual({ ok: true });
    const manifest = readJson(root, EVIDENCE_MANIFEST_PATH);
    const runs = readJson(root, EVIDENCE_RUNS_PATH);
    expect(manifest.testedRevision).toBe(TARGET);
    expect((manifest.evidence as Array<{ testedRevision: string }>).every((entry) => entry.testedRevision === TARGET)).toBeTrue();
    expect((runs.runs as Array<{ testedRevision: string }>).every((run) => run.testedRevision === TARGET)).toBeTrue();
  });

  test("is byte-identical and reports no-op on a second run", () => {
    const root = fixture();
    applyReboundBundle(root, buildReboundBundle(root, TARGET));
    const before = EVIDENCE_BUNDLE_PATHS.map((path) => readFileSync(join(root, path)));
    const second = buildReboundBundle(root, TARGET);
    expect(second.changed).toBeFalse();
    expect(second.counts).toEqual({
      registryRevisions: 0,
      manifestRevisions: 0,
      runRevisions: 0,
      artifactDigests: 0,
      receiptDigests: 0,
    });
    expect(EVIDENCE_BUNDLE_PATHS.map((path) => readFileSync(join(root, path)))).toEqual(before);
  });

  test("rejects revision-only tampering", () => {
    const root = fixture();
    const registry = readJson(root, EVIDENCE_REGISTRY_PATH);
    registry.currentRevision = TARGET;
    writeJson(root, EVIDENCE_REGISTRY_PATH, registry);
    expect(() => buildReboundBundle(root, TARGET)).toThrow("source evidence bundle is invalid");
  });

  test("rejects artifact-byte tampering", () => {
    const root = fixture();
    writeFileSync(join(root, EVIDENCE_RUNS_PATH), Buffer.concat([readFileSync(join(root, EVIDENCE_RUNS_PATH)), Buffer.from(" ")]));
    expect(() => buildReboundBundle(root, TARGET)).toThrow("source evidence bundle is invalid");
  });

  test("rejects manifest-digest tampering", () => {
    const root = fixture();
    const manifest = readJson(root, EVIDENCE_MANIFEST_PATH);
    const first = (manifest.evidence as Array<{ runs: Array<{ artifact: { sha256: string } }> }>)[0];
    if (first === undefined) throw new Error("fixture has no evidence");
    first.runs[0]!.artifact.sha256 = "b".repeat(64);
    writeJson(root, EVIDENCE_MANIFEST_PATH, manifest);
    expect(() => buildReboundBundle(root, TARGET)).toThrow("source evidence bundle is invalid");
  });

  test("rejects receipt-digest tampering", () => {
    const root = fixture();
    const registry = readJson(root, EVIDENCE_REGISTRY_PATH);
    const first = (registry.receipts as Array<{ evidenceDigest: string }>)[0];
    if (first === undefined) throw new Error("fixture has no receipt");
    first.evidenceDigest = "c".repeat(64);
    writeJson(root, EVIDENCE_REGISTRY_PATH, registry);
    expect(() => buildReboundBundle(root, TARGET)).toThrow("source evidence bundle is invalid");
  });

  test("rejects malformed schema and missing artifacts", () => {
    const malformed = fixture();
    writeFileSync(join(malformed, EVIDENCE_MANIFEST_PATH), "[]\n");
    expect(() => buildReboundBundle(malformed, TARGET)).toThrow();

    const missing = fixture();
    rmSync(join(missing, EVIDENCE_RUNS_PATH));
    expect(() => buildReboundBundle(missing, TARGET)).toThrow(EVIDENCE_RUNS_PATH);
  });

  test("rolls back files already swapped when a later bundle path cannot be committed", () => {
    const root = fixture();
    const bundle = buildReboundBundle(root, TARGET);
    const manifestBefore = readFileSync(join(root, EVIDENCE_MANIFEST_PATH));
    const runsBefore = readFileSync(join(root, EVIDENCE_RUNS_PATH));
    rmSync(join(root, EVIDENCE_REGISTRY_PATH));
    expect(() => applyReboundBundle(root, bundle)).toThrow("bundle write failed");
    expect(readFileSync(join(root, EVIDENCE_MANIFEST_PATH))).toEqual(manifestBefore);
    expect(readFileSync(join(root, EVIDENCE_RUNS_PATH))).toEqual(runsBefore);
  });

  test("validates CLI options without accepting ancestors or abbreviated SHAs", () => {
    expect(parseEvidenceCommand(["rebind", "--target-revision", TARGET])).toEqual({
      operation: "rebind",
      targetRevision: TARGET,
    });
    expect(() => parseEvidenceCommand(["rebind", "--target-revision", "abc123"])).toThrow();
    expect(() => parseEvidenceCommand(["rebind", "--target-revision", TARGET, "--target-revision", TARGET])).toThrow();
    expect(() => parseEvidenceCommand(["rebind", "--target-revision"])).toThrow();
    expect(() => parseEvidenceCommand(["reconcile", "--event-revision", TARGET, "--repository", "invalid"])).toThrow();
    expect(() => parseEvidenceCommand(["unknown"])).toThrow();
    expect(runEvidenceCommand(["unknown"])).toMatchObject({ status: "error", code: "REBIND_INPUT_INVALID" });
  });

  test("drives the exported CLI main in-process", () => {
    let output = "";
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      expect(evidenceMain(["unknown"])).toBe(1);
    } finally {
      process.stdout.write = originalWrite;
    }
    expect(output.endsWith("\n")).toBeTrue();
    expect(JSON.parse(output)).toMatchObject({ status: "error", code: "REBIND_INPUT_INVALID" });
  });

  test("keeps every envelope field and status invariant", () => {
    const secret = "test-secret-value-that-must-not-escape";
    const previousSecret = process.env.AMADEUS_TEST_PRIVATE_KEY;
    process.env.AMADEUS_TEST_PRIVATE_KEY = secret;
    try {
      const success = successEnvelope({ status: "changed", code: "REBIND_OK", targetRevision: TARGET });
      const noop = successEnvelope({ status: "no-op", code: "REBIND_NOOP" });
      const superseded = successEnvelope({ status: "superseded", code: "REBIND_SUPERSEDED" });
      const error = errorEnvelope(new Error(`credential ${secret}`));
      const envelopes = [success, noop, superseded, error];
      const keys = Object.keys(success).sort();
      for (const envelope of envelopes) {
        expect(Object.keys(envelope).sort()).toEqual(keys);
        expect(envelope.schemaVersion).toBe(1);
        expect(typeof envelope.operation).toBe("string");
        expect(typeof envelope.status).toBe("string");
        expect(typeof envelope.code).toBe("string");
        expect(envelope.eventRevision === null || typeof envelope.eventRevision === "string").toBeTrue();
        expect(envelope.bindingRevision === null || typeof envelope.bindingRevision === "string").toBeTrue();
        expect(envelope.targetRevision === null || typeof envelope.targetRevision === "string").toBeTrue();
        expect(typeof envelope.changed).toBe("boolean");
        expect(Object.values(envelope.counts).every((count) => Number.isInteger(count))).toBeTrue();
        expect(Array.isArray(envelope.paths)).toBeTrue();
        expect(typeof envelope.validation.ok).toBe("boolean");
        expect(Array.isArray(envelope.validation.problems)).toBeTrue();
        expect(envelope.error === null || (typeof envelope.error.code === "string" &&
          typeof envelope.error.message === "string")).toBeTrue();
        expect(Buffer.from(serializeEvidenceEnvelope(envelope), "utf8").toString("utf8")).toBe(
          serializeEvidenceEnvelope(envelope),
        );
        expect(serializeEvidenceEnvelope(envelope).endsWith("\n")).toBeTrue();
        expect(serializeEvidenceEnvelope(envelope).split("\n")).toHaveLength(2);
      }
      expect(success.changed).toBeTrue();
      expect(noop.changed).toBeFalse();
      expect(superseded.changed).toBeFalse();
      expect(error.changed).toBeFalse();
      expect(JSON.stringify(error)).not.toContain(secret);
      expect(success.paths).toEqual([]);
      expect(evidenceExitCode(success)).toBe(0);
      expect(evidenceExitCode(noop)).toBe(0);
      expect(evidenceExitCode(superseded)).toBe(0);
      expect(evidenceExitCode(error)).toBe(1);
    } finally {
      if (previousSecret === undefined) delete process.env.AMADEUS_TEST_PRIVATE_KEY;
      else process.env.AMADEUS_TEST_PRIVATE_KEY = previousSecret;
    }
  });
});
