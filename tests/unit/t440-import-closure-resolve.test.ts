// covers: file:scripts/import-closure-guard.ts
// size: small
//
// U6 import-closure-guard (C8) — resolveImportClosure is the pure recursive
// walk over relative import specifiers. readFile is injected, so every branch
// (closure reached, unreadable file, unresolvable/escaping specifier, bare
// specifier skipped) is driven in-process with a fake filesystem.

import { describe, expect, test } from "bun:test";

import { normalizeRepoPath, resolveImportClosure, type RepoPath } from "../../scripts/import-closure-guard.ts";

function fakeFs(files: Record<string, string>): (p: RepoPath) => string | null {
  return (p) => (Object.hasOwn(files, p) ? files[p] : null);
}

describe("t440 normalizeRepoPath (boundary parse)", () => {
  test("normalizes . and .. segments inside the repo", () => {
    expect(normalizeRepoPath("plugins/p/tools/../tools/./a.ts")).toBe("plugins/p/tools/a.ts");
  });

  test("rejects an absolute POSIX path", () => {
    expect(normalizeRepoPath("/etc/passwd")).toBeNull();
  });

  test("rejects a Windows drive-letter path", () => {
    expect(normalizeRepoPath("C:/repo/a.ts")).toBeNull();
  });

  test("rejects a path that escapes above the repo root", () => {
    expect(normalizeRepoPath("../outside/a.ts")).toBeNull();
  });

  test("rejects the empty path", () => {
    expect(normalizeRepoPath("")).toBeNull();
  });
});

describe("t440 resolveImportClosure (recursive relative-import walk)", () => {
  test("returns the sorted transitive closure including the entrypoints", () => {
    const files = {
      "plugins/p/tools/a.ts": 'import { x } from "./b.ts";\nexport * from "./sub/c.ts";\n',
      "plugins/p/tools/b.ts": 'import type { Y } from "./sub/c.ts";\n',
      "plugins/p/tools/sub/c.ts": "export const c = 1;\n",
    };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect([...got.value]).toEqual([
      "plugins/p/tools/a.ts",
      "plugins/p/tools/b.ts",
      "plugins/p/tools/sub/c.ts",
    ]);
  });

  test("ignores bare specifiers (runtime-resolved packages are out of closure)", () => {
    const files = {
      "plugins/p/tools/a.ts": 'import { createHash } from "node:crypto";\nimport z from "zod";\n',
    };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect([...got.value]).toEqual(["plugins/p/tools/a.ts"]);
  });

  test("resolves a relative import that climbs out of the plugin subtree", () => {
    const files = {
      "plugins/p/tools/a.ts": 'import { core } from "../../../packages/core/x.ts";\n',
      "packages/core/x.ts": "export const core = 1;\n",
    };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect([...got.value]).toEqual(["packages/core/x.ts", "plugins/p/tools/a.ts"]);
  });

  test("enumerates an unreadable file (readFile returned null) as a failure", () => {
    const files = { "plugins/p/tools/a.ts": 'import "./gone.ts";\n' };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect(got.error.kind).toBe("closure-failure");
    expect([...got.error.unreadable]).toEqual(["plugins/p/tools/gone.ts"]);
  });

  test("enumerates an unreadable entrypoint", () => {
    const got = resolveImportClosure(["plugins/p/tools/absent.ts"] as RepoPath[], fakeFs({}));
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.unreadable]).toEqual(["plugins/p/tools/absent.ts"]);
  });

  test("enumerates a specifier that escapes the repo root as unreadable", () => {
    const files = { "plugins/p/tools/a.ts": 'import "../../../../etc/passwd";\n' };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.unreadable]).toEqual(["../etc/passwd"]);
  });

  test("enumerates an absolute specifier as unreadable", () => {
    const files = { "plugins/p/tools/a.ts": 'import "/etc/passwd";\n' };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.unreadable]).toEqual(["/etc/passwd"]);
  });

  test("enumerates every unreadable reference, not just the first", () => {
    const files = {
      "plugins/p/tools/a.ts": 'import "./x.ts";\nimport "./y.ts";\n',
    };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.unreadable]).toEqual(["plugins/p/tools/x.ts", "plugins/p/tools/y.ts"]);
    expect([...got.error.missingFromManifest]).toEqual([]);
    expect([...got.error.missingFromOwnedPaths]).toEqual([]);
  });

  test("terminates on an import cycle", () => {
    const files = {
      "plugins/p/tools/a.ts": 'import "./b.ts";\n',
      "plugins/p/tools/b.ts": 'import "./a.ts";\n',
    };
    const got = resolveImportClosure(["plugins/p/tools/a.ts"] as RepoPath[], fakeFs(files));
    expect(got.ok).toBe(true);
    if (!got.ok) return;
    expect([...got.value]).toEqual(["plugins/p/tools/a.ts", "plugins/p/tools/b.ts"]);
  });

  test("rejects an entrypoint that is not a repo-relative path", () => {
    const got = resolveImportClosure(["/abs/a.ts"] as RepoPath[], fakeFs({}));
    expect(got.ok).toBe(false);
    if (got.ok) return;
    expect([...got.error.unreadable]).toEqual(["/abs/a.ts"]);
  });
});
