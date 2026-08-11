// covers: file:scripts/package.ts
// size: small

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkGeneratedPluginSources,
  writeGeneratedPluginSources,
} from "../../scripts/package.ts";

describe("plugin sources are canonical in their owning plugin", () => {
  const roots: string[] = [];
  afterEach(() => {
    roots.splice(0).forEach((root) => {
      rmSync(root, { recursive: true, force: true });
    });
  });

  test("the packager has no core-to-plugin generated source pairs", () => {
    const root = mkdtempSync(join(tmpdir(), "pkg-owned-plugin-"));
    roots.push(root);
    writeGeneratedPluginSources(root);
    expect(checkGeneratedPluginSources(root)).toEqual([]);
  });
});
