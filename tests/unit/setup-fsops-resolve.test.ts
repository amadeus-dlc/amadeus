// covers: modules:setup-fsops-resolve
// size: medium
//
// resolveUnderRootPath — SEC-F03 containment guard (#773). The guard resolves a
// caller-supplied relPath under the TmpWrite root and rejects anything that
// escapes it. The bug: the boundary test hardcoded "/" as the separator, so on
// Windows (where path.resolve returns "\" separators) every legitimate write
// was rejected as "path escapes temp root". These cases parameterize the pure
// seam with path.win32 and path.posix so both platform semantics are exercised
// on any host; the win32 accept cases fail against the pre-fix "/" boundary.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { posix, join, win32 } from "node:path";
import { createFsWrite, resolveUnderRootPath } from "../../packages/setup/src/ports/fsops.ts";

describe("resolveUnderRootPath — win32 semantics", () => {
  const root = "C:\\Users\\dev\\AppData\\Local\\Temp\\amadeus-setup-abc";
  const sem = { resolve: win32.resolve, sep: win32.sep };

  test("accepts a top-level file (fetcher's archive.tar.gz)", () => {
    expect(resolveUnderRootPath(root, "archive.tar.gz", sem)).toBe(`${root}\\archive.tar.gz`);
  });

  test("accepts a nested extracted path", () => {
    expect(resolveUnderRootPath(root, "extracted\\dist\\README.md", sem)).toBe(`${root}\\extracted\\dist\\README.md`);
  });

  test("rejects backslash traversal", () => {
    expect(() => resolveUnderRootPath(root, "..\\evil", sem)).toThrow("path escapes temp root");
  });

  test("rejects an absolute drive path", () => {
    expect(() => resolveUnderRootPath(root, "D:\\evil", sem)).toThrow("path escapes temp root");
  });
});

describe("resolveUnderRootPath — posix semantics (non-regression)", () => {
  const root = "/tmp/amadeus-setup-abc";
  const sem = { resolve: posix.resolve, sep: posix.sep };

  test("accepts a top-level file", () => {
    expect(resolveUnderRootPath(root, "archive.tar.gz", sem)).toBe(`${root}/archive.tar.gz`);
  });

  test("accepts a nested extracted path", () => {
    expect(resolveUnderRootPath(root, "extracted/dist/README.md", sem)).toBe(`${root}/extracted/dist/README.md`);
  });

  test("rejects traversal", () => {
    expect(() => resolveUnderRootPath(root, "../evil", sem)).toThrow("path escapes temp root");
  });

  test("rejects an absolute path", () => {
    expect(() => resolveUnderRootPath(root, "/evil", sem)).toThrow("path escapes temp root");
  });
});

// REL-F02 (#743): writeText must commit atomically (temp-write + rename) so a
// crash mid-write never leaves truncated content at the target path. The
// distinguishing, deterministic property is that overwriting an existing file
// replaces it (a new inode swapped into place) rather than truncating it in
// place: the pre-fix direct writeFile truncates the existing inode to zero and
// rewrites it, so the target passes through a truncated state and its inode is
// unchanged. This case fails against that pre-fix code.
describe("createFsWrite#writeText — atomic replace (#743)", () => {
  function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
    const dir = mkdtempSync(join(tmpdir(), "amadeus-setup-fswrite-"));
    return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
  }

  test("overwriting an existing file replaces it atomically rather than truncating in place", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "amadeus-setup-manifest.json");
      writeFileSync(path, JSON.stringify({ schemaVersion: 1, old: true }));
      const inoBefore = statSync(path).ino;

      const written = await createFsWrite().writeText(path, JSON.stringify({ schemaVersion: 1, new: true }));
      expect(written.type).toBe("ok");

      const inoAfter = statSync(path).ino;
      expect(inoAfter).not.toBe(inoBefore); // atomic rename swaps a new inode into place; in-place truncate keeps the same one
      expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ schemaVersion: 1, new: true });
    });
  });

  test("leaves no temp residue in the target directory after a successful write", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "amadeus-setup-manifest.json");
      const written = await createFsWrite().writeText(path, "{}\n");
      expect(written.type).toBe("ok");
      expect(readdirSync(dir)).toEqual(["amadeus-setup-manifest.json"]);
    });
  });

  test("reports an IoError when the parent path cannot be created and cleans up its temp file", async () => {
    await withTempDir(async (dir) => {
      const fileInTheWay = join(dir, "occupied");
      writeFileSync(fileInTheWay, "not a directory");
      // The parent of the target is a regular file, so mkdir fails and the write
      // never reaches the target — the error is surfaced, not swallowed.
      const written = await createFsWrite().writeText(join(fileInTheWay, "child.json"), "{}\n");
      expect(written.type).toBe("err");
      if (written.type === "err") expect(written.error.type).toBe("io");
      expect(readdirSync(dir)).toEqual(["occupied"]); // no temp residue left behind
    });
  });
});
