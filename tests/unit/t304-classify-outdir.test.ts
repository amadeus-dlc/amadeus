// covers: file:scripts/plugin-projection.ts
// size: small
//
// U3 host-projection-all — classifyOutDir is the pure plan-stage safety decision
// (SEC-U3-1 layer 1): a function of an injected OutDirProbe, touching no fs. This
// unit drives every branch of the ADR-5 refusal set (upstream t188 #27-32) and
// the three accepting cases (missing / empty dir / prior projection). fs-free, so
// it belongs in the unit tier as a small test.

import { describe, expect, test } from "bun:test";

import { classifyOutDir, type OutDirProbe } from "../../scripts/plugin-projection.ts";

const probe = (over: Partial<OutDirProbe>): OutDirProbe => ({
  lstatKind: "missing",
  isPriorProjection: false,
  isForeign: false,
  dirNonEmpty: false,
  ...over,
});

describe("t304 classifyOutDir (pure OutDirRefusal decision)", () => {
  test("missing outDir is ok", () => {
    expect(classifyOutDir(probe({ lstatKind: "missing" }))).toEqual({ kind: "ok" });
  });

  test("empty directory is ok", () => {
    expect(classifyOutDir(probe({ lstatKind: "dir", dirNonEmpty: false }))).toEqual({ kind: "ok" });
  });

  test("our own prior projection is ok (#32 re-project)", () => {
    // A prior projection is a non-empty dir, but the marker match accepts it.
    expect(classifyOutDir(probe({ lstatKind: "dir", isPriorProjection: true, dirNonEmpty: true }))).toEqual({
      kind: "ok",
    });
  });

  test("non-empty non-projection directory is refused (#27)", () => {
    expect(classifyOutDir(probe({ lstatKind: "dir", dirNonEmpty: true }))).toEqual({
      kind: "refused",
      reason: "non-projection-nonempty-dir",
    });
  });

  test("foreign projection is refused before the non-empty check (#28)", () => {
    // isForeign wins even when a prior-projection flag is somehow also set.
    expect(classifyOutDir(probe({ lstatKind: "dir", isForeign: true, isPriorProjection: true, dirNonEmpty: true }))).toEqual({
      kind: "refused",
      reason: "foreign-projection",
    });
  });

  test("a regular file is refused (#29, no raw ENOTDIR)", () => {
    expect(classifyOutDir(probe({ lstatKind: "file" }))).toEqual({ kind: "refused", reason: "file-outdir" });
  });

  test("a symlink is refused (#30)", () => {
    expect(classifyOutDir(probe({ lstatKind: "symlink" }))).toEqual({ kind: "refused", reason: "symlink-outdir" });
  });

  test("a broken symlink is refused (#31, no raw EEXIST)", () => {
    expect(classifyOutDir(probe({ lstatKind: "broken-symlink" }))).toEqual({
      kind: "refused",
      reason: "broken-symlink-outdir",
    });
  });
});
