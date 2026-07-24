import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  beginModelCheckArtifacts,
  publishModelCheckArtifacts,
  type ModelCheckManifest,
} from "../../scripts/formal-verif/run-model-check-artifacts.ts";
import type { EnvReceipt } from "../../scripts/formal-verif/run-model-check-domain.ts";

const RUN_ID = "00000000-0000-4000-8000-000000000001";
const receipt: EnvReceipt = {
  schema: "amadeus.env-receipt.v1",
  runId: RUN_ID,
  planner: "planner",
  inspections: [
    { id: "image-digest", status: "passed", expected: "image", observed: "image", reason: "" },
    { id: "jar-sha256", status: "passed", expected: "jar", observed: "jar", reason: "" },
    { id: "network-deny", status: "passed", expected: "none", observed: "none", reason: "" },
    { id: "jdk-snapshot", status: "not-applicable", expected: null, observed: null, reason: "container JDK" },
    { id: "sandbox-profile", status: "not-applicable", expected: null, observed: null, reason: "container isolation" },
  ],
};

describe("run-model-check artifact publisher", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  test("publishes a digest-verifiable terminal manifest last", () => {
    const root = mkdtempSync(join(tmpdir(), "model-check-artifacts-"));
    roots.push(root);
    const out = join(root, "run");
    const workspace = beginModelCheckArtifacts(out, RUN_ID);
    if (!workspace.ok) throw new Error(workspace.error.detail);
    writeFileSync(join(workspace.value.scratchRoot, "transient"), "scratch");

    const published = publishModelCheckArtifacts({
      workspace: workspace.value,
      outcome: { kind: "NOT_DETECTED" },
      exitCode: 0,
      environmentReceipt: receipt,
      stdout: new TextEncoder().encode("complete"),
      stderr: new Uint8Array(),
      startedAt: "2026-07-24T00:00:00.000Z",
      finishedAt: "2026-07-24T00:00:01.000Z",
    });
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(existsSync(join(out, ".scratch"))).toBe(false);
    const manifest = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")) as ModelCheckManifest;
    expect(manifest.expectedArtifacts).toContain("completion-marker.json");
    for (const artifact of manifest.artifacts) {
      const bytes = readFileSync(join(out, artifact.path));
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(artifact.sha256);
    }
    expect(manifest.artifacts.map(({ path }) => path)).not.toContain("manifest.json");
  });

  test("isolates harness failures and rejects an existing output", () => {
    const root = mkdtempSync(join(tmpdir(), "model-check-artifacts-"));
    roots.push(root);
    const out = join(root, "run");
    const workspace = beginModelCheckArtifacts(out, RUN_ID);
    if (!workspace.ok) throw new Error(workspace.error.detail);
    const published = publishModelCheckArtifacts({
      workspace: workspace.value,
      outcome: { kind: "HARNESS_ERROR", code: "TIMEOUT", detail: "late" },
      exitCode: 2,
      environmentReceipt: receipt,
      stdout: new Uint8Array(),
      stderr: new TextEncoder().encode("late"),
      startedAt: "2026-07-24T00:00:00.000Z",
      finishedAt: "2026-07-24T00:00:01.000Z",
    });
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(published.value.directory).toBe(
      `${workspace.value.requestedOutDir}.failure-${RUN_ID}`,
    );
    expect(published.value.manifest).toMatchObject({
      outcome: "HARNESS_ERROR",
      exitCode: 2,
      partial: true,
      errorCode: "TIMEOUT",
    });

    writeFileSync(out, "occupied");
    expect(beginModelCheckArtifacts(out, RUN_ID)).toMatchObject({
      ok: false,
      error: { code: "OUT_CONFLICT" },
    });
  });

  test("rejects invalid reservations and workspace drift", () => {
    const root = mkdtempSync(join(tmpdir(), "model-check-artifacts-"));
    roots.push(root);
    expect(beginModelCheckArtifacts(join(root, "bad"), "not-a-run-id")).toMatchObject({
      ok: false,
      error: { code: "OUT_PATH" },
    });
    expect(beginModelCheckArtifacts(join(root, "missing", "out"), RUN_ID)).toMatchObject({
      ok: false,
      error: { code: "OUT_PATH" },
    });
    const blocked = join(root, "blocked");
    mkdirSync(blocked);
    chmodSync(blocked, 0o000);
    try {
      expect(beginModelCheckArtifacts(join(blocked, "out"), RUN_ID)).toMatchObject({
        ok: false,
        error: { code: "OUT_PATH" },
      });
    } finally {
      chmodSync(blocked, 0o700);
    }
    const out = join(root, "run");
    mkdirSync(`${out}.tmp-${RUN_ID}`);
    expect(beginModelCheckArtifacts(out, RUN_ID)).toMatchObject({
      ok: false,
      error: { code: "OUT_CONFLICT" },
    });
    rmSync(`${out}.tmp-${RUN_ID}`, { recursive: true });
    const workspace = beginModelCheckArtifacts(out, RUN_ID);
    if (!workspace.ok) throw new Error(workspace.error.detail);
    rmSync(workspace.value.scratchRoot, { recursive: true });
    expect(publishModelCheckArtifacts({
      workspace: workspace.value,
      outcome: { kind: "NOT_DETECTED" },
      exitCode: 0,
      environmentReceipt: receipt,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
      startedAt: "2026-07-24T00:00:00.000Z",
      finishedAt: "2026-07-24T00:00:01.000Z",
    })).toMatchObject({ ok: false, error: { code: "WRITE" } });

    const linkedOut = join(root, "linked");
    const linkedWorkspace = beginModelCheckArtifacts(linkedOut, RUN_ID);
    if (!linkedWorkspace.ok) throw new Error(linkedWorkspace.error.detail);
    rmSync(linkedWorkspace.value.scratchRoot, { recursive: true });
    symlinkSync(root, linkedWorkspace.value.scratchRoot);
    expect(publishModelCheckArtifacts({
      workspace: linkedWorkspace.value,
      outcome: { kind: "NOT_DETECTED" },
      exitCode: 0,
      environmentReceipt: receipt,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
      startedAt: "2026-07-24T00:00:00.000Z",
      finishedAt: "2026-07-24T00:00:01.000Z",
    })).toMatchObject({ ok: false, error: { code: "OUT_PATH" } });

    const renameOut = join(root, "rename");
    const renameWorkspace = beginModelCheckArtifacts(renameOut, RUN_ID);
    if (!renameWorkspace.ok) throw new Error(renameWorkspace.error.detail);
    mkdirSync(renameWorkspace.value.requestedOutDir);
    writeFileSync(join(renameWorkspace.value.requestedOutDir, "occupied"), "occupied");
    expect(publishModelCheckArtifacts({
      workspace: renameWorkspace.value,
      outcome: { kind: "NOT_DETECTED" },
      exitCode: 0,
      environmentReceipt: receipt,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
      startedAt: "2026-07-24T00:00:00.000Z",
      finishedAt: "2026-07-24T00:00:01.000Z",
    })).toMatchObject({ ok: false, error: { code: "RENAME" } });
  });
});
