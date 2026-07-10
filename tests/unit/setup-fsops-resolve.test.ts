// covers: modules:setup-fsops-resolve
// size: small
//
// resolveUnderRootPath — SEC-F03 containment guard (#773). The guard resolves a
// caller-supplied relPath under the TmpWrite root and rejects anything that
// escapes it. The bug: the boundary test hardcoded "/" as the separator, so on
// Windows (where path.resolve returns "\" separators) every legitimate write
// was rejected as "path escapes temp root". These cases parameterize the pure
// seam with path.win32 and path.posix so both platform semantics are exercised
// on any host; the win32 accept cases fail against the pre-fix "/" boundary.

import { describe, expect, test } from "bun:test";
import { posix, win32 } from "node:path";
import { resolveUnderRootPath } from "../../packages/setup/src/ports/fsops.ts";

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
