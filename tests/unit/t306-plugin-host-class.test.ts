// covers: file:scripts/plugin-projection.ts
// size: small
//
// U3 host-projection-all — PLUGIN_HOST_CLASS is transcribed (not inferred) from
// the U1 capability matrix's machine-readable class_assignment (BR-U1-7). This
// small unit pins that transcription: every packaged face maps to its matrix
// class, so a later matrix change that isn't mirrored here fails loudly. fs-free.

import { describe, expect, test } from "bun:test";

import { PACKAGE_HARNESSES, PLUGIN_HOST_CLASS } from "../../scripts/plugin-projection.ts";

// Verbatim from harness-capability-matrix.md (e) class_assignment:
//   native-manifest: [claude]
//   folder-drop-auto: [codex, cursor, kimi, kiro, kiro-ide]
//   manual-only: [opencode]
const MATRIX_CLASS = {
  claude: "native-manifest",
  codex: "folder-drop-auto",
  cursor: "folder-drop-auto",
  kimi: "folder-drop-auto",
  kiro: "folder-drop-auto",
  "kiro-ide": "folder-drop-auto",
  opencode: "manual-only",
} as const;

describe("t306 PLUGIN_HOST_CLASS (U1 matrix transcription)", () => {
  test("every packaged harness has a class entry", () => {
    for (const h of PACKAGE_HARNESSES) expect(PLUGIN_HOST_CLASS[h]).toBeDefined();
    expect(Object.keys(PLUGIN_HOST_CLASS).sort()).toEqual([...PACKAGE_HARNESSES].sort());
  });

  test("each face maps to its matrix class (BR-U1-7)", () => {
    for (const h of PACKAGE_HARNESSES) expect(PLUGIN_HOST_CLASS[h]).toBe(MATRIX_CLASS[h]);
  });

  test("exactly one native-manifest face (claude)", () => {
    const native = PACKAGE_HARNESSES.filter((h) => PLUGIN_HOST_CLASS[h] === "native-manifest");
    expect(native).toEqual(["claude"]);
  });
});
