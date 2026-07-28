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
import { dirname, join } from "node:path";
import { MIRROR_PROJECTIONS } from "../../packages/framework/harness/projections.ts";
import { checkMirrorDistribution } from "../../scripts/mirror-distribution-check.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function registeredPayloadPaths(): string[] {
  return [
    ...new Set(
      MIRROR_PROJECTIONS.flatMap((projection) =>
        projection.artifacts.flatMap((artifact) => [
          artifact.source,
          ...(artifact.distPath ? [artifact.distPath] : []),
          ...(artifact.selfPath ? [artifact.selfPath] : []),
        ]),
      ),
    ),
  ].sort();
}

function projectionFixture(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  for (const path of registeredPayloadPaths()) {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    cpSync(join(process.cwd(), path), join(root, path));
  }
  return root;
}

describe("t289 projection parity", () => {
  test("verifies every registered source, dist, and self payload digest", () => {
    const result = checkMirrorDistribution(process.cwd());
    expect(result.findings).toEqual([]);
    expect(Object.keys(result.digests).sort()).toEqual(
      registeredPayloadPaths(),
    );
    expect(result.registryDigest).toHaveLength(64);
  });

  test("reports one-byte drift without mutating the projection", () => {
    const root = projectionFixture("mirror-distribution-");
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
    const root = projectionFixture("mirror-distribution-extra-");
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
