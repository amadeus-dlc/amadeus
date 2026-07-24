import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CiAcceptanceEvidence,
  CiModelCheckRunEvidence,
} from "../../scripts/formal-verif/ci-model-check-domain.ts";
import { verifyCiAcceptanceArtifacts } from "../../scripts/formal-verif/ci-model-check-artifacts.ts";
import { FIXED_DOCKER_IMAGE } from "../../scripts/formal-verif/tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../scripts/formal-verif/tlc-toolchain.ts";

const roots: string[] = [];
const SHA = "a".repeat(64);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createRun(root: string, kind: "warm-up" | "measured", index: number): CiModelCheckRunEvidence {
  const runId = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  const relativeDirectory = `runs/${kind}-${index}`;
  const directory = join(root, relativeDirectory);
  mkdirSync(directory, { recursive: true });
  const receipt = {
    schema: "amadeus.env-receipt.v1",
    runId,
    planner: "docker-planner",
    inspections: [
      { id: "image-digest", status: "passed", expected: FIXED_DOCKER_IMAGE, observed: FIXED_DOCKER_IMAGE, reason: "" },
      { id: "jar-sha256", status: "passed", expected: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256, observed: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256, reason: "" },
      { id: "network-deny", status: "passed", expected: "--network=none", observed: "--network=none", reason: "" },
      { id: "jdk-snapshot", status: "not-applicable", expected: null, observed: null, reason: "Docker image supplies the isolated JDK" },
      { id: "sandbox-profile", status: "not-applicable", expected: null, observed: null, reason: "Docker isolation replaces sandbox-exec" },
    ],
  };
  writeJson(join(directory, "env-receipt.json"), receipt);
  writeFileSync(join(directory, "tlc-stdout.bin"), "TLC finished\n");
  writeFileSync(join(directory, "tlc-stderr.bin"), "OpenJDK diagnostic\n");
  writeJson(join(directory, "completion-marker.json"), { complete: true, runId });
  const expectedArtifacts = [
    "env-receipt.json",
    "tlc-stdout.bin",
    "tlc-stderr.bin",
    "completion-marker.json",
  ];
  const artifacts = expectedArtifacts.map((path) => {
    const bytes = readFileSync(join(directory, path));
    return { path, sha256: digest(bytes), bytes: bytes.byteLength };
  });
  writeJson(join(directory, "manifest.json"), {
    schema: "amadeus.model-check-manifest.v1",
    runId,
    outcome: "NOT_DETECTED",
    exitCode: 0,
    startedAt: "2026-07-24T00:00:00.000Z",
    finishedAt: "2026-07-24T00:01:40.000Z",
    expectedArtifacts,
    artifacts,
    partial: false,
    errorCode: null,
  });
  return {
    kind,
    index,
    runId,
    artifactDirectory: relativeDirectory,
    outcome: "NOT_DETECTED",
    exitCode: 0,
    cliMs: 100_000,
    spawnMs: 99_000,
    docker: {
      imageRef: FIXED_DOCKER_IMAGE,
      argv: [
        "run", "--rm", "--network=none", "--name", `amadeus-tlc-${runId}`,
        "--mount", "type=bind,src=$WORKSPACE/specs/tla,dst=$WORKSPACE/specs/tla,readonly",
        "--mount", "type=bind,src=$JAR,dst=$JAR,readonly",
        "--mount", "type=bind,src=$SCRATCH,dst=$SCRATCH",
        FIXED_DOCKER_IMAGE,
      ],
      exitCode: 0,
    },
    cleanup: { containerName: `amadeus-tlc-${runId}`, remainingContainers: 0, forced: false },
  };
}

function fixture(): { root: string; evidence: CiAcceptanceEvidence } {
  const root = mkdtempSync(join(tmpdir(), "ci-model-check-artifacts-"));
  roots.push(root);
  const evidence: CiAcceptanceEvidence = {
    schema: "amadeus.ci-model-check-acceptance.v1",
    imageRef: FIXED_DOCKER_IMAGE,
    jar: {
      version: FIXED_TLC_ARTIFACT_DESCRIPTOR.version,
      url: FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
      sha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    },
    runtime: {
      bunVersion: "1.3.13",
      runnerOs: "Linux",
      runnerArch: "X64",
      githubRunId: "123",
      githubRunAttempt: "1",
      headSha: SHA,
    },
    runs: [
      createRun(root, "warm-up", 0),
      ...[1, 2, 3, 4, 5].map((index) => createRun(root, "measured", index)),
    ],
  };
  writeJson(join(root, "acceptance.json"), evidence);
  return { root, evidence };
}

function rewriteJsonArtifact(
  root: string,
  runDirectory: string,
  artifactName: string,
  mutate: (value: any) => any,
): void {
  const directory = join(root, runDirectory);
  const path = join(directory, artifactName);
  const value = JSON.parse(readFileSync(path, "utf8"));
  writeJson(path, mutate(value));
  if (artifactName === "manifest.json") return;
  resealArtifact(root, runDirectory, artifactName);
}

function resealArtifact(
  root: string,
  runDirectory: string,
  artifactName: string,
): void {
  const directory = join(root, runDirectory);
  const path = join(directory, artifactName);
  const manifestPath = join(directory, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entry = manifest.artifacts.find((candidate: { path: string }) => candidate.path === artifactName);
  const bytes = readFileSync(path);
  entry.sha256 = digest(bytes);
  entry.bytes = bytes.byteLength;
  writeJson(manifestPath, manifest);
}

describe("CI model-check artifact verifier", () => {
  test("recomputes every U3 artifact digest and exact Docker EnvReceipt matrix", () => {
    const { root, evidence } = fixture();
    expect(verifyCiAcceptanceArtifacts(root)).toEqual({ ok: true, value: evidence });
  });

  test("rejects byte drift and an unexecuted Docker inspection", () => {
    const drifted = fixture();
    writeFileSync(join(drifted.root, "runs/warm-up-0/tlc-stdout.bin"), "drifted\n");
    expect(verifyCiAcceptanceArtifacts(drifted.root)).toEqual({
      ok: false,
      error: expect.stringContaining("digest"),
    });

    const notRun = fixture();
    const receiptPath = join(notRun.root, "runs/measured-1/env-receipt.json");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.inspections[0] = {
      id: "image-digest",
      status: "not-run",
      expected: FIXED_DOCKER_IMAGE,
      observed: null,
      reason: "not run",
    };
    writeJson(receiptPath, receipt);
    rewriteJsonArtifact(notRun.root, "runs/measured-1", "env-receipt.json", (value) => value);
    expect(verifyCiAcceptanceArtifacts(notRun.root).ok).toBe(false);
  });

  test("accepts manifest-bound empty stderr but rejects empty stdout and traversal", () => {
    const emptyStderr = fixture();
    writeFileSync(join(emptyStderr.root, "runs/measured-2/tlc-stderr.bin"), "");
    resealArtifact(emptyStderr.root, "runs/measured-2", "tlc-stderr.bin");
    expect(verifyCiAcceptanceArtifacts(emptyStderr.root).ok).toBe(true);

    const emptyStdout = fixture();
    writeFileSync(join(emptyStdout.root, "runs/measured-2/tlc-stdout.bin"), "");
    resealArtifact(emptyStdout.root, "runs/measured-2", "tlc-stdout.bin");
    expect(verifyCiAcceptanceArtifacts(emptyStdout.root).ok).toBe(false);

    const escaped = fixture();
    const acceptancePath = join(escaped.root, "acceptance.json");
    const acceptance = JSON.parse(readFileSync(acceptancePath, "utf8"));
    acceptance.runs[3].artifactDirectory = "../outside";
    writeJson(acceptancePath, acceptance);
    expect(verifyCiAcceptanceArtifacts(escaped.root).ok).toBe(false);
  });

  test("rejects a manifest-bound stderr stream above the 16 MiB U3 cap", () => {
    const oversized = fixture();
    writeFileSync(
      join(oversized.root, "runs/measured-2/tlc-stderr.bin"),
      Buffer.alloc(16 * 1024 * 1024 + 1, 1),
    );
    resealArtifact(oversized.root, "runs/measured-2", "tlc-stderr.bin");
    expect(verifyCiAcceptanceArtifacts(oversized.root).ok).toBe(false);
  });

  test("fails closed for malformed roots, acceptance JSON, manifests, and directories", () => {
    expect(verifyCiAcceptanceArtifacts("/definitely/missing/u4-evidence").ok).toBe(false);
    const malformedAcceptance = fixture();
    writeFileSync(join(malformedAcceptance.root, "acceptance.json"), "{");
    expect(verifyCiAcceptanceArtifacts(malformedAcceptance.root).ok).toBe(false);
    writeJson(join(malformedAcceptance.root, "acceptance.json"), {});
    expect(verifyCiAcceptanceArtifacts(malformedAcceptance.root).ok).toBe(false);

    const malformedManifest = fixture();
    writeJson(join(malformedManifest.root, "runs/warm-up-0/manifest.json"), {});
    expect(verifyCiAcceptanceArtifacts(malformedManifest.root).ok).toBe(false);

    const unavailable = fixture();
    rmSync(join(unavailable.root, "runs/warm-up-0"), { recursive: true });
    expect(verifyCiAcceptanceArtifacts(unavailable.root).ok).toBe(false);

    const linked = fixture();
    const runPath = join(linked.root, "runs/warm-up-0");
    const targetPath = join(linked.root, "runs/warm-up-target");
    renameSync(runPath, targetPath);
    symlinkSync(targetPath, runPath);
    expect(verifyCiAcceptanceArtifacts(linked.root).ok).toBe(false);
  });

  test("rejects malformed manifest inventories and unavailable artifacts", () => {
    const expected = fixture();
    rewriteJsonArtifact(expected.root, "runs/warm-up-0", "manifest.json", (manifest) => {
      manifest.expectedArtifacts.pop();
      return manifest;
    });
    expect(verifyCiAcceptanceArtifacts(expected.root).ok).toBe(false);

    const duplicate = fixture();
    rewriteJsonArtifact(duplicate.root, "runs/warm-up-0", "manifest.json", (manifest) => {
      manifest.artifacts[1] = manifest.artifacts[0];
      return manifest;
    });
    expect(verifyCiAcceptanceArtifacts(duplicate.root).ok).toBe(false);

    const missing = fixture();
    unlinkSync(join(missing.root, "runs/warm-up-0/tlc-stdout.bin"));
    expect(verifyCiAcceptanceArtifacts(missing.root).ok).toBe(false);

    const nonFile = fixture();
    unlinkSync(join(nonFile.root, "runs/warm-up-0/tlc-stdout.bin"));
    mkdirSync(join(nonFile.root, "runs/warm-up-0/tlc-stdout.bin"));
    expect(verifyCiAcceptanceArtifacts(nonFile.root).ok).toBe(false);

    const badEntry = fixture();
    rewriteJsonArtifact(badEntry.root, "runs/warm-up-0", "manifest.json", (manifest) => {
      manifest.artifacts[0].bytes = "invalid";
      return manifest;
    });
    expect(verifyCiAcceptanceArtifacts(badEntry.root).ok).toBe(false);
  });

  test("rejects malformed receipt identities, matrices, values, and markers", () => {
    for (const mutate of [
      (receipt: any) => { receipt.schema = "unknown"; },
      (receipt: any) => { receipt.inspections.pop(); },
      (receipt: any) => { receipt.inspections[0].observed = "drift"; },
      (receipt: any) => { receipt.inspections[3].reason = ""; },
    ]) {
      const value = fixture();
      rewriteJsonArtifact(value.root, "runs/warm-up-0", "env-receipt.json", (receipt) => {
        mutate(receipt);
        return receipt;
      });
      expect(verifyCiAcceptanceArtifacts(value.root).ok).toBe(false);
    }

    const malformedReceipt = fixture();
    const receiptPath = join(malformedReceipt.root, "runs/warm-up-0/env-receipt.json");
    writeFileSync(receiptPath, "{");
    const manifestPath = join(malformedReceipt.root, "runs/warm-up-0/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const receiptEntry = manifest.artifacts.find((entry: { path: string }) => entry.path === "env-receipt.json");
    const receiptBytes = readFileSync(receiptPath);
    receiptEntry.sha256 = digest(receiptBytes);
    receiptEntry.bytes = receiptBytes.byteLength;
    writeJson(manifestPath, manifest);
    expect(verifyCiAcceptanceArtifacts(malformedReceipt.root).ok).toBe(false);

    const marker = fixture();
    rewriteJsonArtifact(marker.root, "runs/warm-up-0", "completion-marker.json", (value) => ({
      ...value,
      complete: false,
    }));
    expect(verifyCiAcceptanceArtifacts(marker.root).ok).toBe(false);

    const terminal = fixture();
    rewriteJsonArtifact(terminal.root, "runs/warm-up-0", "manifest.json", (value) => ({
      ...value,
      partial: true,
    }));
    expect(verifyCiAcceptanceArtifacts(terminal.root).ok).toBe(false);
  });
});
