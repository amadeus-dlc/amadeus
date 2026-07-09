// t202 — regression guard for issue #657: amadeus-sensor-type-check.ts's
// startup probe and real tsc run must resolve the SAME launcher, preferring
// the project's own node_modules/.bin/tsc over a bunx-resolved tsc.
//
// THE BUG (#657): the probe (`spawnSync("bunx", ["tsc", "--version"])`) and
// the real run (`bunx tsc --project ...`) both hardcoded bunx. When bunx
// resolves a DIFFERENT TypeScript than the repo's pinned dependency (e.g. a
// stale/newer cached version), the TS18003 + --incremental exit code drifts
// (2 -> 1 observed), flaking tests/integration/t92.test.ts Group N test 44.
//
// THE FIX: centralize launcher resolution in `resolveTscLauncher`, which
// walks up from a start directory looking for node_modules/.bin/tsc (plus
// Windows tsc.cmd/tsc.exe variants) and only falls back to `bunx tsc` when no
// local install is found. Both the probe and the real run consume the SAME
// resolved launcher — no split.
//
// Mechanism: none (pure function, in-process). resolveTscLauncher takes a
// start directory and does its own node_modules/.bin/tsc existence probing;
// this test builds real temp directory trees (no fixture files) with/without
// a node_modules/.bin/tsc entry and asserts the returned launcher shape.
//
// RED-FIRST: at the time this test was written, amadeus-sensor-type-check.ts
// exported no `resolveTscLauncher` function — this test fails to even import
// until the function is added.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveTscLauncher } from "../../packages/framework/core/tools/amadeus-sensor-type-check.ts";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "amadeus-t202-"));
}

describe("t202 resolveTscLauncher (issue #657)", () => {
  test("returns the local node_modules/.bin/tsc path when it exists", () => {
    const root = makeTempDir();
    try {
      const binDir = join(root, "node_modules", ".bin");
      mkdirSync(binDir, { recursive: true });
      const localTsc = join(binDir, "tsc");
      writeFileSync(localTsc, "#!/bin/sh\necho local-tsc\n", { mode: 0o755 });

      const launcher = resolveTscLauncher(root);

      expect(launcher.command).toBe(localTsc);
      expect(existsSync(launcher.command)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("falls back to bunx tsc when no local install exists anywhere up the tree", () => {
    const root = makeTempDir();
    try {
      // A nested dir with NO node_modules anywhere between it and root.
      const nested = join(root, "a", "b", "c");
      mkdirSync(nested, { recursive: true });

      const launcher = resolveTscLauncher(nested);

      expect(launcher.command).toBe("bunx");
      expect(launcher.args).toEqual(["tsc"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("finds a local tsc in an ANCESTOR directory's node_modules/.bin, not just cwd", () => {
    const root = makeTempDir();
    try {
      const binDir = join(root, "node_modules", ".bin");
      mkdirSync(binDir, { recursive: true });
      const localTsc = join(binDir, "tsc");
      writeFileSync(localTsc, "#!/bin/sh\necho local-tsc\n", { mode: 0o755 });

      const nested = join(root, "sub", "dir");
      mkdirSync(nested, { recursive: true });

      const launcher = resolveTscLauncher(nested);

      expect(launcher.command).toBe(localTsc);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the bunx fallback launcher never requires a shell", () => {
    const root = makeTempDir();
    try {
      const nested = join(root, "x");
      mkdirSync(nested, { recursive: true });

      const launcher = resolveTscLauncher(nested);

      expect(launcher.shell).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
