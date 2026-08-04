// covers: subcommand:no-silent-drop:check, contract:no-silent-drop:adoption-evidence
// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureSnapshot, verifySnapshot } from "../no-silent-drop/engine.ts";
import {
  ADOPTION_RECEIPT_IDS,
  closeEvidenceReceipt,
  emptyEvidenceRegistry,
  evidenceDigestForReceipt,
  validateEvidenceRegistry,
  validateTimingSamples,
} from "../no-silent-drop/repository-adoption.ts";
import { readEvidenceArtifact } from "../no-silent-drop/repository-adoption-evidence.ts";
import { noSilentDropTrustedBase } from "../lib/no-silent-drop-trusted-base.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";
const BOOTSTRAP_BASE_SHA = "47574fbabf274e11cb8e0b37bf35a0309a7b3d42";
const revision = (...args: string[]): string | null => {
  const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
  const value = result.status === 0 ? result.stdout.trim() : "";
  return /^[0-9a-f]{40}$/.test(value) ? value : null;
};
const TRUSTED_BASE_REVISION = noSilentDropTrustedBase(REPO_ROOT)
  ?? revision("rev-parse", "HEAD^")
  ?? BOOTSTRAP_BASE_SHA;
const temporaryDirectories: string[] = [];
let closedRegistryTemplate: ReturnType<typeof emptyEvidenceRegistry> | undefined;

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function snapshotFixture(withSource: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "nsd-adoption-"));
  temporaryDirectories.push(root);
  for (const path of ["packages/framework/core", "packages/framework/harness", "scripts"]) {
    mkdirSync(join(root, path), { recursive: true });
    if (withSource) writeFileSync(join(root, path, "source.ts"), "export const value = 1;\n");
  }
  return root;
}

function runCli(...args: string[]) {
  return spawnSync("bun", ["run", "no-silent-drop", "--", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

type MutableEvidenceManifest = {
  schemaVersion: number;
  testedRevision: string;
  evidence: Array<Record<string, unknown>>;
};

function evidenceFixture(): { root: string; registry: ReturnType<typeof emptyEvidenceRegistry> } {
  const root = mkdtempSync(join(tmpdir(), "nsd-evidence-"));
  temporaryDirectories.push(root);
  const evidenceDirectory = join(root, "tests", "no-silent-drop", "evidence");
  mkdirSync(evidenceDirectory, { recursive: true });

  const primaryRuns = ADOPTION_RECEIPT_IDS.map((id) => {
    const isComposite = id === "full-test" || id === "coverage";
    return {
      schemaVersion: 1,
      recordId: `${id}:${isComposite ? "normal" : "primary"}`,
      receiptId: id,
      runName: isComposite ? "normal" : "primary",
      testedRevision: FULL_SHA,
      command: ["bun", "test", id],
      exitCode: 0,
      verdict: "pass",
      tests: [{ name: `${id}.test.ts`, status: "pass" }],
    };
  });
  const isolatedRuns = ["full-test", "coverage"].map((id) => ({
    schemaVersion: 1,
    recordId: `${id}:isolated-known-timeouts`,
    receiptId: id,
    runName: "isolated-known-timeouts",
    testedRevision: FULL_SHA,
    command: ["bun", "test", "--timeout", "120000", `${id}-timeout.test.ts`],
    exitCode: 0,
    verdict: "pass",
    tests: [{ name: `${id}-timeout.test.ts`, status: "pass" }],
  }));
  const primaryBytes = `${JSON.stringify({ schemaVersion: 1, runs: primaryRuns }, null, 2)}\n`;
  const isolatedBytes = `${JSON.stringify({ schemaVersion: 1, runs: isolatedRuns }, null, 2)}\n`;
  const primaryPath = "tests/no-silent-drop/evidence/primary.json";
  const isolatedPath = "tests/no-silent-drop/evidence/isolated.json";
  writeFileSync(join(root, primaryPath), primaryBytes);
  writeFileSync(join(root, isolatedPath), isolatedBytes);

  const evidence = primaryRuns.map((primary) => {
    const runs = [{
      name: primary.runName,
      command: primary.command,
      artifact: { path: primaryPath, sha256: sha256(primaryBytes), recordId: primary.recordId },
      exitCode: primary.exitCode,
      verdict: primary.verdict,
    }];
    const isolated = isolatedRuns.find((candidate) => candidate.receiptId === primary.receiptId);
    if (isolated !== undefined) {
      runs.push({
        name: isolated.runName,
        command: isolated.command,
        artifact: { path: isolatedPath, sha256: sha256(isolatedBytes), recordId: isolated.recordId },
        exitCode: isolated.exitCode,
        verdict: isolated.verdict,
      });
    }
    return {
      schemaVersion: 1,
      id: primary.receiptId,
      testedRevision: FULL_SHA,
      runs,
      verdict: "pass",
    };
  });
  writeFileSync(
    join(root, "tests", "no-silent-drop", "adoption-evidence-manifest.json"),
    `${JSON.stringify({ schemaVersion: 1, testedRevision: FULL_SHA, evidence }, null, 2)}\n`,
  );

  if (closedRegistryTemplate === undefined) {
    let closed = emptyEvidenceRegistry(FULL_SHA);
    for (const id of ADOPTION_RECEIPT_IDS) {
      closed = closeEvidenceReceipt(closed, {
        schemaVersion: 1,
        id,
        currentRevision: FULL_SHA,
        evidenceDigest: evidenceDigestForReceipt(id, FULL_SHA, root),
        pass: true,
      }, root);
    }
    closedRegistryTemplate = closed;
  }
  const registry = structuredClone(closedRegistryTemplate);
  writeFileSync(
    join(root, "tests", "no-silent-drop", "adoption-evidence.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
  );
  return { root, registry };
}

function readManifest(root: string): MutableEvidenceManifest {
  return JSON.parse(readFileSync(join(root, "tests", "no-silent-drop", "adoption-evidence-manifest.json"), "utf8"));
}

function writeManifest(root: string, manifest: MutableEvidenceManifest): void {
  writeFileSync(
    join(root, "tests", "no-silent-drop", "adoption-evidence-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function replacePrimaryArtifact(root: string, value: unknown): void {
  const path = "tests/no-silent-drop/evidence/primary.json";
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(join(root, path), bytes);
  const manifest = readManifest(root);
  for (const entry of manifest.evidence as Array<{ runs: Array<{ artifact: { path: string; sha256: string } }> }>) {
    for (const run of entry.runs) {
      if (run.artifact.path === path) run.artifact.sha256 = sha256(bytes);
    }
  }
  writeManifest(root, manifest);
}

describe("no-silent-drop CI argv authority", () => {
  test("a validated full base revision is consumed as one explicit argv", () => {
    const result = runCli("--base-revision", TRUSTED_BASE_REVISION);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "pass", code: "NO_SILENT_DROP_OK" });
  });

  test.each([
    [["--unknown"], "unknown"],
    [["--base-revision"], "requires"],
    [["--base-revision", "abc123"], "full SHA"],
    [["--base-revision", "0".repeat(40)], "all-zero"],
    [["--base-revision", FULL_SHA, "--base-revision", FULL_SHA], "duplicate"],
  ] as const)("invalid argv %p fails closed", (args, detail) => {
    const result = runCli(...args);

    expect(result.status).toBe(2);
    expect(result.stdout.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "error", code: "RULE_INVALID" });
    expect(JSON.parse(result.stdout).detail).toContain(detail);
  });

  test("an unresolvable full SHA remains an infrastructure failure", () => {
    const result = runCli("--base-revision", "f".repeat(40));

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: "error", code: "BASELINE_INVALID" });
  });

  test("explicit argv overrides the legacy environment seam", () => {
    const result = spawnSync("bun", ["run", "no-silent-drop", "--", "--base-revision", TRUSTED_BASE_REVISION], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, AMADEUS_NSD_TRUSTED_BASE_SHA: "f".repeat(40) },
    });

    expect(result.status).toBe(0);
  });
});

describe("repository adoption evidence registry", () => {
  test("all 23 canonical receipts bind to repository evidence bytes for one revision", () => {
    const { root, registry } = evidenceFixture();

    expect(validateEvidenceRegistry(registry, FULL_SHA, root)).toEqual({ ok: true });
    expect(registry.receipts).toHaveLength(23);
    expect(new Set(registry.receipts.map((receipt) => receipt.evidenceDigest)).size).toBe(23);
  });

  test("the same fabricated digest cannot close any evidence population", () => {
    const { root, registry } = evidenceFixture();
    const fabricated = {
      ...registry,
      receipts: registry.receipts.map((receipt) => ({ ...receipt, evidenceDigest: "a".repeat(64) })),
    };

    expect(validateEvidenceRegistry(fabricated, FULL_SHA, root).ok).toBeFalse();
  });

  test("artifact and command tampering invalidate an already closed receipt", () => {
    const artifactFixture = evidenceFixture();
    writeFileSync(
      join(artifactFixture.root, "tests", "no-silent-drop", "evidence", "primary.json"),
      "tampered\n",
    );
    expect(validateEvidenceRegistry(artifactFixture.registry, FULL_SHA, artifactFixture.root).ok).toBeFalse();

    const commandFixture = evidenceFixture();
    const manifest = readManifest(commandFixture.root);
    const first = manifest.evidence[0] as { runs: Array<{ command: string[] }> };
    first.runs[0]?.command.push("--tampered");
    writeManifest(commandFixture.root, manifest);
    expect(validateEvidenceRegistry(commandFixture.registry, FULL_SHA, commandFixture.root).ok).toBeFalse();
  });

  test("missing, extra, and duplicate manifest evidence fail closed", () => {
    for (const mutation of ["missing", "extra", "duplicate"] as const) {
      const { root, registry } = evidenceFixture();
      const manifest = readManifest(root);
      if (mutation === "missing") manifest.evidence.pop();
      if (mutation === "extra") manifest.evidence.push({ ...manifest.evidence[0], id: "unknown" });
      if (mutation === "duplicate") manifest.evidence.push({ ...manifest.evidence[0] });
      writeManifest(root, manifest);
      expect(validateEvidenceRegistry(registry, FULL_SHA, root).ok).toBeFalse();
    }
  });

  test("malformed manifest envelopes, entries, runs, and artifacts fail closed", () => {
    const mutations: Array<(root: string) => void> = [
      (root) => writeFileSync(join(root, "tests/no-silent-drop/adoption-evidence-manifest.json"), "{"),
      (root) => writeFileSync(join(root, "tests/no-silent-drop/adoption-evidence-manifest.json"), "[]\n"),
      (root) => writeFileSync(
        join(root, "tests/no-silent-drop/adoption-evidence-manifest.json"),
        '{"schemaVersion":2,"testedRevision":"bad","evidence":{}}\n',
      ),
      (root) => {
        const manifest = readManifest(root);
        manifest.evidence[0] = null as never;
        writeManifest(root, manifest);
      },
      (root) => {
        const manifest = readManifest(root);
        (manifest.evidence[0] as Record<string, unknown>).id = "unknown";
        writeManifest(root, manifest);
      },
      (root) => {
        const manifest = readManifest(root);
        (manifest.evidence[0] as Record<string, unknown>).runs = "invalid";
        writeManifest(root, manifest);
      },
      (root) => {
        const manifest = readManifest(root);
        (manifest.evidence[0] as { runs: unknown[] }).runs[0] = null;
        writeManifest(root, manifest);
      },
      (root) => {
        const manifest = readManifest(root);
        const run = (manifest.evidence[0] as { runs: Array<Record<string, unknown>> }).runs[0]!;
        Object.assign(run, { name: "", command: [], exitCode: -1, verdict: "failed", artifact: null, extra: true });
        writeManifest(root, manifest);
      },
      (root) => {
        const manifest = readManifest(root);
        const run = (manifest.evidence[0] as { runs: Array<Record<string, unknown>> }).runs[0]!;
        run.artifact = { path: 1, recordId: "", sha256: "bad", extra: true };
        writeManifest(root, manifest);
      },
    ];

    for (const mutate of mutations) {
      const { root, registry } = evidenceFixture();
      mutate(root);
      expect(validateEvidenceRegistry(registry, FULL_SHA, root).ok).toBeFalse();
    }
  });

  test("unsafe, missing, and non-file artifact paths fail closed", () => {
    for (const artifactPath of ["", "/absolute.json", "../escape.json", "tests/no-silent-drop/evidence/missing.json"] as const) {
      const { root, registry } = evidenceFixture();
      const manifest = readManifest(root);
      const run = (manifest.evidence[0] as { runs: Array<{ artifact: { path: string } }> }).runs[0]!;
      run.artifact.path = artifactPath;
      writeManifest(root, manifest);
      expect(validateEvidenceRegistry(registry, FULL_SHA, root).ok).toBeFalse();
    }

    const directoryFixture = evidenceFixture();
    const manifest = readManifest(directoryFixture.root);
    const run = (manifest.evidence[0] as { runs: Array<{ artifact: { path: string } }> }).runs[0]!;
    run.artifact.path = "tests/no-silent-drop/evidence";
    writeManifest(directoryFixture.root, manifest);
    expect(validateEvidenceRegistry(directoryFixture.registry, FULL_SHA, directoryFixture.root).ok).toBeFalse();
  });

  test("artifact collection and summary schema violations fail closed", () => {
    const values: unknown[] = [
      null,
      { schemaVersion: 2, runs: "invalid" },
      { schemaVersion: 1, runs: [null] },
      { schemaVersion: 1, runs: [{ recordId: 1 }] },
      {
        schemaVersion: 1,
        runs: [{
          schemaVersion: 1,
          recordId: "shape-fixtures:primary",
          receiptId: "shape-fixtures",
          runName: "primary",
          testedRevision: FULL_SHA,
          command: ["bun", "test", "shape-fixtures"],
          exitCode: 0,
          verdict: "pass",
          tests: [],
        }],
      },
      {
        schemaVersion: 1,
        runs: [{
          schemaVersion: 2,
          recordId: "shape-fixtures:primary",
          receiptId: "wrong",
          runName: "wrong",
          testedRevision: "wrong",
          command: ["wrong"],
          exitCode: 1,
          verdict: "pass",
          tests: [{ name: "", status: "failed", extra: true }],
          extra: true,
        }],
      },
    ];
    for (const value of values) {
      const { root, registry } = evidenceFixture();
      replacePrimaryArtifact(root, value);
      expect(validateEvidenceRegistry(registry, FULL_SHA, root).ok).toBeFalse();
    }
  });

  test("missing, extra, and duplicate artifact evidence fail closed", () => {
    for (const mutation of ["missing", "extra", "duplicate"] as const) {
      const { root, registry } = evidenceFixture();
      const path = join(root, "tests", "no-silent-drop", "evidence", "primary.json");
      const collection = JSON.parse(readFileSync(path, "utf8")) as { runs: Array<Record<string, unknown>> };
      if (mutation === "missing") collection.runs.pop();
      if (mutation === "extra") collection.runs.push({ ...collection.runs[0], recordId: "extra:primary" });
      if (mutation === "duplicate") collection.runs.push({ ...collection.runs[0] });
      writeFileSync(path, `${JSON.stringify(collection, null, 2)}\n`);
      const validation = validateEvidenceRegistry(registry, FULL_SHA, root);
      expect(validation.ok).toBeFalse();
      if (!validation.ok) expect(validation.problems.join("\n")).toContain(`${mutation} artifact record`);
    }
  });

  test("self-referential artifact evidence fails closed", () => {
    const selfReferenceFixture = evidenceFixture();
    const manifest = readManifest(selfReferenceFixture.root);
    const first = manifest.evidence[0] as { runs: Array<{ artifact: { path: string } }> };
    if (first.runs[0] !== undefined) first.runs[0].artifact.path = "tests/no-silent-drop/adoption-evidence.json";
    writeManifest(selfReferenceFixture.root, manifest);
    const validation = validateEvidenceRegistry(
      selfReferenceFixture.registry,
      FULL_SHA,
      selfReferenceFixture.root,
    );
    expect(validation.ok).toBeFalse();
    if (!validation.ok) expect(validation.problems.join("\n")).toContain("self-referential");
  });

  test("internal and external symlink evidence files fail closed", () => {
    const artifactFixture = evidenceFixture();
    const externalDirectory = mkdtempSync(join(tmpdir(), "nsd-external-evidence-"));
    temporaryDirectories.push(externalDirectory);
    const externalArtifact = join(externalDirectory, "primary.json");
    const artifactPath = join(artifactFixture.root, "tests", "no-silent-drop", "evidence", "primary.json");
    writeFileSync(externalArtifact, readFileSync(artifactPath));
    rmSync(artifactPath);
    symlinkSync(externalArtifact, artifactPath);
    const artifactValidation = validateEvidenceRegistry(artifactFixture.registry, FULL_SHA, artifactFixture.root);
    expect(artifactValidation.ok).toBeFalse();
    if (!artifactValidation.ok) expect(artifactValidation.problems.join("\n")).toContain("non-symlink");

    const manifestFixture = evidenceFixture();
    const manifestPath = join(manifestFixture.root, "tests", "no-silent-drop", "adoption-evidence-manifest.json");
    const manifestTarget = join(manifestFixture.root, "tests", "no-silent-drop", "manifest-target.json");
    writeFileSync(manifestTarget, readFileSync(manifestPath));
    rmSync(manifestPath);
    symlinkSync(manifestTarget, manifestPath);
    const manifestValidation = validateEvidenceRegistry(manifestFixture.registry, FULL_SHA, manifestFixture.root);
    expect(manifestValidation.ok).toBeFalse();
    if (!manifestValidation.ok) expect(manifestValidation.problems.join("\n")).toContain("non-symlink");

    const registryFixture = evidenceFixture();
    const registryPath = join(registryFixture.root, "tests", "no-silent-drop", "adoption-evidence.json");
    const registryTarget = join(registryFixture.root, "tests", "no-silent-drop", "registry-target.json");
    writeFileSync(registryTarget, readFileSync(registryPath));
    rmSync(registryPath);
    symlinkSync(registryTarget, registryPath);
    const registryValidation = validateEvidenceRegistry(registryFixture.registry, FULL_SHA, registryFixture.root);
    expect(registryValidation.ok).toBeFalse();
    if (!registryValidation.ok) expect(registryValidation.problems.join("\n")).toContain("non-symlink");
  });

  test("revision mismatch and pass=false fail closed", () => {
    const revisionFixture = evidenceFixture();
    const manifest = readManifest(revisionFixture.root);
    manifest.testedRevision = "f".repeat(40);
    writeManifest(revisionFixture.root, manifest);
    expect(validateEvidenceRegistry(revisionFixture.registry, FULL_SHA, revisionFixture.root).ok).toBeFalse();

    const failedFixture = evidenceFixture();
    const failed = {
      ...failedFixture.registry,
      receipts: failedFixture.registry.receipts.map((receipt, index) =>
        index === 0 ? { ...receipt, pass: false } : receipt),
    };
    expect(validateEvidenceRegistry(failed, FULL_SHA, failedFixture.root).ok).toBeFalse();
  });

  test("full and coverage receipts require normal and named isolated run bytes", () => {
    for (const id of ["full-test", "coverage"] as const) {
      const { root, registry } = evidenceFixture();
      const manifest = readManifest(root);
      const entry = manifest.evidence.find((candidate) => candidate.id === id) as { runs: unknown[] };
      entry.runs.pop();
      writeManifest(root, manifest);
      expect(validateEvidenceRegistry(registry, FULL_SHA, root).ok).toBeFalse();
    }
  });

  test("full and coverage normal runs cannot close as known timeouts", () => {
    for (const id of ["full-test", "coverage"] as const) {
      const { root, registry } = evidenceFixture();
      const manifest = readManifest(root);
      const entry = manifest.evidence.find((candidate) => candidate.id === id) as {
        runs: Array<{ exitCode: number; verdict: string }>;
      };
      if (entry.runs[0] !== undefined) {
        entry.runs[0].exitCode = 4;
        entry.runs[0].verdict = "known-timeout";
      }
      writeManifest(root, manifest);
      expect(validateEvidenceRegistry(registry, FULL_SHA, root).ok).toBeFalse();
    }
  });

  test("run-shape validation reaches primary, normal, and summary failure arms", () => {
    const primary = evidenceFixture();
    const primaryManifest = readManifest(primary.root);
    const primaryEntry = primaryManifest.evidence.find((entry) => entry.id === "shape-fixtures") as {
      runs: Array<{ exitCode: number }>;
    };
    primaryEntry.runs[0]!.exitCode = 1;
    writeManifest(primary.root, primaryManifest);
    expect(validateEvidenceRegistry(primary.registry, FULL_SHA, primary.root).ok).toBeFalse();

    const normal = evidenceFixture();
    const normalManifest = readManifest(normal.root);
    const normalEntry = normalManifest.evidence.find((entry) => entry.id === "full-test") as {
      runs: Array<{ exitCode: number }>;
    };
    normalEntry.runs[0]!.exitCode = 1;
    writeManifest(normal.root, normalManifest);
    expect(validateEvidenceRegistry(normal.registry, FULL_SHA, normal.root).ok).toBeFalse();

    const summary = evidenceFixture();
    const artifact = join(summary.root, "tests", "no-silent-drop", "evidence", "primary.json");
    const collection = JSON.parse(readFileSync(artifact, "utf8")) as {
      runs: Array<{ tests: Array<{ status: string }> }>;
    };
    collection.runs[0]!.tests[0]!.status = "failed";
    writeFileSync(artifact, `${JSON.stringify(collection, null, 2)}\n`);
    expect(validateEvidenceRegistry(summary.registry, FULL_SHA, summary.root).ok).toBeFalse();
  });

  test("artifact byte reader reports a post-stat read failure", () => {
    const problems: string[] = [];
    expect(readEvidenceArtifact("/tmp/evidence.json", "evidence.json", problems, () => {
      throw new Error("read failed");
    })).toBeUndefined();
    expect(problems.join("\n")).toContain("cannot read evidence artifact evidence.json");
  });

  test("timing evidence rejects negative and non-finite samples", () => {
    expect(validateTimingSamples({ cold: [1, 2, 3, 4, -1], warm: [1, 2, 3, 4, 5] }).pass).toBeFalse();
    expect(validateTimingSamples({ cold: [1, 2, 3, 4, 5], warm: [1, 2, 3, 4, Number.NaN] }).pass).toBeFalse();
  });

  test("the safe committer refuses unknown, duplicate, mismatched, or failed receipts", () => {
    const { root, registry: closed } = evidenceFixture();
    const validReceipt = closed.receipts[0]!;
    const registry = emptyEvidenceRegistry(FULL_SHA);

    expect(() => closeEvidenceReceipt(closed, validReceipt, root)).toThrow("duplicate");
    expect(() => closeEvidenceReceipt(registry, { ...validReceipt, id: "unknown" as never }, root)).toThrow("unknown");
    expect(() => closeEvidenceReceipt(registry, { ...validReceipt, currentRevision: "f".repeat(40) }, root)).toThrow(
      "revision",
    );
    expect(() => closeEvidenceReceipt(registry, { ...validReceipt, pass: false as never }, root)).toThrow("pass");
    expect(() => closeEvidenceReceipt({ ...closed, receipts: [validReceipt, validReceipt] }, {
      ...validReceipt,
      id: ADOPTION_RECEIPT_IDS[1],
    }, root)).toThrow("not safe to extend");
  });

  test("the safe committer rejects invalid bundles and non-matching evidence digests", () => {
    const invalidBundle = evidenceFixture();
    writeFileSync(
      join(invalidBundle.root, "tests/no-silent-drop/adoption-evidence-manifest.json"),
      "{}\n",
    );
    expect(() => closeEvidenceReceipt(
      emptyEvidenceRegistry(FULL_SHA),
      invalidBundle.registry.receipts[0]!,
      invalidBundle.root,
    )).toThrow("evidence bundle is invalid");

    const mismatch = evidenceFixture();
    expect(() => closeEvidenceReceipt(
      emptyEvidenceRegistry(FULL_SHA),
      { ...mismatch.registry.receipts[0]!, evidenceDigest: "a".repeat(64) },
      mismatch.root,
    )).toThrow("does not match repository evidence");
  });

  test("registry validation reports unknown receipt ids and malformed receipt digests", () => {
    const { root, registry } = evidenceFixture();
    const unknown = {
      ...registry,
      receipts: [{ ...registry.receipts[0]!, id: "unknown" }],
    };
    expect(validateEvidenceRegistry(unknown, FULL_SHA, root).ok).toBeFalse();

    const malformed = {
      ...registry,
      receipts: [{ ...registry.receipts[0]!, evidenceDigest: "bad" }],
    };
    expect(validateEvidenceRegistry(malformed, FULL_SHA, root).ok).toBeFalse();
  });
});

describe("repository adoption failure matrix", () => {
  test("zero and missing scan roots fail closed", () => {
    expect(() => captureSnapshot(snapshotFixture(false))).toThrow("zero authored source files");
    const missingRoot = snapshotFixture(true);
    rmSync(join(missingRoot, "scripts"), { recursive: true, force: true });
    expect(() => captureSnapshot(missingRoot)).toThrow("scan root is missing");
  });

  test("a source changed after capture cannot be accepted as a complete scan", () => {
    const root = snapshotFixture(true);
    const snapshot = captureSnapshot(root);
    writeFileSync(join(root, "scripts", "source.ts"), "export const value = 2;\n");

    expect(() => verifySnapshot(snapshot)).toThrow("source");
  });
});
