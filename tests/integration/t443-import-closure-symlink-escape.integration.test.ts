// covers: file:scripts/plugin-projection.ts, file:scripts/import-closure-guard.ts
// size: medium
//
// U6 import-closure-guard (C8) — the filesystem half of the responsibility
// split. String normalization alone cannot see a symlink escape: the path
// `plugins/<name>/tools/dep.ts` is repo-relative and passes the pure boundary
// parse even when its real target lives outside the repo. repoFileReader owns
// realpath resolution and returns null for such a reference, so the escape lands
// in the guard's `unreadable` enumeration instead of pulling a foreign file into
// the closure. These cases need real symlinks, so they are integration.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assertPluginImportClosure,
  PluginValidationError,
  repoFileReader,
} from "../../scripts/plugin-projection.ts";

const workspaces: string[] = [];

function workspace(): string {
  const ws = mkdtempSync(join(tmpdir(), "amadeus-t443-"));
  workspaces.push(ws);
  return ws;
}

afterAll(() => {
  for (const ws of workspaces) rmSync(ws, { recursive: true, force: true });
});

describe("t443 repoFileReader (realpath boundary)", () => {
  test("reads a plain file inside the repo root", () => {
    const repoRoot = workspace();
    writeFileSync(join(repoRoot, "a.ts"), "export const a = 1;\n");
    expect(repoFileReader(repoRoot)("a.ts")).toBe("export const a = 1;\n");
  });

  test("returns null for an absent file", () => {
    expect(repoFileReader(workspace())("nope.ts")).toBeNull();
  });

  test("returns null for a symlink whose real target is outside the repo root", () => {
    const outside = workspace();
    const repoRoot = workspace();
    const secret = join(outside, "secret.ts");
    writeFileSync(secret, "export const secret = 1;\n");
    symlinkSync(secret, join(repoRoot, "escape.ts"));
    expect(repoFileReader(repoRoot)("escape.ts")).toBeNull();
  });

  test("returns null for a dangling symlink", () => {
    const repoRoot = workspace();
    symlinkSync(join(repoRoot, "absent-target.ts"), join(repoRoot, "dangling.ts"));
    expect(repoFileReader(repoRoot)("dangling.ts")).toBeNull();
  });

  test("reads a symlink whose real target stays inside the repo root", () => {
    const repoRoot = workspace();
    writeFileSync(join(repoRoot, "real.ts"), "export const real = 1;\n");
    symlinkSync(join(repoRoot, "real.ts"), join(repoRoot, "alias.ts"));
    expect(repoFileReader(repoRoot)("alias.ts")).toBe("export const real = 1;\n");
  });

  test("returns null for a directory (not a readable module)", () => {
    const repoRoot = workspace();
    mkdirSync(join(repoRoot, "adir"));
    expect(repoFileReader(repoRoot)("adir")).toBeNull();
  });
});

describe("t443 assertPluginImportClosure (symlink escape fails the build)", () => {
  test("enumerates an escaping symlink as an unreadable import", () => {
    const outside = workspace();
    writeFileSync(join(outside, "foreign.ts"), "export const foreign = 1;\n");

    const repoRoot = workspace();
    const name = "zz-t443-escape";
    const pluginRoot = join(repoRoot, "plugins", name);
    mkdirSync(join(pluginRoot, "tools"), { recursive: true });
    mkdirSync(join(pluginRoot, "stages"), { recursive: true });
    writeFileSync(join(pluginRoot, "stages", "s.md"), "# stage\n\n## a\n\n## b\n");
    writeFileSync(
      join(pluginRoot, "plugin.json"),
      `${JSON.stringify(
        {
          name,
          stages: [{ slug: name, path: "stages/s.md" }],
          seams: [],
          fragments: [],
          tools: ["tools/entry.ts", "tools/dep.ts"],
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(join(pluginRoot, "tools", "entry.ts"), 'import "./dep.ts";\n');
    // Declared, owned, and repo-relative — yet its bytes live outside the repo.
    symlinkSync(join(outside, "foreign.ts"), join(pluginRoot, "tools", "dep.ts"));

    let problems: readonly string[] = [];
    try {
      assertPluginImportClosure(join(repoRoot, "plugins"));
    } catch (err) {
      problems = (err as PluginValidationError).problems;
    }
    expect(problems).toEqual([
      `UNREADABLE import in ${name}: plugins/${name}/tools/dep.ts`,
    ]);
  });
});
