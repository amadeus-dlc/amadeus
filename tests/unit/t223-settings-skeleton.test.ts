// covers: function:workspaceRoot
//
// t223-settings-skeleton.test.ts — pins the canonical settings skeleton (U1):
// packages/framework/core/tools/amadeus-settings.ts. Mechanism: none (pure
// in-process calls + a repo-external mkdtemp tree; zero LLM, zero spawns).
// Technique: known-answer + fault-injection (malformed roots) + a
// wrong-location negative that proves only spaces/<space>/settings.json is read.
//
// WHAT THIS PINS.
//   1. parse backfills absent interactionModes keys from DEFAULT_SETTINGS and
//      keeps explicit values; an absent interactionModes field yields all-true.
//   2. parse fails closed (no crash, non-empty errors) on broken JSON, JSONC
//      comments, an array root, and a null root.
//   3. load returns defaults + source="defaults" when the file is absent, reads
//      an on-disk file as source="file", and ignores a settings.json placed
//      anywhere other than spaces/<space>/.
//   4. defaults() equals DEFAULT_SETTINGS and reports every mode enabled.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AmadeusSettings,
  DEFAULT_SETTINGS,
  INTERACTION_MODE_KEYS,
  SETTINGS_KNOWN_KEYS,
  settingsPath,
} from "../../packages/framework/core/tools/amadeus-settings.ts";

function makeProjectDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeSettingsFile(projectDir: string, space: string, contents: string): void {
  const dir = join(projectDir, "amadeus", "spaces", space);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "settings.json"), contents, "utf-8");
}

describe("t223 settings skeleton — parse", () => {
  test("all keys specified are read verbatim", () => {
    const result = AmadeusSettings.parse(
      JSON.stringify({ interactionModes: { guideMe: false, grillMe: true, editFile: false, chat: true } }),
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual({
      guideMe: false,
      grillMe: true,
      editFile: false,
      chat: true,
    });
  });

  test("absent keys are backfilled from DEFAULT_SETTINGS", () => {
    const result = AmadeusSettings.parse(JSON.stringify({ interactionModes: { guideMe: false } }));
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual({
      guideMe: false,
      grillMe: true,
      editFile: true,
      chat: true,
    });
  });

  test("an absent interactionModes field yields all-true", () => {
    const result = AmadeusSettings.parse(JSON.stringify({}));
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.settings.interactionModes).toEqual(DEFAULT_SETTINGS);
  });

  test("broken JSON fails closed with a non-empty error", () => {
    const result = AmadeusSettings.parse("{ not json");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("invalid JSON");
  });

  test("JSONC comments are not valid JSON and fail closed", () => {
    const result = AmadeusSettings.parse('{\n  // a comment\n  "interactionModes": {}\n}');
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("an array root fails closed", () => {
    const result = AmadeusSettings.parse("[]");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toContain("settings root must be an object");
  });

  test("a null root fails closed", () => {
    const result = AmadeusSettings.parse("null");
    expect(result.valid).toBe(false);
    if (result.valid) return;
    expect(result.errors[0]).toContain("settings root must be an object");
  });
});

describe("t223 settings skeleton — load", () => {
  test("an absent file loads defaults with source=defaults", () => {
    const projectDir = makeProjectDir("settings-absent-");
    try {
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.source).toBe("defaults");
      expect(result.settings.interactionModes).toEqual(DEFAULT_SETTINGS);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("an on-disk file loads with source=file", () => {
    const projectDir = makeProjectDir("settings-file-");
    try {
      writeSettingsFile(projectDir, "default", JSON.stringify({ interactionModes: { chat: false } }));
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.source).toBe("file");
      expect(result.settings.isModeEnabled("chat")).toBe(false);
      expect(result.settings.isModeEnabled("guideMe")).toBe(true);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("a settings.json outside spaces/<space>/ is not read", () => {
    const projectDir = makeProjectDir("settings-wrongloc-");
    try {
      const decoyDir = join(projectDir, "amadeus");
      mkdirSync(decoyDir, { recursive: true });
      writeFileSync(
        join(decoyDir, "settings.json"),
        JSON.stringify({ interactionModes: { chat: false } }),
        "utf-8",
      );
      const result = AmadeusSettings.load(projectDir, "default");
      expect(result.valid).toBe(true);
      if (!result.valid) return;
      expect(result.source).toBe("defaults");
      expect(result.settings.interactionModes).toEqual(DEFAULT_SETTINGS);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test("settingsPath resolves to spaces/<space>/settings.json", () => {
    const projectDir = makeProjectDir("settings-path-");
    try {
      expect(settingsPath(projectDir, "default")).toBe(
        join(projectDir, "amadeus", "spaces", "default", "settings.json"),
      );
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});

describe("t223 settings skeleton — defaults + canonical constants", () => {
  test("defaults() equals DEFAULT_SETTINGS and enables every mode", () => {
    const settings = AmadeusSettings.defaults();
    expect(settings.interactionModes).toEqual(DEFAULT_SETTINGS);
    for (const key of INTERACTION_MODE_KEYS) {
      expect(settings.isModeEnabled(key)).toBe(true);
    }
  });

  test("canonical key lists are the documented shape", () => {
    expect(INTERACTION_MODE_KEYS).toEqual(["guideMe", "grillMe", "editFile", "chat"]);
    expect(SETTINGS_KNOWN_KEYS).toContain("interactionModes");
  });
});
