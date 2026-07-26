// t289 — generated payload parity across dist/self-install.
// covers: scripts/mirror-distribution-check.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkMirrorDistribution } from "../../scripts/mirror-distribution-check.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("t289 projection parity", () => {
  test("verifies every registered source, dist, and self payload digest", () => {
    const result = checkMirrorDistribution(process.cwd());
    expect(result.findings).toEqual([]);
    expect(Object.keys(result.digests)).toHaveLength(230);
    expect(result.registryDigest).toHaveLength(64);
  });

  test("reports one-byte drift without mutating the projection", () => {
    const root = mkdtempSync(join(tmpdir(), "mirror-distribution-"));
    roots.push(root);
    for (const dir of ["packages", "dist", ".claude", ".codex", ".agents", ".cursor", ".opencode"])
      cpSync(join(process.cwd(), dir), join(root, dir), { recursive: true });
    const path = join(root, ".claude/tools/amadeus-mirror.ts");
    writeFileSync(path, "drift");
    const result = checkMirrorDistribution(root);
    expect(result.findings).toContainEqual({
      surface: "claude",
      path: ".claude/tools/amadeus-mirror.ts",
      kind: "content-mismatch",
    });
  });

  test("reports an unregistered Mirror wrapper under a managed public root", () => {
    const root = mkdtempSync(join(tmpdir(), "mirror-distribution-extra-"));
    roots.push(root);
    for (const dir of [
      "packages",
      "dist",
      ".claude",
      ".codex",
      ".agents",
      ".cursor",
      ".opencode",
    ]) cpSync(join(process.cwd(), dir), join(root, dir), { recursive: true });
    const relativePath = ".claude/tools/amadeus-mirror-rogue.ts";
    mkdirSync(join(root, ".claude/tools"), { recursive: true });
    writeFileSync(join(root, relativePath), "unregistered");
    expect(checkMirrorDistribution(root).findings).toContainEqual({
      surface: "claude",
      path: relativePath,
      kind: "unexpected",
    });
  });
});
