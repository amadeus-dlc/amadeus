// covers: function:readContainedFile
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readContainedFile } from "../../packages/framework/core/tools/amadeus-contained-file.ts";

const roots: string[] = [];

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("readContainedFile", () => {
  test("rejects an unreadable root without resolving the candidate", () => {
    const root = temporaryRoot("amadeus-contained-file-");

    expect(
      readContainedFile({
        rootDir: join(root, "missing"),
        path: "finding.md",
        maxBytes: 64 * 1024,
      }),
    ).toEqual({ kind: "failure", reason: "not-readable" });
  });

  test("reads one stable regular file inside the root", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const path = join(root, "finding.md");
    writeFileSync(path, "Evidence", "utf-8");

    expect(
      readContainedFile({
        rootDir: root,
        path,
        maxBytes: 64 * 1024,
        allowEmpty: false,
      }),
    ).toEqual({ kind: "text", text: "Evidence" });
  });

  test("rejects a final-component symlink even when its target is contained", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const target = join(root, "target.md");
    const path = join(root, "finding.md");
    writeFileSync(target, "Evidence", "utf-8");
    symlinkSync(target, path);

    expect(
      readContainedFile({ rootDir: root, path, maxBytes: 64 * 1024 }),
    ).toEqual({ kind: "failure", reason: "symlink" });
  });

  test("rejects a candidate removed between inspection and canonicalization", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const path = join(root, "finding.md");
    writeFileSync(path, "Evidence", "utf-8");

    expect(
      readContainedFile({
        rootDir: root,
        path,
        maxBytes: 64 * 1024,
        hooks: {
          beforeCanonicalize() {
            unlinkSync(path);
          },
        },
      }),
    ).toEqual({ kind: "failure", reason: "not-readable" });
  });

  test("rejects a path swapped to an outside symlink before open", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const outside = temporaryRoot("amadeus-contained-file-outside-");
    const path = join(root, "finding.md");
    const secret = join(outside, "secret.md");
    writeFileSync(path, "Evidence", "utf-8");
    writeFileSync(secret, "Secret", "utf-8");

    const outcome = readContainedFile({
      rootDir: root,
      path,
      maxBytes: 64 * 1024,
      hooks: {
        beforeOpen() {
          renameSync(path, `${path}.original`);
          symlinkSync(secret, path);
        },
      },
    });

    expect(outcome.kind).toBe("failure");
  });

  test("rejects growth beyond the byte limit after the first descriptor stat", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const path = join(root, "finding.md");
    writeFileSync(path, "Evidence", "utf-8");

    const outcome = readContainedFile({
      rootDir: root,
      path,
      maxBytes: 64 * 1024,
      hooks: {
        beforeRead() {
          writeFileSync(path, "X".repeat(64 * 1024 + 1), "utf-8");
        },
      },
    });

    expect(outcome).toEqual({ kind: "failure", reason: "too-large" });
  });

  test("rejects a same-size file changed while its descriptor is being read", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const path = join(root, "finding.md");
    writeFileSync(path, "Evidence", "utf-8");

    const outcome = readContainedFile({
      rootDir: root,
      path,
      maxBytes: 64 * 1024,
      hooks: {
        beforeRead() {
          writeFileSync(path, "Changed!", "utf-8");
          const future = new Date(Date.now() + 10_000);
          utimesSync(path, future, future);
        },
      },
    });

    expect(outcome).toEqual({
      kind: "failure",
      reason: "changed-during-read",
    });
  });

  test("maps an unexpected descriptor read failure to not-readable", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const path = join(root, "finding.md");
    writeFileSync(path, "Evidence", "utf-8");

    expect(
      readContainedFile({
        rootDir: root,
        path,
        maxBytes: 64 * 1024,
        hooks: {
          beforeRead() {
            throw new Error("injected read failure");
          },
        },
      }),
    ).toEqual({ kind: "failure", reason: "not-readable" });
  });

  test("rejects an empty file when the caller requires content", () => {
    const root = temporaryRoot("amadeus-contained-file-");
    const path = join(root, "finding.md");
    writeFileSync(path, "", "utf-8");

    expect(
      readContainedFile({
        rootDir: root,
        path,
        maxBytes: 64 * 1024,
        allowEmpty: false,
      }),
    ).toEqual({ kind: "failure", reason: "empty" });
  });
});
