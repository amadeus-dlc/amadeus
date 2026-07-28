// t288 — public projection scanner.
// covers: scripts/scan-public-projections.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  MIRROR_DOC_PROJECTIONS,
  MIRROR_PROJECTIONS,
} from "../../packages/framework/harness/projections.ts";
import {
  publicProjectionPaths,
  scanPublicProjections,
} from "../../scripts/scan-public-projections.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function projectionFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "public-projection-"));
  roots.push(root);
  for (const path of publicProjectionPaths()) {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    cpSync(join(process.cwd(), path), join(root, path));
  }
  return root;
}

describe("t288 public scanner", () => {
  test("enumerates every registered public payload and document", () => {
    const registeredPaths = new Set([
      ...MIRROR_PROJECTIONS.flatMap((projection) =>
        projection.artifacts.flatMap((artifact) =>
          artifact.scan
            ? [
                artifact.source,
                ...(artifact.distPath ? [artifact.distPath] : []),
                ...(artifact.selfPath ? [artifact.selfPath] : []),
              ]
            : [],
        ),
      ),
      ...MIRROR_DOC_PROJECTIONS,
    ]);
    expect(new Set(publicProjectionPaths())).toEqual(registeredPaths);
    expect(publicProjectionPaths()).toEqual([...registeredPaths].sort());
    expect(scanPublicProjections(process.cwd())).toEqual([]);
  });

  test("detects token and absolute-user-path sentinels without printing content", () => {
    const root = projectionFixture();
    const path = publicProjectionPaths()[0];
    writeFileSync(
      join(root, path),
      `${readFileSync(join(root, path), "utf-8")}\ntoken=ghp_12345678901234567890\n/Users/private/project\n`,
    );
    const findings = scanPublicProjections(root);
    expect(findings).toContainEqual({ path, kind: "secret" });
    expect(findings).toContainEqual({ path, kind: "absolute-user-path" });
    expect(JSON.stringify(findings)).not.toContain("ghp_");
  });
});
