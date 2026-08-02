// covers: subcommand:no-silent-drop:check, contract:no-silent-drop:adoption-evidence
// size: small
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureSnapshot, verifySnapshot } from "../no-silent-drop/engine.ts";
import {
  ADOPTION_RECEIPT_IDS,
  closeEvidenceReceipt,
  emptyEvidenceRegistry,
  validateEvidenceRegistry,
  validateTimingSamples,
} from "../no-silent-drop/repository-adoption.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const FULL_SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "a".repeat(64);
const temporaryDirectories: string[] = [];

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

describe("no-silent-drop CI argv authority", () => {
  test("a validated full base revision is consumed as one explicit argv", () => {
    const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();
    const result = runCli("--base-revision", revision);

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
    const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).stdout.trim();
    const result = spawnSync("bun", ["run", "no-silent-drop", "--", "--base-revision", revision], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, AMADEUS_NSD_TRUSTED_BASE_SHA: "f".repeat(40) },
    });

    expect(result.status).toBe(0);
  });
});

describe("repository adoption evidence registry", () => {
  test("all 23 canonical receipts close one revision", () => {
    let registry = emptyEvidenceRegistry(FULL_SHA);
    for (const id of ADOPTION_RECEIPT_IDS) {
      registry = closeEvidenceReceipt(registry, {
        schemaVersion: 1,
        id,
        currentRevision: FULL_SHA,
        evidenceDigest: DIGEST,
        pass: true,
      });
    }

    expect(validateEvidenceRegistry(registry, FULL_SHA)).toEqual({ ok: true });
    expect(registry.receipts).toHaveLength(23);
  });

  test("missing, extra, duplicate, wrong version/revision, and pass=false never validate green", () => {
    const receipt = {
      schemaVersion: 1 as const,
      id: ADOPTION_RECEIPT_IDS[0],
      currentRevision: FULL_SHA,
      evidenceDigest: DIGEST,
      pass: true as const,
    };
    const missing = emptyEvidenceRegistry(FULL_SHA);
    const duplicate = { ...missing, receipts: [receipt, receipt] };
    const extra = { ...missing, receipts: [{ ...receipt, id: "unknown" }] };
    const wrongVersion = { ...missing, schemaVersion: 2 };
    const wrongRevision = { ...missing, receipts: [{ ...receipt, currentRevision: "f".repeat(40) }] };
    const invalidDigest = { ...missing, receipts: [{ ...receipt, evidenceDigest: "not-a-digest" }] };
    const failed = { ...missing, receipts: [{ ...receipt, pass: false }] };

    for (const candidate of [missing, duplicate, extra, wrongVersion, wrongRevision, invalidDigest, failed]) {
      expect(validateEvidenceRegistry(candidate, FULL_SHA).ok).toBeFalse();
    }
  });

  test("timing evidence rejects negative and non-finite samples", () => {
    expect(validateTimingSamples({ cold: [1, 2, 3, 4, -1], warm: [1, 2, 3, 4, 5] }).pass).toBeFalse();
    expect(validateTimingSamples({ cold: [1, 2, 3, 4, 5], warm: [1, 2, 3, 4, Number.NaN] }).pass).toBeFalse();
  });

  test("the safe committer refuses unknown, duplicate, mismatched, or failed receipts", () => {
    const registry = emptyEvidenceRegistry(FULL_SHA);
    const validReceipt = {
      schemaVersion: 1 as const,
      id: ADOPTION_RECEIPT_IDS[0],
      currentRevision: FULL_SHA,
      evidenceDigest: DIGEST,
      pass: true as const,
    };
    const closed = closeEvidenceReceipt(registry, validReceipt);

    expect(() => closeEvidenceReceipt(closed, validReceipt)).toThrow("duplicate");
    expect(() => closeEvidenceReceipt(registry, { ...validReceipt, id: "unknown" as never })).toThrow("unknown");
    expect(() => closeEvidenceReceipt(registry, { ...validReceipt, currentRevision: "f".repeat(40) })).toThrow(
      "revision",
    );
    expect(() => closeEvidenceReceipt(registry, { ...validReceipt, pass: false as never })).toThrow("pass");
    expect(() => closeEvidenceReceipt({ ...closed, receipts: [validReceipt, validReceipt] }, {
      ...validReceipt,
      id: ADOPTION_RECEIPT_IDS[1],
    })).toThrow("not safe to extend");
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
