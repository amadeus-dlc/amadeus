import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPayloadManifest, scanFixturePayload, scanFixturePayloadForTesting, verifyDataSafetyReceipt, type FixtureScannerPort } from "../../scripts/formal-verif/fixture-scan.ts";
import * as publicApi from "../../scripts/formal-verif/index.ts";

const sha = (bytes: string) => createHash("sha256").update(bytes).digest("hex");

describe("formal verification sealed payload scan", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  const workspace = () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-scan-"));
    roots.push(root);
    mkdirSync(join(root, "payload"));
    writeFileSync(join(root, "payload", "data.json"), "safe");
    const manifest = createPayloadManifest([{ logicalPath: "payload/data.json", contentHash: sha("safe"), byteLength: 4 }]);
    if (!manifest.ok) throw new Error("setup");
    return { root, manifest: manifest.value };
  };
  const cleanScanner = (override: Partial<{ secretCount: number; personalDataCount: number; externalStoreRefCount: number; scannerVersion: string; ruleSetIdentity: string; entryIdentity: string; matchContent: string }> = {}): FixtureScannerPort => ({
    scannerVersion: "scanner-1",
    ruleSetIdentity: "a".repeat(64),
    scan: async (request) => {
      for await (const chunk of request.chunks) void chunk;
      return { scannerVersion: "scanner-1", ruleSetIdentity: "a".repeat(64), entryIdentity: request.entry.entryIdentity, secretCount: 0, personalDataCount: 0, externalStoreRefCount: 0, ...override };
    },
  });

  test("mints a zero-finding receipt from the complete manifest stream", async () => {
    const { root, manifest } = workspace();
    const result = await scanFixturePayload(root, manifest, cleanScanner(), "2026-07-20T00:00:00Z");
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.receiptIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(result)).not.toContain(root);
    if (!result.ok) throw new Error("setup");
    expect(verifyDataSafetyReceipt(manifest, result.value).ok).toBe(true);
    expect(verifyDataSafetyReceipt(manifest, { ...result.value }).ok).toBe(false);
  });

  test("streams every payload byte once through bounded scanner chunks", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-stream-")); roots.push(root);
    const content = new Uint8Array(64 * 1024 + 17).fill(7);
    writeFileSync(join(root, "payload.bin"), content);
    const manifest = createPayloadManifest([{ logicalPath: "payload.bin", contentHash: createHash("sha256").update(content).digest("hex"), byteLength: content.byteLength }]);
    if (!manifest.ok) throw new Error("setup");
    const chunkLengths: number[] = [];
    const scanner: FixtureScannerPort = {
      scannerVersion: "scanner-1",
      ruleSetIdentity: "a".repeat(64),
      scan: async (request) => {
        for await (const chunk of request.chunks) chunkLengths.push(chunk.byteLength);
        return { scannerVersion: "scanner-1", ruleSetIdentity: "a".repeat(64), entryIdentity: request.entry.entryIdentity, secretCount: 0, personalDataCount: 0, externalStoreRefCount: 0 };
      },
    };
    const result = await scanFixturePayload(root, manifest.value, scanner, "2026-07-20T00:00:00Z");
    expect(result.ok).toBe(true);
    expect(Math.max(...chunkLengths)).toBeLessThanOrEqual(64 * 1024);
    expect(chunkLengths.reduce((sum, length) => sum + length, 0)).toBe(content.byteLength);
    expect(result.ok && result.value.readBytes).toBe(content.byteLength);
    expect(result.ok && result.value.scannedBytes).toBe(content.byteLength);
  });

  test("rejects an incomplete stream drain and the exact absolute deadline", async () => {
    const { root, manifest } = workspace();
    const resultFor = (entryIdentity: string) => ({ scannerVersion: "scanner-1", ruleSetIdentity: "a".repeat(64), entryIdentity, secretCount: 0, personalDataCount: 0, externalStoreRefCount: 0 });
    const incomplete: FixtureScannerPort = { scannerVersion: "scanner-1", ruleSetIdentity: "a".repeat(64), scan: async (request) => { for await (const chunk of request.chunks) { void chunk; break; } return resultFor(request.entry.entryIdentity); } };
    expect((await scanFixturePayload(root, manifest, incomplete, "2026-07-20T00:00:00Z")).ok).toBe(false);
    let now = 0;
    const expired: FixtureScannerPort = { scannerVersion: "scanner-1", ruleSetIdentity: "a".repeat(64), scan: async (request) => { for await (const chunk of request.chunks) { void chunk; now = 30_000; } return resultFor(request.entry.entryIdentity); } };
    expect((await scanFixturePayloadForTesting(root, manifest, expired, "2026-07-20T00:00:00Z", () => now)).ok).toBe(false);
    expect("scanFixturePayloadForTesting" in publicApi).toBe(false);
  });

  test("rejects missing, duplicate, and extra manifest entries", async () => {
    const { root, manifest } = workspace();
    writeFileSync(join(root, "payload", "extra.json"), "extra");
    expect((await scanFixturePayload(root, manifest, cleanScanner(), "2026-07-20T00:00:00Z")).ok).toBe(false);
    expect(createPayloadManifest([{ logicalPath: "x", contentHash: sha("x"), byteLength: 1 }, { logicalPath: "x", contentHash: sha("x"), byteLength: 1 }]).ok).toBe(false);
    const missing = createPayloadManifest([...manifest.entries.map(({ logicalPath, contentHash, byteLength }) => ({ logicalPath, contentHash, byteLength })), { logicalPath: "payload/missing", contentHash: sha("none"), byteLength: 4 }]);
    expect(missing.ok && (await scanFixturePayload(root, missing.value, cleanScanner(), "2026-07-20T00:00:00Z")).ok).toBe(false);
  });

  test("rejects content hash or length drift", async () => {
    const { root, manifest } = workspace();
    writeFileSync(join(root, "payload", "data.json"), "drift");
    expect((await scanFixturePayload(root, manifest, cleanScanner(), "2026-07-20T00:00:00Z")).ok).toBe(false);
  });

  test.each(["/absolute", "../traversal", "C:\\absolute"])("rejects unsafe logical path %s", (logicalPath) => {
    expect(createPayloadManifest([{ logicalPath, contentHash: sha("safe"), byteLength: 4 }]).ok).toBe(false);
  });

  test("rejects symlink payload entries", async () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-symlink-"));
    roots.push(root);
    writeFileSync(join(root, "target"), "safe");
    symlinkSync(join(root, "target"), join(root, "link"));
    const manifest = createPayloadManifest([{ logicalPath: "link", contentHash: sha("safe"), byteLength: 4 }, { logicalPath: "target", contentHash: sha("safe"), byteLength: 4 }]);
    if (!manifest.ok) throw new Error("setup");
    expect((await scanFixturePayload(root, manifest.value, cleanScanner(), "2026-07-20T00:00:00Z")).ok).toBe(false);
  });

  test.each([
    ["secret", { secretCount: 1 }],
    ["personal data", { personalDataCount: 1 }],
    ["external store reference", { externalStoreRefCount: 1 }],
  ])("rejects a %s match", async (_name, override) => {
    const { root, manifest } = workspace();
    expect((await scanFixturePayload(root, manifest, cleanScanner(override), "2026-07-20T00:00:00Z")).ok).toBe(false);
  });

  test("rejects scanner, rule, entry, and result-schema drift", async () => {
    const { root, manifest } = workspace();
    expect((await scanFixturePayload(root, manifest, cleanScanner({ scannerVersion: "drift" }), "2026-07-20T00:00:00Z")).ok).toBe(false);
    expect((await scanFixturePayload(root, manifest, cleanScanner({ ruleSetIdentity: "b".repeat(64) }), "2026-07-20T00:00:00Z")).ok).toBe(false);
    expect((await scanFixturePayload(root, manifest, cleanScanner({ entryIdentity: "c".repeat(64) }), "2026-07-20T00:00:00Z")).ok).toBe(false);
    expect((await scanFixturePayload(root, manifest, cleanScanner({ matchContent: "do-not-copy" }), "2026-07-20T00:00:00Z")).ok).toBe(false);
    const failing: FixtureScannerPort = { ...cleanScanner(), scan: async () => { throw new Error("tool failed"); } };
    expect((await scanFixturePayload(root, manifest, failing, "2026-07-20T00:00:00Z")).ok).toBe(false);
  });
});
